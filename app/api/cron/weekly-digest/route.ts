import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail, verifyCronSecret } from "@/lib/email"
import { renderWeeklyDigest } from "@/lib/email-templates/weekly-digest"

export async function GET(request: Request) {
  // Verify cron secret in production
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://campusreach.net"

    // Get all upcoming events
    const upcomingEvents = await prisma.event.findMany({
      where: {
        startsAt: { gt: new Date() },
      },
      include: {
        organization: {
          select: { name: true },
        },
        _count: {
          select: { signups: true },
        },
      },
      orderBy: { startsAt: "asc" },
      take: 15,
    })

    if (upcomingEvents.length === 0) {
      return NextResponse.json({ message: "No upcoming events, skipping digest" })
    }

    // Get subscribers who have weekly digest enabled
    const preferences = await prisma.notificationPreference.findMany({
      where: {
        weeklyDigest: true,
        email: { not: null },
      },
    })

    if (preferences.length === 0) {
      return NextResponse.json({ message: "No subscribers for weekly digest" })
    }

    // Format events for email
    const formattedEvents = upcomingEvents.map((event) => ({
      id: event.id,
      title: event.title,
      organizationName: event.organization?.name || null,
      startsAt: event.startsAt,
      location: event.location,
      volunteersNeeded: event.volunteersNeeded,
      volunteersSignedUp: event._count.signups,
    }))

    // Get user names for personalization — check both volunteers and org members
    const userIds = preferences.map((p) => p.userId)

    const [volunteers, orgMembers] = await Promise.all([
      prisma.volunteer.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, firstName: true, name: true },
      }),
      prisma.organizationMember.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, name: true },
      }),
    ])

    const nameMap = new Map<string, string>()
    for (const v of volunteers) {
      nameMap.set(v.userId, v.firstName || v.name || "Volunteer")
    }
    for (const m of orgMembers) {
      if (!nameMap.has(m.userId)) {
        nameMap.set(m.userId, m.name || "Team Member")
      }
    }

    // Send emails
    let sentCount = 0
    let errorCount = 0

    for (const pref of preferences) {
      if (!pref.email) continue

      const recipientName = nameMap.get(pref.userId) || "Volunteer"

      try {
        const html = await renderWeeklyDigest({
          volunteerName: recipientName,
          events: formattedEvents,
          baseUrl,
        })

        const result = await sendEmail({
          to: pref.email,
          subject: `${upcomingEvents.length} upcoming volunteer opportunities`,
          html,
        })

        if (result.success) {
          await prisma.emailLog.create({
            data: {
              userId: pref.userId,
              email: pref.email,
              type: "WEEKLY_DIGEST",
            },
          })
          sentCount++
        } else {
          errorCount++
        }
      } catch (err) {
        console.error(`Failed to send digest to ${pref.email}:`, err)
        errorCount++
      }
    }

    return NextResponse.json({
      message: "Weekly digest completed",
      sent: sentCount,
      errors: errorCount,
      eventsIncluded: upcomingEvents.length,
    })
  } catch (error) {
    console.error("Weekly digest cron error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

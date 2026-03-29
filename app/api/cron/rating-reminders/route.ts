import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail, verifyCronSecret } from "@/lib/email"
import { renderRatingReminder } from "@/lib/email-templates/rating-reminder"

export async function GET(request: Request) {
  // Verify cron secret in production
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://campusreach.net"

    // Find events that ended approximately 24 hours ago (23-25 hour window)
    const now = new Date()
    const twentyThreeHoursAgo = new Date(now.getTime() - 23 * 60 * 60 * 1000)
    const twentyFiveHoursAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000)

    const recentlyEndedEvents = await prisma.event.findMany({
      where: {
        // Use endsAt if available, otherwise startsAt
        OR: [
          {
            endsAt: {
              gte: twentyFiveHoursAgo,
              lte: twentyThreeHoursAgo,
            },
          },
          {
            endsAt: null,
            startsAt: {
              gte: twentyFiveHoursAgo,
              lte: twentyThreeHoursAgo,
            },
          },
        ],
      },
      include: {
        organization: {
          select: { name: true },
        },
        signups: {
          where: { status: "CONFIRMED" },
          include: {
            volunteer: {
              select: {
                id: true,
                userId: true,
                email: true,
                firstName: true,
                name: true,
              },
            },
          },
        },
        ratings: {
          select: { volunteerId: true },
        },
      },
    })

    if (recentlyEndedEvents.length === 0) {
      return NextResponse.json({ message: "No events to send reminders for" })
    }

    // Collect all volunteer userIds from signups for batch queries
    const allVolunteerUserIds = [
      ...new Set(
        recentlyEndedEvents.flatMap((e) =>
          e.signups.map((s) => s.volunteer.userId)
        )
      ),
    ]
    const allEventIds = recentlyEndedEvents.map((e) => e.id)

    // Batch-fetch preferences and existing email logs to avoid N+1
    const [preferences, existingLogs] = await Promise.all([
      prisma.notificationPreference.findMany({
        where: { userId: { in: allVolunteerUserIds } },
      }),
      prisma.emailLog.findMany({
        where: {
          userId: { in: allVolunteerUserIds },
          type: "RATING_REMINDER",
          referenceId: { in: allEventIds },
        },
      }),
    ])

    const prefMap = new Map(preferences.map((p) => [p.userId, p]))
    // Key: "userId:eventId"
    const logSet = new Set(
      existingLogs.map((l) => `${l.userId}:${l.referenceId}`)
    )

    let sentCount = 0
    let errorCount = 0
    let skippedCount = 0

    for (const event of recentlyEndedEvents) {
      const ratedVolunteerIds = new Set(event.ratings.map((r) => r.volunteerId))

      for (const signup of event.signups) {
        const volunteer = signup.volunteer

        if (ratedVolunteerIds.has(volunteer.id)) {
          skippedCount++
          continue
        }

        if (!volunteer.email) {
          skippedCount++
          continue
        }

        if (logSet.has(`${volunteer.userId}:${event.id}`)) {
          skippedCount++
          continue
        }

        const pref = prefMap.get(volunteer.userId)
        if (pref && !pref.emailUpdates) {
          skippedCount++
          continue
        }

        try {
          const volunteerName =
            volunteer.firstName || volunteer.name || "Volunteer"

          const html = await renderRatingReminder({
            volunteerName,
            eventTitle: event.title,
            organizationName: event.organization?.name || null,
            baseUrl,
          })

          const result = await sendEmail({
            to: volunteer.email,
            subject: `How was ${event.title}?`,
            html,
          })

          if (result.success) {
            await prisma.emailLog.create({
              data: {
                userId: volunteer.userId,
                email: volunteer.email,
                type: "RATING_REMINDER",
                referenceId: event.id,
              },
            })
            sentCount++
          } else {
            errorCount++
          }
        } catch (err) {
          console.error(
            `Failed to send rating reminder to ${volunteer.email}:`,
            err
          )
          errorCount++
        }
      }
    }

    return NextResponse.json({
      message: "Rating reminders completed",
      sent: sentCount,
      skipped: skippedCount,
      errors: errorCount,
      eventsProcessed: recentlyEndedEvents.length,
    })
  } catch (error) {
    console.error("Rating reminders cron error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

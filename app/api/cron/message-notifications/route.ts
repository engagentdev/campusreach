import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail, verifyCronSecret } from "@/lib/email"
import { renderMessageNotification } from "@/lib/email-templates/message-notification"

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://campusreach.net"

    // Get unprocessed notification queue entries
    const queueEntries = await prisma.messageNotificationQueue.findMany({
      where: {
        processedAt: null,
      },
    })

    if (queueEntries.length === 0) {
      // Cleanup old processed entries while we're here
      await cleanupProcessedEntries()
      return NextResponse.json({ message: "No pending notifications" })
    }

    // Batch-fetch all data upfront to avoid N+1
    const userIds = [...new Set(queueEntries.map((e) => e.userId))]
    const eventIds = [...new Set(queueEntries.map((e) => e.eventId))]

    const [preferences, events, volunteers, orgMembers] = await Promise.all([
      prisma.notificationPreference.findMany({
        where: { userId: { in: userIds } },
      }),
      prisma.event.findMany({
        where: { id: { in: eventIds } },
        select: { id: true, title: true },
      }),
      prisma.volunteer.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, email: true, firstName: true, name: true },
      }),
      prisma.organizationMember.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, email: true, name: true },
      }),
    ])

    const prefMap = new Map(preferences.map((p) => [p.userId, p]))
    const eventMap = new Map(events.map((e) => [e.id, e]))

    // Build user info map (email + name)
    const userInfoMap = new Map<string, { email: string; name: string }>()
    for (const v of volunteers) {
      if (v.email) {
        userInfoMap.set(v.userId, {
          email: v.email,
          name: v.firstName || v.name || "Volunteer",
        })
      }
    }
    for (const m of orgMembers) {
      if (!userInfoMap.has(m.userId) && m.email) {
        userInfoMap.set(m.userId, {
          email: m.email,
          name: m.name || "Team Member",
        })
      }
    }

    let sentCount = 0
    let errorCount = 0

    for (const entry of queueEntries) {
      try {
        // Check notification preferences (default to sending if no pref set)
        const pref = prefMap.get(entry.userId)
        if (pref && !pref.emailUpdates) {
          await prisma.messageNotificationQueue.update({
            where: { id: entry.id },
            data: { processedAt: new Date() },
          })
          continue
        }

        const event = eventMap.get(entry.eventId)
        if (!event) {
          await prisma.messageNotificationQueue.update({
            where: { id: entry.id },
            data: { processedAt: new Date() },
          })
          continue
        }

        const userInfo = userInfoMap.get(entry.userId)
        if (!userInfo) {
          await prisma.messageNotificationQueue.update({
            where: { id: entry.id },
            data: { processedAt: new Date() },
          })
          continue
        }

        const html = await renderMessageNotification({
          recipientName: userInfo.name,
          eventTitle: event.title,
          messageCount: entry.messageIds.length,
          eventId: event.id,
          baseUrl,
        })

        const result = await sendEmail({
          to: userInfo.email,
          subject: `${entry.messageIds.length} new message${entry.messageIds.length !== 1 ? "s" : ""} in ${event.title}`,
          html,
        })

        // Mark as processed
        await prisma.messageNotificationQueue.update({
          where: { id: entry.id },
          data: { processedAt: new Date() },
        })

        if (result.success) {
          await prisma.emailLog.create({
            data: {
              userId: entry.userId,
              email: userInfo.email,
              type: "MESSAGE_NOTIFICATION",
              referenceId: entry.eventId,
            },
          })
          sentCount++
        } else {
          errorCount++
        }
      } catch (err) {
        console.error(`Failed to process notification ${entry.id}:`, err)
        errorCount++

        await prisma.messageNotificationQueue.update({
          where: { id: entry.id },
          data: { processedAt: new Date() },
        })
      }
    }

    // Cleanup old processed entries
    await cleanupProcessedEntries()

    return NextResponse.json({
      message: "Message notifications processed",
      sent: sentCount,
      errors: errorCount,
      total: queueEntries.length,
    })
  } catch (error) {
    console.error("Message notifications cron error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/** Delete processed queue entries older than 7 days */
async function cleanupProcessedEntries() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  await prisma.messageNotificationQueue.deleteMany({
    where: {
      processedAt: { not: null, lt: sevenDaysAgo },
    },
  })
}

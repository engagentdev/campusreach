import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Find the volunteer record for this user
    const volunteer = await prisma.volunteer.findUnique({
      where: { userId: user.id },
    })

    if (!volunteer) {
      return NextResponse.json({ error: "Volunteer not found" }, { status: 404 })
    }

    // Get all confirmed signups with event data for the last 6 months
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    sixMonthsAgo.setDate(1)
    sixMonthsAgo.setHours(0, 0, 0, 0)

    const signups = await prisma.eventSignup.findMany({
      where: {
        volunteerId: volunteer.id,
        status: "CONFIRMED",
        event: {
          startsAt: { gte: sixMonthsAgo },
        },
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startsAt: true,
            endsAt: true,
            timeCommitmentHours: true,
            location: true,
            organizationId: true,
            organization: {
              select: {
                id: true,
                name: true,
                logoUrl: true,
              },
            },
          },
        },
      },
    })

    // Build month labels for the last 6 months
    const monthLabels: string[] = []
    const monthKeys: string[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const shortMonth = d.toLocaleString("en-US", { month: "short" })
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      monthLabels.push(shortMonth)
      monthKeys.push(monthKey)
    }

    // Aggregate hours by month
    const hoursByMonth: Record<string, number> = {}
    const eventsByMonth: Record<string, number> = {}
    const orgCounts: Record<string, { name: string; count: number }> = {}

    for (const key of monthKeys) {
      hoursByMonth[key] = 0
      eventsByMonth[key] = 0
    }

    const now = new Date()

    for (const signup of signups) {
      const event = signup.event
      const eventDate = new Date(event.startsAt)
      const monthKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, "0")}`

      // Only count past events for hours (not upcoming ones)
      const isPast = eventDate <= now

      if (monthKeys.includes(monthKey)) {
        eventsByMonth[monthKey] = (eventsByMonth[monthKey] || 0) + 1

        if (isPast && event.timeCommitmentHours) {
          hoursByMonth[monthKey] = (hoursByMonth[monthKey] || 0) + event.timeCommitmentHours
        }
      }

      // Organization distribution (all time for signups in range)
      if (event.organization) {
        const orgName = event.organization.name || "Unknown"
        if (!orgCounts[orgName]) {
          orgCounts[orgName] = { name: orgName, count: 0 }
        }
        orgCounts[orgName].count += 1
      }
    }

    // Format hours data
    const hoursData = monthKeys.map((key, i) => ({
      month: monthLabels[i],
      hours: hoursByMonth[key] || 0,
    }))

    // Format events data
    const eventsData = monthKeys.map((key, i) => ({
      month: monthLabels[i],
      count: eventsByMonth[key] || 0,
    }))

    // Format organizations data
    const totalShifts = Object.values(orgCounts).reduce((sum, o) => sum + o.count, 0)
    const organizationsData = Object.values(orgCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((org) => ({
        name: org.name,
        count: org.count,
        percentage: totalShifts > 0 ? Math.round((org.count / totalShifts) * 100) : 0,
      }))

    // Get upcoming events for the volunteer
    const upcomingSignups = await prisma.eventSignup.findMany({
      where: {
        volunteerId: volunteer.id,
        status: "CONFIRMED",
        event: {
          startsAt: { gt: now },
        },
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startsAt: true,
            location: true,
            organization: {
              select: {
                name: true,
                logoUrl: true,
              },
            },
          },
        },
      },
      orderBy: {
        event: {
          startsAt: "asc",
        },
      },
      take: 5,
    })

    // Get unread message count
    const eventIdsWithSignups = signups.map((s) => s.event.id)
    const recentMessages = eventIdsWithSignups.length > 0
      ? await prisma.chatMessage.count({
          where: {
            eventId: { in: eventIdsWithSignups },
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        })
      : 0

    // Compute summary stats
    const totalHours = hoursData.reduce((sum, d) => sum + d.hours, 0)
    const totalEvents = eventsData.reduce((sum, d) => sum + d.count, 0)

    return NextResponse.json({
      hoursData,
      eventsData,
      organizationsData,
      totalShifts,
      totalHours,
      totalEvents,
      upcomingEvents: upcomingSignups.map((s) => ({
        id: s.event.id,
        title: s.event.title,
        startsAt: s.event.startsAt,
        location: s.event.location,
        organizationName: s.event.organization?.name || null,
        organizationLogo: s.event.organization?.logoUrl || null,
      })),
      recentMessageCount: recentMessages,
      dateRange: `${monthLabels[0]} - ${monthLabels[monthLabels.length - 1]}`,
    })
  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
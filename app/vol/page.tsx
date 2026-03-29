"use client"

import {
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { IconCalendar, IconMessage, IconStar, IconStarFilled } from "@tabler/icons-react"
import Link from "next/link"
import { HoursLoggedChart } from "@/components/hours-logged-chart"
import { EventsJoinedChart } from "@/components/events-joined-chart"
import { OrganizationsPieChart } from "@/components/organizations-pie-chart"
import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"

type EventToRate = {
  id: string
  title: string
  startsAt: string
  location: string
  organization: {
    id: string
    name: string | null
    logoUrl: string | null
  } | null
}

type HoursDataPoint = {
  month: string
  hours: number
}

type EventsDataPoint = {
  month: string
  count: number
}

type OrgDataPoint = {
  name: string
  count: number
  percentage: number
}

type UpcomingEvent = {
  id: string
  title: string
  startsAt: string
  location: string
  organizationName: string | null
  organizationLogo: string | null
}

type DashboardData = {
  hoursData: HoursDataPoint[]
  eventsData: EventsDataPoint[]
  organizationsData: OrgDataPoint[]
  totalShifts: number
  totalHours: number
  totalEvents: number
  upcomingEvents: UpcomingEvent[]
  recentMessageCount: number
  dateRange: string
}

export default function VolunteerDashboard() {
  const [eventsToRate, setEventsToRate] = useState<EventToRate[]>([])
  const [loadingRatings, setLoadingRatings] = useState(true)
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<EventToRate | null>(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [submittingRating, setSubmittingRating] = useState(false)

  // Real dashboard data from API
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loadingDashboard, setLoadingDashboard] = useState(true)

  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await fetch("/api/vol/dashboard")
      if (!response.ok) throw new Error("Failed to fetch dashboard data")
      const data = await response.json()
      setDashboardData(data)
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoadingDashboard(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()

    async function fetchEventsToRate() {
      try {
        const response = await fetch("/api/vol/ratings")
        if (!response.ok) throw new Error("Failed to fetch events to rate")
        const data = await response.json()
        setEventsToRate(data.events || [])
      } catch (error) {
        console.error("Error fetching events to rate:", error)
      } finally {
        setLoadingRatings(false)
      }
    }

    fetchEventsToRate()
  }, [fetchDashboardData])

  const handleRateClick = (event: EventToRate) => {
    setSelectedEvent(event)
    setRating(0)
    setComment("")
    setRatingDialogOpen(true)
  }

  const handleSubmitRating = async () => {
    if (!selectedEvent || rating === 0) {
      toast.error("Please select a rating")
      return
    }

    setSubmittingRating(true)
    try {
      const response = await fetch("/api/vol/ratings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId: selectedEvent.id,
          rating: rating,
          comment: comment.trim() || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to submit rating")
      }

      toast.success("Rating submitted successfully!")
      setRatingDialogOpen(false)
      setSelectedEvent(null)
      setRating(0)
      setComment("")

      // Refresh events to rate
      const refreshResponse = await fetch("/api/vol/ratings")
      if (refreshResponse.ok) {
        const data = await refreshResponse.json()
        setEventsToRate(data.events || [])
      }
    } catch (error) {
      console.error("Error submitting rating:", error)
      toast.error((error as Error).message || "Failed to submit rating")
    } finally {
      setSubmittingRating(false)
    }
  }

  // Extract data with fallbacks for loading state
  const hoursData = dashboardData?.hoursData ?? []
  const eventsData = dashboardData?.eventsData ?? []
  const organizationsData = dashboardData?.organizationsData ?? []
  const dateRange = dashboardData?.dateRange ?? ""
  const upcomingEvents = dashboardData?.upcomingEvents ?? []
  const recentMessageCount = dashboardData?.recentMessageCount ?? 0
  const hasData = dashboardData !== null && (dashboardData.totalEvents > 0 || dashboardData.totalHours > 0)

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <div className="flex items-center gap-2">
            <span className="font-medium">Dashboard</span>
          </div>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {/* Top Row: 3 Equal Columns */}
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          {/* Hours Logged Card */}
          <Card>
            <CardHeader>
              <CardTitle>Hours</CardTitle>
              <CardDescription>Hours logged</CardDescription>
            </CardHeader>
            <CardContent className="p-0 pb-0">
              {loadingDashboard ? (
                <div className="px-6 py-8 space-y-3">
                  <Skeleton className="h-[180px] w-full" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ) : (
                <>
                  <HoursLoggedChart data={hoursData} />
                  <div className="px-6 pb-4 pt-2">
                    <p className="text-xs font-medium">
                      {hoursData.length > 1 && hoursData[hoursData.length - 1]?.hours > hoursData[hoursData.length - 2]?.hours
                        ? `+${hoursData[hoursData.length - 1].hours - (hoursData[hoursData.length - 2]?.hours || 0)} hours this month`
                        : hoursData.length > 1 && hoursData[hoursData.length - 1]?.hours < hoursData[hoursData.length - 2]?.hours
                        ? `${hoursData[hoursData.length - 1].hours - (hoursData[hoursData.length - 2]?.hours || 0)} hours this month`
                        : "No change this month"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dateRange}
                    </p>
                    {!hasData && (
                      <p className="text-xs text-muted-foreground italic mt-1">
                        Sign up for events to see your data here
                      </p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Events Joined Card */}
          <Card>
            <CardHeader>
              <CardTitle>Events joined</CardTitle>
              <CardDescription>Per month</CardDescription>
            </CardHeader>
            <CardContent className="p-0 pb-0">
              {loadingDashboard ? (
                <div className="px-6 py-8 space-y-3">
                  <Skeleton className="h-[180px] w-full" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ) : (
                <>
                  <EventsJoinedChart data={eventsData} />
                  <div className="px-6 pb-4 pt-2">
                    <p className="text-xs font-medium">
                      {eventsData.length > 1 && eventsData[eventsData.length - 1]?.count > eventsData[eventsData.length - 2]?.count
                        ? `+${eventsData[eventsData.length - 1].count - (eventsData[eventsData.length - 2]?.count || 0)} events this month`
                        : eventsData.length > 1 && eventsData[eventsData.length - 1]?.count < eventsData[eventsData.length - 2]?.count
                        ? `${eventsData[eventsData.length - 1].count - (eventsData[eventsData.length - 2]?.count || 0)} events this month`
                        : "No change this month"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dateRange}
                    </p>
                    {!hasData && (
                      <p className="text-xs text-muted-foreground italic mt-1">
                        Sign up for events to see your data here
                      </p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Where you volunteer Card */}
          <Card>
            <CardHeader>
              <CardTitle>Where you volunteer</CardTitle>
              <CardDescription>Past 6 months</CardDescription>
            </CardHeader>
            <CardContent className="p-0 pb-0">
              {loadingDashboard ? (
                <div className="px-6 py-8 space-y-3">
                  <Skeleton className="h-[180px] w-full" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ) : (
                <>
                  <OrganizationsPieChart data={organizationsData} />
                  <div className="px-6 pb-4 pt-2">
                    {organizationsData.length > 0 ? (
                      <>
                        {organizationsData.map((org, index) => {
                          const shades = [
                            "bg-primary",
                            "bg-primary/80",
                            "bg-primary/60",
                            "bg-primary/40",
                            "bg-primary/20",
                          ]
                          return (
                            <div key={org.name} className="flex items-center gap-2 mb-1">
                              <div className={`h-3 w-3 rounded ${shades[index % shades.length]}`}></div>
                              <span className="text-xs text-muted-foreground">{org.name}</span>
                              <span className="text-xs text-muted-foreground">{org.percentage}%</span>
                            </div>
                          )
                        })}
                        <p className="text-xs text-muted-foreground mt-2">
                          Breakdown of your shifts by organization (last 6 months)
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-3 w-3 rounded bg-primary"></div>
                          <span className="text-xs text-muted-foreground">None yet</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Sign up for events to see your organization breakdown
                        </p>
                      </>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Second Row: Two Action Cards */}
        <div className="grid auto-rows-min gap-4 md:grid-cols-2">
          {/* Upcoming Shifts Card */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming shifts</CardTitle>
              <CardDescription>Your next volunteer events</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingDashboard ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : upcomingEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 px-6 text-center">
                  <IconCalendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    No upcoming shifts yet. Explore and sign up to see them here.
                  </p>
                  <Button className="w-full" asChild>
                    <Link href="/vol/explore">Browse opportunities</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <Link
                      key={event.id}
                      href={`/vol/explore/${event.id}`}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      {event.organizationLogo ? (
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarImage
                            src={event.organizationLogo}
                            alt={event.organizationName || "Organization"}
                          />
                          <AvatarFallback>
                            {event.organizationName?.[0]?.toUpperCase() || "O"}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <IconCalendar className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{event.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>
                            {new Date(event.startsAt).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                          {event.location && event.location !== "TBD" && (
                            <>
                              <span>·</span>
                              <span className="truncate">{event.location}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/vol/explore">Browse more opportunities</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Messages Card */}
          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
              <CardDescription>Event group chats</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingDashboard ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 px-6 text-center">
                  <IconMessage className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    {recentMessageCount > 0
                      ? `${recentMessageCount} message${recentMessageCount === 1 ? "" : "s"} in the last 7 days across your events.`
                      : "No recent messages."}
                  </p>
                  <Button className="w-full" asChild>
                    <Link href="/vol/messaging">
                      {recentMessageCount > 0 ? "View messages" : "Go to messaging"}
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Third Row: Events to Rate Card */}
        <Card>
          <CardHeader>
            <CardTitle>Rate your events</CardTitle>
            <CardDescription>
              Share your feedback on past events you attended
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingRatings ? (
              <div className="text-center text-muted-foreground py-8">
                Loading events...
              </div>
            ) : eventsToRate.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <IconCalendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  No events to rate right now.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {eventsToRate.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {event.organization?.logoUrl && (
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage
                            src={event.organization.logoUrl}
                            alt={event.organization.name || "Organization"}
                          />
                          <AvatarFallback>
                            {event.organization.name?.[0]?.toUpperCase() || "O"}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{event.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span>
                            {new Date(event.startsAt).toLocaleDateString()}
                          </span>
                          {event.location && event.location !== "TBD" && (
                            <>
                              <span>·</span>
                              <span className="truncate">{event.location}</span>
                            </>
                          )}
                        </div>
                        {event.organization?.name && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {event.organization.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleRateClick(event)}
                      size="sm"
                      className="ml-4 shrink-0"
                    >
                      Rate event
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rating Dialog */}
        <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rate this event</DialogTitle>
              <DialogDescription>
                {selectedEvent?.title}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Rating
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="focus:outline-none"
                    >
                      {rating >= star ? (
                        <IconStarFilled className="h-8 w-8 text-primary fill-primary" />
                      ) : (
                        <IconStar className="h-8 w-8 text-muted-foreground" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="comment" className="text-sm font-medium mb-2 block">
                  Comment (optional)
                </label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your thoughts about this event..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setRatingDialogOpen(false)
                  setSelectedEvent(null)
                  setRating(0)
                  setComment("")
                }}
                disabled={submittingRating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitRating}
                disabled={submittingRating || rating === 0}
              >
                {submittingRating ? "Submitting..." : "Submit rating"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarInset>
  )
}
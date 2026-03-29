import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Link,
  Preview,
} from "@react-email/components"
import * as React from "react"

type Event = {
  id: string
  title: string
  organizationName: string | null
  startsAt: Date
  location: string
  volunteersNeeded: number
  volunteersSignedUp: number
}

type WeeklyDigestEmailProps = {
  volunteerName: string
  events: Event[]
  baseUrl: string
}

export function WeeklyDigestEmail({
  volunteerName,
  events,
  baseUrl,
}: WeeklyDigestEmailProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  return (
    <Html>
      <Head />
      <Preview>Upcoming volunteer opportunities on CampusReach</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>CampusReach</Text>
          </Section>

          <Section style={content}>
            <Text style={greeting}>Hi {volunteerName},</Text>

            <Text style={paragraph}>
              Here are the upcoming volunteer opportunities. Find
              something that fits your schedule and make a difference!
            </Text>

            {events.map((event) => (
              <Section key={event.id} style={eventCard}>
                <Text style={eventTitle}>{event.title}</Text>
                {event.organizationName && (
                  <Text style={eventOrg}>{event.organizationName}</Text>
                )}
                <Text style={eventDetails}>
                  {formatDate(event.startsAt)} &bull; {event.location}
                </Text>
                <Text style={eventSpots}>
                  {event.volunteersNeeded - event.volunteersSignedUp} spots
                  remaining
                </Text>
              </Section>
            ))}

            <Section style={ctaSection}>
              <Button style={button} href={`${baseUrl}/vol/explore`}>
                View All Opportunities
              </Button>
            </Section>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              You received this email because you have weekly digest enabled in
              your CampusReach settings.
            </Text>
            <Link href={`${baseUrl}/vol/settings`} style={footerLink}>
              Manage email preferences
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export async function renderWeeklyDigest(props: WeeklyDigestEmailProps): Promise<string> {
  const { render } = await import("@react-email/components")
  return await render(<WeeklyDigestEmail {...props} />)
}

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
}

const header = {
  padding: "20px 30px",
  backgroundColor: "#18181b",
}

const logo = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "bold" as const,
  margin: "0",
}

const content = {
  padding: "20px 30px",
}

const greeting = {
  fontSize: "18px",
  fontWeight: "600" as const,
  color: "#18181b",
  marginBottom: "16px",
}

const paragraph = {
  fontSize: "14px",
  lineHeight: "24px",
  color: "#525f7f",
}

const eventCard = {
  backgroundColor: "#f6f9fc",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "12px",
}

const eventTitle = {
  fontSize: "16px",
  fontWeight: "600" as const,
  color: "#18181b",
  margin: "0 0 4px 0",
}

const eventOrg = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "0 0 8px 0",
}

const eventDetails = {
  fontSize: "13px",
  color: "#525f7f",
  margin: "0 0 4px 0",
}

const eventSpots = {
  fontSize: "12px",
  color: "#10b981",
  fontWeight: "500" as const,
  margin: "0",
}

const ctaSection = {
  textAlign: "center" as const,
  marginTop: "24px",
}

const button = {
  backgroundColor: "#18181b",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "14px",
  fontWeight: "600" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
}

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
}

const footer = {
  padding: "0 30px",
}

const footerText = {
  fontSize: "12px",
  color: "#8898aa",
  lineHeight: "20px",
}

const footerLink = {
  fontSize: "12px",
  color: "#525f7f",
}

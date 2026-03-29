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

type MessageNotificationEmailProps = {
  recipientName: string
  eventTitle: string
  messageCount: number
  eventId: string
  baseUrl: string
}

export function MessageNotificationEmail({
  recipientName,
  eventTitle,
  messageCount,
  eventId,
  baseUrl,
}: MessageNotificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {`${messageCount} new message${messageCount !== 1 ? "s" : ""} in ${eventTitle}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>CampusReach</Text>
          </Section>

          <Section style={content}>
            <Text style={greeting}>Hi {recipientName},</Text>

            <Section style={messageBox}>
              <Text style={messageCountText}>
                {messageCount}
              </Text>
              <Text style={messageLabel}>
                new message{messageCount !== 1 ? "s" : ""}
              </Text>
            </Section>

            <Text style={eventName}>in {eventTitle}</Text>

            <Section style={ctaSection}>
              <Button style={button} href={`${baseUrl}/vol/messaging/${eventId}`}>
                View Messages
              </Button>
            </Section>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              You received this email because you signed up for this event on
              CampusReach.
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

export async function renderMessageNotification(
  props: MessageNotificationEmailProps
): Promise<string> {
  const { render } = await import("@react-email/components")
  return await render(<MessageNotificationEmail {...props} />)
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
  textAlign: "center" as const,
}

const greeting = {
  fontSize: "18px",
  fontWeight: "600" as const,
  color: "#18181b",
  marginBottom: "24px",
  textAlign: "left" as const,
}

const messageBox = {
  backgroundColor: "#f6f9fc",
  borderRadius: "12px",
  padding: "24px",
  margin: "16px 0",
}

const messageCountText = {
  fontSize: "48px",
  fontWeight: "bold" as const,
  color: "#18181b",
  margin: "0",
  lineHeight: "1",
}

const messageLabel = {
  fontSize: "16px",
  color: "#6b7280",
  margin: "8px 0 0 0",
}

const eventName = {
  fontSize: "16px",
  color: "#525f7f",
  marginBottom: "24px",
}

const ctaSection = {
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

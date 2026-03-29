import { timingSafeEqual } from "crypto"
import { Resend } from "resend"

// Lazy-loaded Resend client to avoid build errors
let resend: Resend | null = null

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null
  }
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

type SendEmailParams = {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  const client = getResendClient()
  if (!client) {
    console.warn("RESEND_API_KEY not configured, skipping email send")
    return { success: false, error: "Email service not configured" }
  }

  try {
    const { data, error } = await client.emails.send({
      from: "CampusReach <noreply@updates.campusreach.net>",
      to,
      subject,
      html,
    })

    if (error) {
      console.error("Failed to send email:", error)
      return { success: false, error: error.message }
    }

    return { success: true, id: data?.id }
  } catch (err) {
    console.error("Email send error:", err)
    return { success: false, error: "Failed to send email" }
  }
}

export function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    // Allow in development without secret
    if (process.env.NODE_ENV === "development") {
      return true
    }
    console.error("CRON_SECRET not configured")
    return false
  }

  const expected = `Bearer ${cronSecret}`
  if (!authHeader || authHeader.length !== expected.length) {
    return false
  }
  return timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))
}

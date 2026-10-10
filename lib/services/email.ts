import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { ConfigurationError } from "@/lib/errors";
import { log } from "@/lib/log";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  /** Body contains a secret (sign-in link). Never stored outside the dev log provider. */
  sensitive?: boolean;
};

export type EmailResult = { delivered: boolean; provider: string; id?: string };

/**
 * Sends an email through the configured provider and records the attempt.
 *
 * Throws when the message could not be handed to a provider, so callers never
 * show "check your email" for a message that was not sent.
 */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const prisma = await db();
  const provider = env.emailProvider;

  if (provider === "log") {
    if (env.isProduction && !env.allowLogEmail) {
      throw new ConfigurationError("Email delivery is not configured on this server.");
    }
    await prisma.outboundEmail.create({
      data: {
        to: message.to,
        subject: message.subject,
        body: message.text,
        provider: "log",
        status: "LOGGED"
      }
    });
    log.info("email.logged", { to: message.to, subject: message.subject });
    if (env.isDevelopment) {
      console.log(`\n--- email to ${message.to}: ${message.subject}\n${message.text}\n---\n`);
    }
    return { delivered: false, provider: "log" };
  }

  if (!env.resendApiKey || !env.emailFrom) {
    throw new ConfigurationError("Email delivery is not configured on this server.");
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: env.emailFrom,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        ...(env.supportEmail ? { reply_to: env.supportEmail } : {})
      }),
      signal: AbortSignal.timeout(10_000)
    });

    const body = (await response.json().catch(() => ({}))) as { id?: string; message?: string };

    if (!response.ok) {
      throw new Error(`Resend returned ${response.status}: ${body.message ?? "unknown error"}`);
    }

    await prisma.outboundEmail.create({
      data: {
        to: message.to,
        subject: message.subject,
        provider: "resend",
        status: "SENT",
        providerId: body.id ?? null
      }
    });
    return { delivered: true, provider: "resend", id: body.id };
  } catch (error) {
    log.error("email.failed", { to: message.to, subject: message.subject, error });
    await prisma.outboundEmail
      .create({
        data: {
          to: message.to,
          subject: message.subject,
          provider: "resend",
          status: "FAILED",
          error: error instanceof Error ? error.message.slice(0, 500) : "unknown"
        }
      })
      .catch(() => undefined);
    throw new ConfigurationError("We could not send the email right now. Please try again in a few minutes.");
  }
}

/** Staff notification. A failure is logged but never blocks the visitor's saved submission. */
export async function notifyStaff(subject: string, text: string) {
  const to = env.adminNotifyEmail;
  if (!to) {
    log.warn("email.notify_skipped", { reason: "ADMIN_NOTIFY_EMAIL not set", subject });
    return false;
  }
  try {
    await sendEmail({ to, subject: `[Church Directory] ${subject}`, text });
    return true;
  } catch (error) {
    log.error("email.notify_failed", { subject, error });
    return false;
  }
}

/** Best-effort email to a member of the public or church leader about a review decision. */
export async function notifyPerson(to: string, subject: string, text: string) {
  try {
    await sendEmail({ to, subject, text });
    return true;
  } catch (error) {
    log.error("email.person_notify_failed", { subject, error });
    return false;
  }
}

export async function listOutbox(take = 50) {
  const prisma = await db();
  return prisma.outboundEmail.findMany({ orderBy: { createdAt: "desc" }, take });
}

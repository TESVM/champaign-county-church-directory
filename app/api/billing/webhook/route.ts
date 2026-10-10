import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { log } from "@/lib/log";
import { processStripeEvent, verifyStripeSignature } from "@/lib/services/billing";

export const runtime = "nodejs";

/**
 * Stripe webhook. The signature is checked against the raw body before
 * anything is parsed. A 500 makes Stripe retry; processing is idempotent.
 */
export async function POST(request: Request) {
  const secret = env.stripeWebhookSecret;
  const payload = await request.text();
  if (!secret) {
    log.error("stripe.webhook_unconfigured");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  if (!verifyStripeSignature(payload, request.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  let event: Parameters<typeof processStripeEvent>[0];
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    const outcome = await processStripeEvent(event);
    log.info("stripe.webhook", { id: event.id, type: event.type, outcome });
    return NextResponse.json({ received: true, outcome });
  } catch (error) {
    log.error("stripe.webhook_failed", { id: event.id, type: event.type, error });
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}

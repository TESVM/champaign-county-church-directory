/**
 * Sends a signed, *simulated* Stripe subscription event to a local server, for
 * checking the webhook and entitlement logic without a Stripe account.
 * It never contacts Stripe. For real test-mode verification use the Stripe CLI
 * (`stripe listen --forward-to localhost:3004/api/billing/webhook`).
 *
 *   node scripts/simulate-stripe-webhook.mjs <baseUrl> <whsec> <churchId> <status> [eventType]
 */
import { createHmac, randomBytes } from "node:crypto";

const [baseUrl, secret, churchId, status = "active", type = "customer.subscription.updated"] = process.argv.slice(2);
if (!baseUrl || !secret || !churchId) {
  console.error("usage: simulate-stripe-webhook.mjs <baseUrl> <whsec> <churchId> <status> [eventType]");
  process.exit(1);
}
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(baseUrl)) {
  console.error("Refusing: simulated events may only be sent to a local server.");
  process.exit(1);
}

const now = Math.floor(Date.now() / 1000);
const event = {
  id: `evt_sim_${randomBytes(8).toString("hex")}`,
  type,
  created: now,
  data: {
    object: {
      id: `sub_sim_${churchId.slice(-8)}`,
      object: "subscription",
      customer: `cus_sim_${churchId.slice(-8)}`,
      status,
      cancel_at_period_end: false,
      current_period_end: now + 30 * 86400,
      metadata: { churchId }
    }
  }
};
const payload = JSON.stringify(event);
const signature = createHmac("sha256", secret).update(`${now}.${payload}`).digest("hex");
const response = await fetch(`${baseUrl}/api/billing/webhook`, {
  method: "POST",
  headers: { "content-type": "application/json", "stripe-signature": `t=${now},v1=${signature}` },
  body: payload
});
console.log(response.status, await response.text());

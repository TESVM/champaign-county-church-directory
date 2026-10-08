import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma/client";

export const runtime = "nodejs";

function validStripeSignature(payload: string, header: string, secret: string) {
  const parts = header.split(",").map((part) => part.split("="));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || signatures.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return signatures.some((signature) => {
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

type StripeEvent = {
  type: string;
  data: { object: { status?: string; metadata?: { churchSlug?: string } } };
};

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  const payload = await request.text();
  if (!secret || !signature || !validStripeSignature(payload, signature, secret)) {
    return Response.json({ error: "invalid_signature" }, { status: 400 });
  }

  const event = JSON.parse(payload) as StripeEvent;
  const churchSlug = event.data.object.metadata?.churchSlug;
  if (!churchSlug) return Response.json({ received: true });

  const active =
    event.type === "checkout.session.completed" ||
    ((event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") &&
      ["active", "trialing"].includes(event.data.object.status ?? ""));
  const inactive =
    event.type === "customer.subscription.deleted" ||
    (event.type === "customer.subscription.updated" &&
      ["canceled", "unpaid", "incomplete_expired"].includes(event.data.object.status ?? ""));

  if (active || inactive) {
    await prisma.church.updateMany({ where: { slug: churchSlug }, data: { premiumProfile: active } });
  }
  return Response.json({ received: true });
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.redirect(new URL("/login", request.url), 303);

  const form = await request.formData();
  const churchSlug = form.get("churchSlug")?.toString();
  if (!churchSlug) return NextResponse.json({ error: "missing_church" }, { status: 400 });

  const mayManage = session.user.role === "ADMIN" || session.user.churchSlugs.includes(churchSlug);
  if (!mayManage) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const church = await prisma.church.findUnique({ where: { slug: churchSlug }, select: { id: true, name: true } });
  if (!church) return NextResponse.json({ error: "church_not_found" }, { status: 404 });

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!secretKey || !priceId) return NextResponse.json({ error: "billing_not_configured" }, { status: 503 });

  const origin = new URL(request.url).origin;
  const body = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    client_reference_id: church.id,
    customer_email: session.user.email,
    "metadata[churchSlug]": churchSlug,
    "subscription_data[metadata][churchSlug]": churchSlug,
    success_url: `${origin}/churches/${churchSlug}?upgrade=success`,
    cancel_url: `${origin}/churches/${churchSlug}/upgrade?checkout=cancelled`
  });

  const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store"
  });
  const checkout = (await stripeResponse.json()) as { url?: string; error?: { message?: string } };
  if (!stripeResponse.ok || !checkout.url) {
    console.error("Stripe checkout creation failed", checkout.error?.message);
    return NextResponse.json({ error: "checkout_failed" }, { status: 502 });
  }
  return NextResponse.redirect(checkout.url, 303);
}

import { NextResponse } from "next/server";
import {
  authenticateWithCredentials,
  createSessionCookieValue,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS
} from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        email?: string;
        password?: string;
        nextPath?: string;
      }
    | null;

  const user = await authenticateWithCredentials(body?.email, body?.password);

  if (!user) {
    return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
  }

  const nextPath = body?.nextPath === "/admin" ? "/admin" : "/dashboard";
  const response = NextResponse.json({ ok: true, url: nextPath });

  response.cookies.set(SESSION_COOKIE_NAME, createSessionCookieValue(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  });

  return response;
}

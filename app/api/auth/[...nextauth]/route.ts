import { NextResponse } from "next/server";

function redirectToLogin(request: Request) {
  return NextResponse.redirect(new URL("/login?error=invalid", request.url));
}

export async function GET(request: Request) {
  return redirectToLogin(request);
}

export async function POST(request: Request) {
  return redirectToLogin(request);
}

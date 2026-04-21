import { NextRequest, NextResponse } from "next/server";
import { verifyUnlockToken } from "@/lib/auth/token";

const COOKIE_NAME = "nsc_unlocked";

async function hasValidCookie(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;

  const passphrase = process.env.NSC_WRITE_PASSPHRASE;
  const secret = process.env.NSC_COOKIE_SECRET;
  if (!passphrase || !secret) return false;

  return verifyUnlockToken(token, passphrase, secret);
}

export async function proxy(request: NextRequest) {
  if (await hasValidCookie(request)) {
    return NextResponse.next();
  }

  const unlockUrl = new URL("/unlock", request.url);
  unlockUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(unlockUrl);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/race/:id/control",
    "/race/:id/setup",
    "/api/admin/:path*",
  ],
};

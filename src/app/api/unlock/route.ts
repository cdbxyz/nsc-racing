import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { createUnlockToken } from "@/lib/auth/token";
import { COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/auth/gate";

/** Sanitise the `next` redirect target — must be a local path. */
function sanitiseNext(raw: FormDataEntryValue | null): string {
  if (typeof raw !== "string") return "/";
  const path = raw.trim();
  if (path.startsWith("/") && !path.startsWith("//")) return path;
  return "/";
}

/**
 * Constant-time passphrase comparison.
 * Hash both to a fixed length first so length differences don't leak timing.
 */
function safeCompare(submitted: string, expected: string): boolean {
  const a = createHash("sha256").update(submitted).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const submitted = formData.get("passphrase");
  const next = sanitiseNext(formData.get("next"));

  const expectedPassphrase = process.env.NSC_WRITE_PASSPHRASE;
  const secret = process.env.NSC_COOKIE_SECRET;

  // Misconfigured server — fail closed, never reveal which var is missing
  if (!expectedPassphrase || !secret) {
    console.error("[unlock] NSC_WRITE_PASSPHRASE or NSC_COOKIE_SECRET not set");
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  const isMatch =
    typeof submitted === "string" && safeCompare(submitted, expectedPassphrase);

  if (!isMatch) {
    const url = new URL("/unlock", request.url);
    url.searchParams.set("next", next);
    url.searchParams.set("error", "1");
    return NextResponse.redirect(url, { status: 303 });
  }

  const token = await createUnlockToken(expectedPassphrase, secret);
  const response = NextResponse.redirect(new URL(next, request.url), {
    status: 303,
  });

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return response;
}

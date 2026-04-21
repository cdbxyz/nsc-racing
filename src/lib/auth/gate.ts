import "server-only";
import { cookies } from "next/headers";
import { verifyUnlockToken } from "@/lib/auth/token";

export const COOKIE_NAME = "nsc_unlocked";
export const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export class UnauthorizedError extends Error {
  readonly status = 401 as const;
  constructor() {
    super("Officer passphrase required");
    this.name = "UnauthorizedError";
  }
}

export async function isUnlocked(): Promise<boolean> {
  try {
    const store = await cookies();
    const token = store.get(COOKIE_NAME)?.value;
    if (!token) return false;

    const passphrase = process.env.NSC_WRITE_PASSPHRASE;
    const secret = process.env.NSC_COOKIE_SECRET;
    if (!passphrase || !secret) return false;

    return verifyUnlockToken(token, passphrase, secret);
  } catch {
    return false;
  }
}

/**
 * Assert the request is authenticated. Call at the top of any server action
 * or route handler that performs a write.
 *
 * @throws {UnauthorizedError} when the cookie is absent or invalid.
 */
export async function requireUnlocked(): Promise<void> {
  if (!(await isUnlocked())) {
    throw new UnauthorizedError();
  }
}

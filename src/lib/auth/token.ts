/**
 * Token utilities using the Web Crypto API.
 * Compatible with both the Edge runtime (middleware) and Node.js runtime
 * (server actions, route handlers). Never import this in client components.
 *
 * Token = HMAC-SHA256(key=NSC_COOKIE_SECRET, data=SHA-256(NSC_WRITE_PASSPHRASE))
 * Stored as lowercase hex in the nsc_unlocked cookie.
 */

const enc = new TextEncoder();

function bytesToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): ArrayBuffer | null {
  if (hex.length % 2 !== 0) return null;
  const buf = new ArrayBuffer(hex.length / 2);
  const view = new Uint8Array(buf);
  for (let i = 0; i < hex.length; i += 2) {
    view[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return buf;
}

async function importKey(secret: string, usage: "sign" | "verify") {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage]
  );
}

/** Derive the expected cookie token from the passphrase + secret. */
export async function createUnlockToken(
  passphrase: string,
  secret: string
): Promise<string> {
  const [phraseHash, key] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(passphrase)),
    importKey(secret, "sign"),
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, phraseHash);
  return bytesToHex(sig);
}

/**
 * Constant-time verify of a cookie token.
 * Uses crypto.subtle.verify which is always constant-time.
 */
export async function verifyUnlockToken(
  token: string,
  passphrase: string,
  secret: string
): Promise<boolean> {
  try {
    const tokenBytes = hexToBytes(token);
    if (!tokenBytes || tokenBytes.byteLength !== 32) return false;

    const [phraseHash, key] = await Promise.all([
      crypto.subtle.digest("SHA-256", enc.encode(passphrase)),
      importKey(secret, "verify"),
    ]);
    return crypto.subtle.verify("HMAC", key, tokenBytes, phraseHash);
  } catch {
    return false;
  }
}

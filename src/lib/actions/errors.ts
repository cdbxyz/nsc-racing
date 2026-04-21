"server-only";

/**
 * Log an error server-side and return a safe { error, errorId } payload.
 * Never leaks stack traces to the client.
 */
export function serverActionError(
  err: unknown,
  context?: string
): { error: string; errorId: string } {
  const errorId = crypto.randomUUID().slice(0, 8);
  console.error(`[ACTION ERROR ${errorId}]${context ? ` ${context}` : ""}`, err);
  const message =
    err instanceof Error ? err.message : "An unexpected error occurred";
  return { error: message, errorId };
}

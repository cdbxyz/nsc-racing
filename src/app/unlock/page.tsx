import { redirect } from "next/navigation";
import { isUnlocked } from "@/lib/auth/gate";

function sanitiseNext(raw: string | undefined): string {
  if (!raw) return "/";
  const path = raw.trim();
  return path.startsWith("/") && !path.startsWith("//") ? path : "/";
}

export default async function UnlockPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next: rawNext, error } = await searchParams;
  const next = sanitiseNext(rawNext);

  // Already unlocked — skip the form
  if (await isUnlocked()) redirect(next);

  return (
    <main className="flex min-h-[calc(100vh-49px)] items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-neutral-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-neutral-900">
            Officer access
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Enter the club passphrase to continue.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Passphrase not recognised.
          </div>
        )}

        <form action="/api/unlock" method="POST" className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <div>
            <label
              htmlFor="passphrase"
              className="mb-1.5 block text-sm font-medium text-neutral-700"
            >
              Passphrase
            </label>
            <input
              id="passphrase"
              name="passphrase"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700 active:bg-neutral-800"
          >
            Unlock
          </button>
        </form>
      </div>
    </main>
  );
}

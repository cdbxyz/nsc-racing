import Link from "next/link";
import { isUnlocked } from "@/lib/auth/gate";

export async function LockStatus() {
  const unlocked = await isUnlocked();

  if (unlocked) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-emerald-600">
          Officer mode
        </span>
        {/* Plain form POST — no JS needed */}
        <form action="/api/lock" method="POST">
          <button
            type="submit"
            title="Lock"
            className="text-neutral-400 transition-colors hover:text-neutral-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 11V7a4 4 0 018 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
              />
            </svg>
          </button>
        </form>
      </div>
    );
  }

  return (
    <Link
      href="/unlock"
      title="Officer access"
      className="text-neutral-400 transition-colors hover:text-neutral-600"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2V7a4 4 0 00-8 0v4h8z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 11V7a4 4 0 118 0v4"
        />
      </svg>
    </Link>
  );
}

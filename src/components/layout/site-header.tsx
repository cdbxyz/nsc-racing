import Link from "next/link";
import { isUnlocked } from "@/lib/auth/gate";
import { createServiceClient } from "@/lib/supabase/service";
import { Logo } from "@/components/branding/logo";
import { SiteHeaderOfficerMenu } from "./site-header-officer-menu";

export async function SiteHeader() {
  const unlocked = await isUnlocked();

  let activeRace: { id: string; name: string } | null = null;

  if (unlocked) {
    const supabase = createServiceClient();

    // Running race takes priority; fall back to an in-progress countdown
    const { data: running } = await supabase
      .from("races")
      .select("id, name")
      .eq("status", "running")
      .limit(1)
      .maybeSingle();

    if (running) {
      activeRace = running;
    } else {
      const { data: countdown } = await supabase
        .from("races")
        .select("id, name")
        .eq("status", "draft")
        .not("countdown_started_at", "is", null)
        .is("countdown_abandoned_at", null)
        .limit(1)
        .maybeSingle();
      activeRace = countdown ?? null;
    }
  }

  return (
    <header
      className="sticky top-0 z-10 border-b border-neutral-200 bg-white"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        {/* Logo + wordmark */}
        <Link href="/" className="flex items-center gap-2.5 min-w-0">
          <Logo size="sm" priority />
          <span className="hidden md:block text-sm font-semibold text-neutral-900 hover:text-neutral-600 transition-colors truncate">
            Nefyn Sailing Club
          </span>
        </Link>

        {/* Right-side nav */}
        <nav className="flex items-center gap-4">
          <Link
            href="/trophies"
            className="text-sm text-neutral-500 transition-colors hover:text-neutral-900"
          >
            Trophies
          </Link>

          {unlocked ? (
            <SiteHeaderOfficerMenu activeRace={activeRace} />
          ) : (
            <Link
              href="/unlock"
              className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 transition-colors"
            >
              Unlock
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

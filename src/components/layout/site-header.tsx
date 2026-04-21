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
      className="sticky top-0 z-10 border-b border-navy-100 bg-navy-50"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        {/* Logo + wordmark */}
        <Link href="/" className="flex items-center gap-2.5 min-w-0">
          <Logo size="sm" priority />
          <span className="hidden md:block text-sm font-semibold text-navy-900 hover:text-navy-700 transition-colors truncate">
            Nefyn Sailing Club
          </span>
        </Link>

        {/* Right-side nav */}
        <nav className="flex items-center gap-4">
          <Link
            href="/trophies"
            className="text-sm text-navy-700/70 transition-colors hover:text-navy-900"
          >
            Trophies
          </Link>

          {unlocked ? (
            <SiteHeaderOfficerMenu activeRace={activeRace} />
          ) : (
            <Link
              href="/unlock"
              className="rounded-full border border-navy-200 px-3 py-1 text-xs font-medium text-navy-700/70 hover:border-navy-300 hover:text-navy-800 transition-colors"
            >
              Unlock
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

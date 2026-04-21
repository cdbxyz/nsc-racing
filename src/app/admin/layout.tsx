export const dynamic = "force-dynamic";

import { requireUnlocked } from "@/lib/auth/gate";
import { AdminSidebar } from "@/components/admin/sidebar";
import { LiveRaceStrip } from "@/components/admin/live-race-strip";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUnlocked();
  return (
    <div className="flex flex-col min-h-screen">
      <LiveRaceStrip />
      <div className="mx-auto max-w-4xl w-full px-4 py-6 md:py-8">
        <div className="flex gap-8">
          {/* Desktop sidebar — mobile nav lives in the root layout SiteHeader */}
          <aside className="hidden md:block w-44 shrink-0">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-neutral-400">
              Admin
            </p>
            <AdminSidebar />
          </aside>

          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

import { requireUnlocked } from "@/lib/auth/gate";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminMobileNav } from "@/components/admin/mobile-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUnlocked();
  return (
    <div className="mx-auto max-w-4xl w-full px-4 py-6 md:py-8">
      {/* Mobile top bar with hamburger */}
      <div className="flex items-center gap-3 mb-6 md:hidden">
        <AdminMobileNav />
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
          Admin
        </p>
      </div>

      <div className="flex gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden md:block w-44 shrink-0">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-neutral-400">
            Admin
          </p>
          <AdminSidebar />
        </aside>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

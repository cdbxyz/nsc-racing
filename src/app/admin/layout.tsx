export const dynamic = "force-dynamic";

import { requireUnlocked } from "@/lib/auth/gate";
import { AdminSidebar } from "@/components/admin/sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUnlocked();
  return (
    <div className="mx-auto max-w-4xl w-full px-4 py-8 flex gap-8">
      <aside className="w-44 shrink-0">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-neutral-400">
          Admin
        </p>
        <AdminSidebar />
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

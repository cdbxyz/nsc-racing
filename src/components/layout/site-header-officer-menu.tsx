"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";

const NAV = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/seasons", label: "Seasons" },
  { href: "/admin/helms", label: "Helms" },
  { href: "/admin/boats", label: "Boats" },
  { href: "/admin/classes", label: "Classes" },
  { href: "/admin/trophies", label: "Trophies" },
  { href: "/admin/handicap", label: "Handicap" },
];

interface Props {
  activeRace: { id: string; name: string } | null;
}

export function SiteHeaderOfficerMenu({ activeRace }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Auto-close on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="hidden md:block text-xs text-neutral-400 select-none">
          Officer
        </span>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center justify-center h-10 w-10 rounded-md border border-neutral-200 text-[#0a1b3d] hover:bg-neutral-50 transition-colors"
          aria-label="Admin menu"
        >
          <Menu size={20} />
        </button>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} side="right" title="Admin">
        <div className="flex flex-col">
          {/* Active race — prominent top affordance */}
          {activeRace && (
            <div className="mb-3 pb-3 border-b border-neutral-100">
              <Link
                href={`/race/${activeRace.id}/control`}
                className="flex items-center gap-2.5 rounded-lg px-3 py-3 bg-[#0a1b3d] text-white font-semibold text-sm hover:bg-[#0d2450] transition-colors"
              >
                <span className="inline-block h-2 w-2 rounded-full bg-green-400 animate-pulse shrink-0" />
                Race in progress →
              </Link>
            </div>
          )}

          {/* Nav list */}
          <nav className="flex flex-col gap-0.5">
            {NAV.map(({ href, label, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Lock */}
          <div className="mt-4 pt-4 border-t border-neutral-100">
            <form action="/api/lock" method="POST">
              <button
                type="submit"
                className="w-full text-left rounded-md px-3 py-2 text-sm font-medium text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
              >
                Lock
              </button>
            </form>
          </div>
        </div>
      </Sheet>
    </>
  );
}

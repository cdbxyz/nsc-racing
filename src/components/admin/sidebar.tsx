"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const NAV = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/seasons", label: "Seasons" },
  { href: "/admin/classes", label: "Classes" },
  { href: "/admin/boats", label: "Boats" },
  { href: "/admin/helms", label: "Helms" },
  { href: "/admin/trophies", label: "Trophies" },
  { href: "/admin/handicap", label: "Handicap" },
];

interface AdminSidebarProps {
  onNavigate?: () => void;
}

export function AdminSidebar({ onNavigate }: AdminSidebarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();

  // Close mobile sheet on route change
  useEffect(() => {
    if (onNavigate) onNavigate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <nav className="flex flex-col gap-1">
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
  );
}

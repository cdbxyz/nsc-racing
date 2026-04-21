"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { AdminSidebar } from "./sidebar";

export function AdminMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Hamburger — visible below md */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden flex items-center justify-center h-10 w-10 rounded-md text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
        aria-label="Open navigation"
      >
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Admin">
        <AdminSidebar />
      </Sheet>
    </>
  );
}

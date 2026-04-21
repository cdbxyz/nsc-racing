"use client";

import { useEffect, useRef } from "react";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  side?: "left" | "right";
  title?: string;
  children: React.ReactNode;
}

export function Sheet({ open, onClose, side = "left", title, children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Focus panel when opened
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Navigation"}
        tabIndex={-1}
        className={`fixed inset-y-0 z-50 w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col transition-transform duration-300 focus:outline-none ${
          side === "left" ? "left-0" : "right-0"
        } ${
          open
            ? "translate-x-0"
            : side === "left"
              ? "-translate-x-full"
              : "translate-x-full"
        }`}
      >
        {/* Close button */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
          {title && (
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
              {title}
            </p>
          )}
          <button
            onClick={onClose}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            aria-label="Close"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </>
  );
}

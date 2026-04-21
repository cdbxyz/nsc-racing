"use client";

import Image from "next/image";
import { useState } from "react";

const ASPECT = { w: 2509, h: 2600 }; // source dimensions

const SIZES = {
  sm: 32,
  md: 40,
  lg: 56,
} as const;

interface LogoProps {
  size?: keyof typeof SIZES;
  className?: string;
  priority?: boolean;
}

export function Logo({ size = "md", className = "", priority = false }: LogoProps) {
  const [failed, setFailed] = useState(false);
  const px = SIZES[size];
  const h = Math.round(px * (ASPECT.h / ASPECT.w)); // preserve aspect ratio

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-[#0a1b3d] text-white font-bold select-none shrink-0 ${className}`}
        style={{ width: px, height: px, fontSize: Math.floor(px * 0.32) }}
        aria-label="Nefyn Sailing Club"
      >
        NSC
      </div>
    );
  }

  return (
    <Image
      src="/nsclogo.webp"
      alt="Nefyn Sailing Club"
      width={px}
      height={h}
      priority={priority}
      className={`shrink-0 ${className}`}
      onError={() => setFailed(true)}
      unoptimized={false}
    />
  );
}

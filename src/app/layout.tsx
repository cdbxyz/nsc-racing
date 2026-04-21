import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Providers } from "@/components/providers";
import { LockStatus } from "@/components/lock-status";
import { Logo } from "@/components/branding/logo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a1b3d",
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"
  ),
  title: {
    default: "Nefyn Sailing Club — Racing",
    template: "%s | NSC Racing",
  },
  description:
    "Live race management and results for Nefyn Sailing Club. Portsmouth Yardstick scoring, trophy awards, and personal handicap tracking.",
  openGraph: {
    siteName: "NSC Racing",
    type: "website",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  icons: {
    icon: [
      { url: "/icon.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
            <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
              <Link href="/" className="flex items-center gap-2.5 min-w-0">
                <Logo size="sm" priority />
                <span className="hidden md:block text-sm font-semibold text-neutral-900 hover:text-neutral-600 transition-colors truncate">
                  Nefyn Sailing Club
                </span>
              </Link>

              <nav className="flex items-center gap-4">
                <Link
                  href="/trophies"
                  className="text-sm text-neutral-500 transition-colors hover:text-neutral-900"
                >
                  Trophies
                </Link>
                <LockStatus />
              </nav>
            </div>
          </header>

          <div className="flex-1">{children}</div>

          <footer className="no-print border-t border-neutral-100 bg-white mt-auto"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="mx-auto max-w-4xl px-4 py-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs text-neutral-400">
              <span>© Nefyn Sailing Club</span>
              <a
                href="https://nefynsailing.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-neutral-600 transition-colors"
              >
                nefynsailing.com
              </a>
              <a
                href="mailto:nefynsailingclub.secretary@gmail.com"
                className="hover:text-neutral-600 transition-colors"
              >
                Contact
              </a>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}

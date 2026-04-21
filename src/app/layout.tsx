import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/layout/site-header";
import "./globals.css";

// Use --font-sans / --font-mono directly so Tailwind's font-sans / font-mono
// utilities resolve to Geist at runtime without any intermediate variable.
const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
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
      className={`${geistSans.variable} ${geistMono.variable} font-sans h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">
        <Providers>
          <SiteHeader />

          <div className="flex-1">{children}</div>

          <footer
            className="no-print border-t border-neutral-100 bg-white mt-auto"
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

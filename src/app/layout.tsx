import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Providers } from "@/components/providers";
import { LockStatus } from "@/components/lock-status";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NSC Racing",
  description: "Nefyn Sailing Club fortnight race programme",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
            <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 select-none items-center justify-center rounded-full bg-neutral-800 text-xs font-bold text-white">
                  NSC
                </div>
                <Link
                  href="/"
                  className="text-sm font-semibold text-neutral-900 hover:text-neutral-600 transition-colors"
                >
                  Nefyn Sailing Club
                </Link>
              </div>
              <nav className="flex items-center gap-4">
                <Link
                  href="/results"
                  className="text-sm text-neutral-500 transition-colors hover:text-neutral-900"
                >
                  Results
                </Link>
                <LockStatus />
              </nav>
            </div>
          </header>
          {children}
        </Providers>
      </body>
    </html>
  );
}

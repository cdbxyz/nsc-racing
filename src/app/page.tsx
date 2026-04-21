import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo placeholder */}
            <div className="h-10 w-10 rounded-full bg-neutral-800 flex items-center justify-center text-white text-xs font-bold select-none">
              NSC
            </div>
            <div>
              <p className="text-xs text-neutral-500 leading-none">
                Nefyn Sailing Club
              </p>
              <p className="text-sm font-semibold text-neutral-900 leading-tight">
                Fortnight Racing
              </p>
            </div>
          </div>
          <nav className="flex items-center gap-4 text-sm text-neutral-600">
            <Link
              href="/results"
              className="hover:text-neutral-900 transition-colors"
            >
              Results
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl w-full px-4 py-12 sm:py-20">
        <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 tracking-tight">
          Nefyn Sailing Club
        </h1>
        <p className="mt-2 text-lg text-neutral-500">
          15-day fortnight race programme
        </p>
      </section>

      {/* Cards */}
      <section className="mx-auto max-w-4xl w-full px-4 pb-16 grid gap-4 sm:grid-cols-2">
        {/* Next race */}
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6">
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-400 mb-3">
            Next Race
          </p>
          <p className="text-2xl font-semibold text-neutral-900">—</p>
          <p className="mt-1 text-sm text-neutral-500">
            No season active. Check back soon.
          </p>
        </div>

        {/* Results */}
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 flex flex-col gap-3">
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-400">
            Results
          </p>
          <p className="text-sm text-neutral-500">
            Race results will appear here once the season is underway.
          </p>
          <Link
            href="/results"
            className="mt-auto inline-flex items-center text-sm font-medium text-neutral-900 hover:underline"
          >
            View all results →
          </Link>
        </div>
      </section>
    </main>
  );
}

# NSC Racing

Web tool for the Nefyn Sailing Club 15-day fortnight race programme. Records lap times, computes Portsmouth Yardstick corrected results, manages trophies, and applies the club's personal handicap deduction system.

See [SPEC.md](./SPEC.md) for the full functional specification.

---

## Local setup

### Prerequisites

- Node.js 20+
- A Supabase project (free tier is fine for development)

### Steps

```bash
# 1. Clone and install
git clone <repo-url>
cd nsc-racing
npm install

# 2. Configure environment variables
cp .env.local.example .env.local
# Fill in your Supabase values (see below)

# 3. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment variables

Copy `.env.local.example` to `.env.local` and set the following:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard → Project Settings → API → `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Project Settings → API → `service_role` key |

> **Important:** `SUPABASE_SERVICE_ROLE_KEY` is a secret. Never prefix it with `NEXT_PUBLIC_`; it must only be used in server-side code.

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Production build (TypeScript + lint check) |
| `npm run start` | Serve the production build locally |
| `npm run lint` | Run ESLint |

---

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import the repository in the [Vercel dashboard](https://vercel.com/new).
3. Add the three environment variables above in **Project → Settings → Environment Variables**.
4. Deploy — Vercel auto-detects Next.js and builds from the `main` branch.

Subsequent pushes to `main` trigger automatic redeployments.

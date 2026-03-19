# Flashcard Web App

A mobile-first flashcard web app (Vite + React) with server-side APIs on Vercel and Supabase as the database.

## Tech Stack

- Frontend: React, React Router, Vite, Tailwind
- Backend: Vercel Functions (`api/*`)
- Database/Auth: Supabase (accessed only from server APIs)
- Testing: Vitest + Testing Library
- PWA: `manifest.webmanifest` + `sw.js`

## Features (Current)

- Login / signup / logout flow via `/api/auth/*`
- Dashboard with deck list + create deck
- Deck details with tag/unfamiliar filters, add/delete/toggle cards
- Import CSV/XLSX through server endpoint `/api/import`
- Study mode with flip card and unfamiliar toggle
- PWA install support (iPhone Add to Home Screen compatible)

## Environment Variables

Create `.env` from `.env.example`:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## First-Time Supabase Setup

1. Create a Supabase project.
2. Open SQL Editor and run [`supabase/init.sql`](supabase/init.sql).
3. Ensure Email auth provider is enabled if you use signup/login.

## Local Development

Install dependencies:

```bash
npm install
```

Run frontend only:

```bash
npm run dev
```

Run frontend + Vercel API routes locally:

```bash
npm run dev:full
```

## Testing and Build

```bash
npm test
npm run build
```

## Notes

- Client does not call Supabase directly.
- `.env` is local only; on Vercel set env vars in Project Settings.
- For production deployment checklist, see [`docs/deploy/vercel-checklist.md`](docs/deploy/vercel-checklist.md).

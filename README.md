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
- Study mode with flip card and mastery actions (`Hoc lai`, `Da biet`)
- Learn queue API that prioritizes low-mastery cards
- Quiz mode (multiple choice) with server-side scoring
- PWA install support (iPhone Add to Home Screen compatible)

## Mastery Levels and Scoring

Each card has `mastery_level` from `0` to `3`:

- `0`: New card (default)
- `1`: In learning rotation
- `2`: Improving
- `3`: Mastered (temporarily hidden from default queue)

Server transition rules:

- Study mode:
  - `relearn` (`Hoc lai`) -> set `mastery_level = 1`
  - `known` (`Da biet`) -> set `mastery_level = 3`
- Quiz mode:
  - Correct answer -> `mastery_level + 1` (capped at `3`)
  - Wrong answer -> reset to `1`

Review timestamps:

- Every study/quiz update sets `last_reviewed_at`.
- When a card reaches level `3`, server sets `next_review_at = now + 3 days`.

## Learn Engine

Endpoint: `GET /api/learn/queue?deckId=...&includeMastered=false`

Queue selection is server-side and weighted by mastery:

- Level `1`: `50%` priority
- Level `2`: `35%` priority
- Level `0`: `15%` priority
- Level `3`: excluded by default

Use `includeMastered=true` to re-include level `3` cards.

## Quiz Flow

1. Client requests next question: `GET /api/quiz/next?deckId=...`
2. Server picks a card using learn-engine priority and returns:
   - `cardId`
   - `term`
   - answer `options`
3. Client submits selected meaning: `POST /api/quiz/answer`
4. Server validates correctness, applies mastery transition, and returns result:
   - `isCorrect`
   - `correctMeaning`
   - updated `masteryLevel`

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

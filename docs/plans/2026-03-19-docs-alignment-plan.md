# Flashcard Docs-Alignment Implementation Plan (Keep Login)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the current Vite + Vercel + Supabase app with `docs/specs/2026-03-18-flashcard-mvp-design.md` for Module 1 + Module 5, while keeping the existing login/auth flow unchanged.

**Architecture:** Keep SPA frontend in `src/`, server-only data access via Vercel Functions in `api/`, and Supabase behind server APIs. Preserve `AuthContext` + auth endpoints as-is, and focus refactor on import pipeline, schema normalization, API boundaries, and PWA installability.

**Tech Stack:** React + Vite, React Router, Vercel Functions (Node ESM), Supabase Postgres, PapaParse + read-excel-file, PWA manifest + service worker, Vitest + Playwright.

---

Assumptions locked for this plan:
- Login/auth stays as current implementation.
- Client never calls Supabase directly.
- Dedupe rule is per-deck by normalized term (trim + lowercase + collapse spaces).
- Deviation accepted from docs: docs say "no login", but product decision now is "keep login".

## Gap Snapshot (Current vs Spec + Decision)

- Intentional deviation: keep login (do not remove auth screens/endpoints).
- Current schema stores `tags` as `text[]` in `cards`; target requires `tags`, `card_tags`, `import_jobs`, `normalized_term`.
- Current import still has client-side parsing/dedupe path; target is server-side import + report.
- Current card update often rewrites full deck card set; target is explicit card/tag/import APIs.
- Current app has no manifest/service worker for PWA installability.

### Task 1: Baseline Lock and Regression Guard

**Files:**
- Modify: `package.json`
- Create: `src/app/__tests__/smoke.spec.tsx`
- Create: `api/__tests__/contracts.spec.ts`
- Create: `docs/plans/traceability/2026-03-19-mvp-traceability.md`

- [ ] **Step 1: Confirm baseline build**
Run: `npm run build`
Expected: pass before refactor.

- [ ] **Step 2: Add smoke tests for core screens**
Cover: dashboard, deck details, study mode (authenticated state).

- [ ] **Step 3: Add API contract tests**
Capture payload shapes for `/api/auth/*`, `/api/decks/*` to detect breaking changes.

- [ ] **Step 4: Add acceptance traceability file**
Map every MVP acceptance criterion to endpoint/screen/component.

### Task 2: Preserve and Harden Existing Login/Auth Layer

**Files:**
- Modify: `src/app/context/AuthContext.tsx`
- Modify: `src/app/screens/AuthScreen.tsx`
- Modify: `api/auth/login.ts`
- Modify: `api/auth/signup.ts`
- Modify: `api/auth/me.ts`
- Modify: `api/auth/logout.ts`
- Modify: `server/auth.ts`
- Modify: `server/cookies.ts`

- [ ] **Step 1: Keep current auth flow unchanged functionally**
No UX/route removal; only hardening and compatibility fixes.

- [ ] **Step 2: Add robust error codes and logs**
Standardize 4xx/5xx responses for auth APIs.

- [ ] **Step 3: Add auth regression tests**
Cases: signup/login/me/logout happy path and invalid credentials.

- [ ] **Step 4: Keep ESM import compatibility**
Verify server-side imports use explicit `.js` for Vercel runtime.

### Task 3: Data Model Refactor to MVP Schema

**Files:**
- Modify: `supabase/init.sql`
- Create: `server/normalize.ts`
- Create: `server/repositories/tags.ts`
- Create: `server/repositories/cards.ts`
- Create: `server/repositories/import-jobs.ts`

- [ ] **Step 1: Expand schema**
Add tables `tags`, `card_tags`, `import_jobs`; add `cards.normalized_term`.

- [ ] **Step 2: Add constraints and indexes**
- unique (`deck_id`, `normalized_term`) on cards
- unique (`deck_id`, `name`) on tags
- unique (`card_id`, `tag_id`) on card_tags

- [ ] **Step 3: Keep user scoping**
Continue using authenticated `user_id` model already in project.

- [ ] **Step 4: Add normalization utility**
Shared helper used by import + manual card create/update.

### Task 4: API Redesign by Resource Boundary

**Files:**
- Modify: `api/decks/index.ts`
- Modify: `api/decks/[deckId].ts`
- Create: `api/tags/index.ts`
- Create: `api/cards/index.ts`
- Create: `api/cards/[cardId]/unfamiliar.ts`
- Create: `api/import/index.ts`
- Modify: `server/http.ts`

- [ ] **Step 1: Deck APIs for deck metadata only**
Stop using deck PATCH to replace entire card arrays.

- [ ] **Step 2: Add tag APIs**
`GET /api/tags?deckId=...`, `POST /api/tags`.

- [ ] **Step 3: Add card list API with filters**
`GET /api/cards?deckId=...&tagId=...&unfamiliarOnly=true`.

- [ ] **Step 4: Add unfamiliar toggle endpoint**
`PATCH /api/cards/:cardId/unfamiliar` with explicit boolean.

- [ ] **Step 5: Add import endpoint contract**
`POST /api/import` => summary `{ totalRows, inserted, duplicates, failed }`.

### Task 5: Server-Side Import Pipeline (CSV/XLSX + Dedupe + Report)

**Files:**
- Modify: `src/app/components/ImportModal.tsx`
- Modify: `src/app/utils/import.ts`
- Create: `server/import/parsers.ts`
- Create: `server/import/service.ts`
- Create: `server/import/types.ts`

- [ ] **Step 1: Move import logic to server**
Client only uploads file + default tag and renders server report.

- [ ] **Step 2: Validate required columns server-side**
Enforce `term`, `meaning`; reject unsupported extensions.

- [ ] **Step 3: Apply dedupe at DB layer**
Use normalized term + unique constraint per deck, keep first, skip rest.

- [ ] **Step 4: Assign tags through tag/card_tag tables**
Auto-create default tag if needed.

- [ ] **Step 5: Persist import job summary**
Write to `import_jobs` and return report to UI.

### Task 6: UI Alignment for 4 Main Screens (With Login Retained)

**Files:**
- Modify: `src/app/screens/Dashboard.tsx`
- Modify: `src/app/screens/DeckDetails.tsx`
- Modify: `src/app/screens/StudyMode.tsx`
- Modify: `src/app/routes.tsx`
- Modify: `src/app/hooks/useDecks.ts`
- Create: `src/app/hooks/useCards.ts`
- Create: `src/app/hooks/useImport.ts`

- [ ] **Step 1: Dashboard**
Ensure deck list + create deck + study CTA follow current API contracts.

- [ ] **Step 2: Deck details**
Use card/tag endpoints for filters and unfamiliar-only display.

- [ ] **Step 3: Import modal**
Use upload endpoint and display summary report from server.

- [ ] **Step 4: Study mode**
Use dedicated unfamiliar toggle API (no full-deck rewrite).

### Task 7: PWA (Module 5)

**Files:**
- Create: `public/manifest.webmanifest`
- Create: `public/icons/icon-192.png`
- Create: `public/icons/icon-512.png`
- Create: `public/sw.js`
- Modify: `index.html`
- Modify: `src/main.tsx`

- [ ] **Step 1: Add manifest + iPhone-friendly meta tags**
Set app name, standalone display, start URL, theme/background color.

- [ ] **Step 2: Register service worker**
Cache app shell/static assets only.

- [ ] **Step 3: Validate installability**
Lighthouse + manual iPhone Add to Home Screen test.

### Task 8: Verification and Deploy Readiness

**Files:**
- Modify: `README.md`
- Create: `docs/deploy/vercel-checklist.md`

- [ ] **Step 1: Run verification commands**
Run: `npm run build`
Expected: pass.

- [ ] **Step 2: Run API smoke on `vercel dev`**
Validate auth + decks + cards + import flows.

- [ ] **Step 3: Update deployment runbook**
Document env vars, Supabase init SQL, and Vercel deploy steps.

- [ ] **Step 4: Run pre-prod checklist**
Manual scenario test across all 4 screens.

## Milestone Delivery Order

1. M1: Auth retained and stable + baseline safety net.
2. M2: Schema + resource APIs aligned to docs.
3. M3: Import pipeline and report fully server-side.
4. M4: UI alignment complete with login kept.
5. M5: PWA installability + deploy checklist complete.

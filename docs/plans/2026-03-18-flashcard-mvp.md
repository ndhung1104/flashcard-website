# Flashcard MVP (Module 1 + Module 5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an MVP flashcard web app with multi-deck support, tag filtering, Excel/CSV import with per-deck dedupe, manual unfamiliar marking, and installable iPhone-compatible PWA shell.

**Architecture:** Use Next.js App Router (server-first) with Supabase Postgres. Put import parsing and dedupe on server routes, enforce uniqueness with database constraints, and expose thin API boundaries for deck/tag/card/import/study actions. Add PWA manifest and service worker for installability and shell caching.

**Tech Stack:** Next.js (TypeScript, App Router), React, Supabase Postgres, Vitest + Testing Library, Playwright, `xlsx`, `csv-parse`, `zod`, `next-pwa`, Vercel.

---

Execution rules for all tasks:
- Follow @superpowers:test-driven-development for behavior changes.
- Use @superpowers:systematic-debugging for any failing test or unexpected behavior.
- Before any "done" claim, run verification per @superpowers:verification-before-completion.

### Task 1: Bootstrap App and Test Harness

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `src/app/layout.tsx`, `src/app/page.tsx`
- Create: `vitest.config.ts`, `vitest.setup.ts`, `playwright.config.ts`
- Create: `src/app/__tests__/home.test.tsx`, `e2e/app-shell.spec.ts`

- [ ] **Step 1: Scaffold Next.js app**

Run: `npx create-next-app@latest . --typescript --eslint --app --src-dir --use-npm --import-alias "@/*"`
Expected: project files generated successfully.

- [ ] **Step 2: Add test dependencies**

Run: `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom playwright @playwright/test`
Expected: install succeeds with no fatal errors.

- [ ] **Step 3: Write the failing component test**

```tsx
// src/app/__tests__/home.test.tsx
import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

it("shows app title", () => {
  render(<HomePage />);
  expect(screen.getByRole("heading", { name: /flashcard/i })).toBeInTheDocument();
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm run test -- src/app/__tests__/home.test.tsx`
Expected: FAIL because page heading is not implemented yet.

- [ ] **Step 5: Implement minimal page heading**

```tsx
// src/app/page.tsx
export default function HomePage() {
  return <h1>Flashcard MVP</h1>;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run test -- src/app/__tests__/home.test.tsx`
Expected: PASS.

- [ ] **Step 7: Add scripts and test configs**

Add npm scripts: `test`, `test:watch`, `test:e2e`, `lint`, `build`.

- [ ] **Step 8: Commit**

Run:
`git add package.json src vitest.config.ts vitest.setup.ts playwright.config.ts e2e`
`git commit -m "chore: scaffold Next.js app with unit/e2e test harness"`

### Task 2: Define Database Schema and Supabase Access Layer

**Files:**
- Create: `supabase/migrations/20260318_0001_flashcard_mvp.sql`
- Create: `src/lib/supabase/server.ts`, `src/lib/supabase/types.ts`
- Create: `src/lib/db/models.ts`
- Test: `src/lib/db/__tests__/schema-contract.test.ts`

- [ ] **Step 1: Write failing schema contract test**

```ts
// src/lib/db/__tests__/schema-contract.test.ts
import { TABLES } from "@/lib/db/models";

it("declares core tables", () => {
  expect(TABLES).toEqual(["decks", "tags", "cards", "card_tags", "import_jobs"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/db/__tests__/schema-contract.test.ts`
Expected: FAIL because models are not defined.

- [ ] **Step 3: Add minimal models constant**

```ts
// src/lib/db/models.ts
export const TABLES = ["decks", "tags", "cards", "card_tags", "import_jobs"] as const;
```

- [ ] **Step 4: Add SQL migration with constraints**

Include:
- unique (`deck_id`, `name`) on `tags`
- unique (`deck_id`, `normalized_term`) on `cards`
- unique (`card_id`, `tag_id`) on `card_tags`

- [ ] **Step 5: Add Supabase server client helper**

Use env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

- [ ] **Step 6: Run tests**

Run: `npm run test -- src/lib/db/__tests__/schema-contract.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

Run:
`git add supabase src/lib/db src/lib/supabase`
`git commit -m "feat: add MVP schema migration and Supabase access layer"`

### Task 3: Build Import Parsing and Normalization Utilities

**Files:**
- Create: `src/lib/import/normalize-term.ts`
- Create: `src/lib/import/parse-csv.ts`
- Create: `src/lib/import/parse-xlsx.ts`
- Create: `src/lib/import/types.ts`
- Test: `src/lib/import/__tests__/normalize-term.test.ts`
- Test: `src/lib/import/__tests__/parse-csv.test.ts`
- Test: `src/lib/import/__tests__/parse-xlsx.test.ts`

- [ ] **Step 1: Write failing tests for normalization**

```ts
it("trims, lowercases, and collapses spaces", () => {
  expect(normalizeTerm("  Ko  NNiCHI  Wa ")).toBe("ko nnichi wa");
});
```

- [ ] **Step 2: Run to verify RED**

Run: `npm run test -- src/lib/import/__tests__/normalize-term.test.ts`
Expected: FAIL because function missing.

- [ ] **Step 3: Implement minimal normalization**

```ts
export function normalizeTerm(term: string): string {
  return term.trim().toLowerCase().replace(/\s+/g, " ");
}
```

- [ ] **Step 4: Add failing parser tests for required columns**

Test cases:
- valid two-column data
- missing `term` column
- missing `meaning` column
- empty row handling

- [ ] **Step 5: Run parser tests to verify RED**

Run: `npm run test -- src/lib/import/__tests__/parse-csv.test.ts src/lib/import/__tests__/parse-xlsx.test.ts`
Expected: FAIL.

- [ ] **Step 6: Implement CSV/XLSX parsers**

Return normalized row shape:
`{ term: string; meaning: string; normalizedTerm: string; rowNumber: number }`

- [ ] **Step 7: Re-run parser tests to verify GREEN**

Expected: PASS.

- [ ] **Step 8: Commit**

Run:
`git add src/lib/import`
`git commit -m "feat: add CSV/XLSX parser and term normalization utilities"`

### Task 4: Implement Import API with Dedupe, Default Tag, and Job Report

**Files:**
- Create: `src/app/api/import/route.ts`
- Create: `src/lib/import/import-service.ts`
- Create: `src/lib/import/validators.ts`
- Test: `src/app/api/import/__tests__/route.test.ts`
- Test: `src/lib/import/__tests__/import-service.test.ts`

- [ ] **Step 1: Write failing import-service tests**

Cover:
- inserts non-duplicates
- skips duplicate by (`deck_id`, `normalized_term`)
- counts `inserted_rows`, `duplicate_rows`, `failed_rows`
- applies default tag to inserted cards only

- [ ] **Step 2: Run to verify RED**

Run: `npm run test -- src/lib/import/__tests__/import-service.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement minimal import service**

Service responsibilities:
- detect file extension
- parse rows
- validate row values
- insert cards with conflict ignore
- insert `card_tags`
- create `import_jobs` report row

- [ ] **Step 4: Write failing API route tests**

Cases:
- unsupported extension -> 400
- missing params -> 400
- successful import -> 200 with report

- [ ] **Step 5: Run route tests to verify RED**

Run: `npm run test -- src/app/api/import/__tests__/route.test.ts`
Expected: FAIL.

- [ ] **Step 6: Implement API route**

POST multipart/form-data:
- `file`
- `deck_id`
- `default_tag`

- [ ] **Step 7: Re-run all import tests**

Run: `npm run test -- src/lib/import/__tests__ src/app/api/import/__tests__`
Expected: PASS.

- [ ] **Step 8: Commit**

Run:
`git add src/app/api/import src/lib/import`
`git commit -m "feat: implement import API with dedupe and job reporting"`

### Task 5: Implement Deck, Tag, and Card APIs

**Files:**
- Create: `src/app/api/decks/route.ts`
- Create: `src/app/api/decks/[deckId]/route.ts`
- Create: `src/app/api/tags/route.ts`
- Create: `src/app/api/cards/route.ts`
- Create: `src/app/api/cards/[cardId]/unfamiliar/route.ts`
- Create: `src/lib/decks/service.ts`, `src/lib/tags/service.ts`, `src/lib/cards/service.ts`
- Test: `src/app/api/decks/__tests__/route.test.ts`
- Test: `src/app/api/tags/__tests__/route.test.ts`
- Test: `src/app/api/cards/__tests__/route.test.ts`

- [ ] **Step 1: Write failing deck API tests**

Cover create/list/update deck.

- [ ] **Step 2: Verify RED**

Run: `npm run test -- src/app/api/decks/__tests__/route.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement minimal deck service + routes**

- [ ] **Step 4: Write failing tag API tests**

Cover create/list tags scoped by `deck_id`.

- [ ] **Step 5: Implement minimal tag service + route**

- [ ] **Step 6: Write failing card API tests**

Cover list cards with filters:
- `deck_id` required
- optional `tag_id`
- optional `mark_unfamiliar=true`

- [ ] **Step 7: Implement card list + unfamiliar toggle route**

- [ ] **Step 8: Run API test suite**

Run: `npm run test -- src/app/api/decks/__tests__ src/app/api/tags/__tests__ src/app/api/cards/__tests__`
Expected: PASS.

- [ ] **Step 9: Commit**

Run:
`git add src/app/api src/lib/decks src/lib/tags src/lib/cards`
`git commit -m "feat: add deck tag card APIs with filtering and unfamiliar toggle"`

### Task 6: Build Deck/Card UI and Flashcard Study View

**Files:**
- Create: `src/app/decks/page.tsx`
- Create: `src/app/decks/[deckId]/page.tsx`
- Create: `src/app/study/[deckId]/page.tsx`
- Create: `src/components/decks/deck-list.tsx`
- Create: `src/components/cards/card-table.tsx`
- Create: `src/components/cards/import-form.tsx`
- Create: `src/components/study/flashcard-view.tsx`
- Test: `src/components/study/__tests__/flashcard-view.test.tsx`
- Test: `src/components/cards/__tests__/card-table.test.tsx`

- [ ] **Step 1: Write failing flashcard flip test**

```tsx
it("flips from term to meaning on click", async () => {
  render(<FlashcardView card={{ term: "犬", meaning: "dog" }} />);
  await user.click(screen.getByRole("button", { name: /犬/i }));
  expect(screen.getByText("dog")).toBeInTheDocument();
});
```

- [ ] **Step 2: Verify RED**

Run: `npm run test -- src/components/study/__tests__/flashcard-view.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement minimal flashcard component**

- [ ] **Step 4: Write failing card table tests**

Cover tag filter rendering and unfamiliar toggle action callback.

- [ ] **Step 5: Implement deck/detail/study pages + components**

Requirements:
- deck list
- deck detail with import form and card list
- tag filter and unfamiliar filter
- unfamiliar toggle button
- study screen with previous/next and flip

- [ ] **Step 6: Run component tests**

Run: `npm run test -- src/components/study/__tests__ src/components/cards/__tests__`
Expected: PASS.

- [ ] **Step 7: Commit**

Run:
`git add src/app/decks src/app/study src/components`
`git commit -m "feat: build deck card UI and flashcard study screen"`

### Task 7: Configure PWA for iPhone Installability

**Files:**
- Modify: `next.config.ts`
- Create: `public/manifest.webmanifest`
- Create: `public/icons/icon-192.png`
- Create: `public/icons/icon-512.png`
- Create: `src/app/offline/page.tsx`
- Modify: `src/app/layout.tsx`
- Test: `e2e/pwa-installability.spec.ts`

- [ ] **Step 1: Write failing PWA e2e smoke**

Check:
- manifest available
- service worker registered in production build

- [ ] **Step 2: Verify RED**

Run: `npm run test:e2e -- e2e/pwa-installability.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement minimal PWA config**

Use `next-pwa` with:
- runtime caching for static assets only
- no offline data sync

- [ ] **Step 4: Add manifest metadata for iPhone Add to Home Screen**

Include app name, start URL, display mode, icons.

- [ ] **Step 5: Re-run PWA e2e**

Run: `npm run test:e2e -- e2e/pwa-installability.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

Run:
`git add next.config.ts public src/app/offline e2e/pwa-installability.spec.ts`
`git commit -m "feat: enable installable PWA shell for iPhone"`

### Task 8: Final Verification, Docs, and Deployment Checklist

**Files:**
- Create: `.env.example`
- Create: `README.md`
- Create: `docs/deploy/vercel-supabase-mvp.md`

- [ ] **Step 1: Add environment template**

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 2: Add runbook docs**

Include:
- local setup
- migration application
- import file format rules
- iPhone install steps

- [ ] **Step 3: Run full unit/integration suite**

Run: `npm run test`
Expected: PASS (0 failures).

- [ ] **Step 4: Run lint**

Run: `npm run lint`
Expected: PASS (0 errors).

- [ ] **Step 5: Run production build**

Run: `npm run build`
Expected: PASS (exit code 0).

- [ ] **Step 6: Run e2e smoke**

Run: `npm run test:e2e`
Expected: PASS.

- [ ] **Step 7: Commit**

Run:
`git add .`
`git commit -m "docs: add deployment checklist and environment setup guide"`

- [ ] **Step 8: Request code review before merge**

Use @superpowers:requesting-code-review after collecting `BASE_SHA` and `HEAD_SHA`.

- [ ] **Step 9: Complete branch workflow**

Use @superpowers:finishing-a-development-branch.

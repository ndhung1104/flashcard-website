# Study Mastery + Quiz Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add mastery-based study actions (`Hoc lai`, `Da biet`) and a multiple-choice quiz mode with level-based scoring and learn-engine card selection priority.

**Architecture:** Extend `cards` with mastery metadata, keep scoring and learn-engine decisions on server APIs, and keep client as UI + state orchestration. Study and Quiz will both update card mastery through explicit endpoints so logic is centralized and consistent.

**Tech Stack:** React + React Router + Vite, Vercel Functions (`api/*`), Supabase Postgres, Vitest + Testing Library.

---

## File Structure (Planned Changes)

- Modify: `supabase/init.sql`
- Modify: `src/app/types.ts`
- Modify: `server/repositories/cards.ts`
- Create: `server/learn-engine.ts`
- Create: `server/mastery.ts`
- Create: `api/cards/[cardId]/mastery.ts`
- Create: `api/learn/queue.ts`
- Create: `api/quiz/next.ts`
- Create: `api/quiz/answer.ts`
- Modify: `src/app/hooks/useCards.ts`
- Create: `src/app/hooks/useLearnEngine.ts`
- Create: `src/app/hooks/useQuiz.ts`
- Modify: `src/app/screens/StudyMode.tsx`
- Create: `src/app/screens/QuizMode.tsx`
- Modify: `src/app/routes.tsx`
- Modify: `src/app/screens/Dashboard.tsx`
- Create: `server/__tests__/mastery.spec.ts`
- Create: `server/__tests__/learn-engine.spec.ts`
- Create: `api/quiz/__tests__/contracts.spec.ts`
- Modify: `src/app/__tests__/smoke.spec.tsx`
- Modify: `README.md`
- Modify: `docs/plans/traceability/2026-03-19-mvp-traceability.md`

### Task 1: Data Model for Mastery Levels

**Files:**
- Modify: `supabase/init.sql`
- Modify: `src/app/types.ts`

- [ ] **Step 1: Add mastery columns in SQL**
Add to `cards`:
`mastery_level integer not null default 0 check (mastery_level between 0 and 3)`
`last_reviewed_at timestamptz null`
`next_review_at timestamptz null`

- [ ] **Step 2: Backfill existing rows safely**
Set `mastery_level = 1` for cards currently `is_unfamiliar = true`, else `0`.

- [ ] **Step 3: Expose mastery fields in frontend types**
`Card` includes `masteryLevel`, `lastReviewedAt`, `nextReviewAt`.

- [ ] **Step 4: Verify SQL is idempotent**
Run SQL in Supabase editor twice; expected second run no destructive errors.

### Task 2: Mastery Scoring Rules in Server Core

**Files:**
- Create: `server/mastery.ts`
- Create: `server/__tests__/mastery.spec.ts`

- [ ] **Step 1: Write failing unit tests for mastery transitions**
Cases:
- `Hoc lai` => set level to 1
- `Da biet` (study self-recall) => set level to 3
- Quiz correct: +1 up to 3
- Quiz wrong: reset to 1

- [ ] **Step 2: Implement deterministic transition functions**
Functions:
- `applyStudyRecallResult(currentLevel, action)`
- `applyQuizResult(currentLevel, isCorrect)`

- [ ] **Step 3: Add scheduling helper for level 3**
Set `next_review_at` to future window (e.g. now + 3 days) when reaching level 3.

- [ ] **Step 4: Run tests**
Run: `npm test -- server/__tests__/mastery.spec.ts`
Expected: PASS.

### Task 3: Learn Engine Priority Selector

**Files:**
- Create: `server/learn-engine.ts`
- Create: `server/__tests__/learn-engine.spec.ts`

- [ ] **Step 1: Write failing tests for queue priority**
Rules:
- Prefer level 1 + 2 heavily
- Occasionally include level 0
- Exclude level 3 by default
- Include level 3 only when `includeMastered=true`

- [ ] **Step 2: Implement weighted selection**
Baseline weights:
- level 1: 50%
- level 2: 35%
- level 0: 15%
- level 3: 0% (default)

- [ ] **Step 3: Add deterministic option for tests**
Inject RNG seed/stub in test mode to avoid flaky tests.

- [ ] **Step 4: Run tests**
Run: `npm test -- server/__tests__/learn-engine.spec.ts`
Expected: PASS.

### Task 4: API Endpoints for Study + Quiz Decisions

**Files:**
- Modify: `server/repositories/cards.ts`
- Create: `api/cards/[cardId]/mastery.ts`
- Create: `api/learn/queue.ts`
- Create: `api/quiz/next.ts`
- Create: `api/quiz/answer.ts`
- Create: `api/quiz/__tests__/contracts.spec.ts`

- [ ] **Step 1: Extend card repository selects/updates**
Include mastery fields in card read/write paths.

- [ ] **Step 2: Add study mastery action endpoint**
`PATCH /api/cards/:cardId/mastery`
Body:
- `{ action: 'relearn' }` => level 1
- `{ action: 'known' }` => level 3

- [ ] **Step 3: Add learn queue endpoint**
`GET /api/learn/queue?deckId=...&includeMastered=false`
Returns ordered card ids for current session.

- [ ] **Step 4: Add quiz next question endpoint**
`GET /api/quiz/next?deckId=...`
Returns one question with 4 options.

- [ ] **Step 5: Add quiz answer endpoint**
`POST /api/quiz/answer`
Body: `{ deckId, cardId, selectedMeaning }`
Server validates correctness and applies mastery transition.

- [ ] **Step 6: Add API contract tests**
Run: `npm test -- api/quiz/__tests__/contracts.spec.ts`
Expected: PASS.

### Task 5: Study Mode UX with Two Mastery Buttons

**Files:**
- Create: `src/app/hooks/useLearnEngine.ts`
- Modify: `src/app/hooks/useCards.ts`
- Modify: `src/app/screens/StudyMode.tsx`

- [ ] **Step 1: Add client action wrappers**
Methods:
- `markRelearn(cardId)` => call mastery action `relearn`
- `markKnown(cardId)` => call mastery action `known`

- [ ] **Step 2: Update Study UI flow**
Front card: user self-recalls meaning.
After flip: show 2 CTA buttons:
- `? Hoc lai (Chua thuoc)`
- `? Da biet (Thuoc)`

- [ ] **Step 3: Apply immediate session filtering**
When card hits level 3, remove from current study queue (unless include mastered mode).

- [ ] **Step 4: Keep fallback controls**
Retain Prev/Next navigation and progress updates against active queue.

### Task 6: Multiple-Choice Quiz Mode

**Files:**
- Create: `src/app/hooks/useQuiz.ts`
- Create: `src/app/screens/QuizMode.tsx`
- Modify: `src/app/routes.tsx`
- Modify: `src/app/screens/Dashboard.tsx`

- [ ] **Step 1: Add Quiz route**
`/quiz/:deckId` with dedicated screen.

- [ ] **Step 2: Render MCQ interaction**
Display term + 4 choices; submit one answer; show result feedback.

- [ ] **Step 3: Wire scoring to server**
On answer submit, call `/api/quiz/answer`, then fetch next question.

- [ ] **Step 4: Show mastery progress summary**
Session counters: correct, wrong, upgraded to level 3.

### Task 7: Regression + Behavior Tests

**Files:**
- Modify: `src/app/__tests__/smoke.spec.tsx`
- Create: `src/app/screens/__tests__/study-mastery.spec.tsx`
- Create: `src/app/screens/__tests__/quiz-mode.spec.tsx`

- [ ] **Step 1: Add failing UI tests**
Study: flip then show `Hoc lai` and `Da biet` buttons.
Quiz: selecting answer triggers feedback and next question load.

- [ ] **Step 2: Implement minimal UI adjustments until tests pass**
Run: `npm test`
Expected: all tests pass.

- [ ] **Step 3: Verify production build**
Run: `npm run build`
Expected: pass.

### Task 8: Docs and Operational Notes

**Files:**
- Modify: `README.md`
- Modify: `docs/plans/traceability/2026-03-19-mvp-traceability.md`

- [ ] **Step 1: Document mastery algorithm**
Include level transitions and penalty behavior.

- [ ] **Step 2: Document learn-engine behavior**
Explain priority levels and `includeMastered` override.

- [ ] **Step 3: Document quiz flow**
Question generation, answer validation, scoring updates.

## Commit Plan (One Commit Per Task)

1. `feat(db): add mastery columns and card type contracts`
2. `feat(engine): add mastery transition rules with tests`
3. `feat(engine): implement learn queue weighting and tests`
4. `feat(api): add mastery and quiz endpoints`
5. `feat(study): add relearn and known actions in study mode`
6. `feat(quiz): add multiple choice quiz screen and routing`
7. `test(ui): add study and quiz behavior coverage`
8. `docs: describe mastery and learn-engine logic`

## Acceptance Criteria (New Scope)

- Study mode shows two post-flip buttons: `Hoc lai` and `Da biet`.
- `Hoc lai` sets `mastery_level = 1`.
- `Da biet` sets `mastery_level = 3` and card is skipped by default in next picks.
- Quiz mode exists and updates mastery with rule:
  - Correct quiz answer: +1 level up to 3
  - Wrong quiz answer: reset to 1
- Learn engine prioritizes levels 1 and 2, occasionally includes level 0, excludes level 3 by default.
- All tests and build pass.

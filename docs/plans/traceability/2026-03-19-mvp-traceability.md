# MVP Traceability (2026-03-19)

Spec source: `docs/specs/2026-03-18-flashcard-mvp-design.md`

## Acceptance Criteria Mapping

1. Multiple decks supported.
Target: `api/decks/index.ts`, `src/app/screens/Dashboard.tsx`.
Status: Implemented.

2. Import `.xlsx` and `.csv` with fixed `term` + `meaning` schema.
Target: `api/import/index.ts` (to implement), `src/app/components/ImportModal.tsx`.
Status: Implemented.

3. Duplicate terms in same deck are skipped and counted.
Target: `server/import/service.ts` + DB unique index on `(deck_id, normalized_term)`.
Status: Implemented.

4. Default tag applied to imported cards.
Target: tag/card_tag model + import service.
Status: Implemented.

5. Study cards in 2-sided flip view.
Target: `src/app/screens/StudyMode.tsx`.
Status: Present.

6. Mark/unmark unfamiliar cards manually.
Target: dedicated card unfamiliar API + UI toggles.
Status: Implemented (`/api/cards/:cardId/unfamiliar`).

7. Filter by tag and unfamiliar status.
Target: `api/cards/index.ts` + deck details UI.
Status: Implemented.

8. Installable PWA on iPhone with basic app shell cache.
Target: `public/manifest.webmanifest`, `public/sw.js`, `index.html`.
Status: Implemented.

## Extension Traceability (Study Mastery + Quiz)

Source: `docs/plans/2026-03-19-study-mastery-quiz-plan.md`

1. Study mode shows post-flip actions `Hoc lai` and `Da biet`.
Target: `src/app/screens/StudyMode.tsx`, `src/app/screens/__tests__/study-mastery.spec.tsx`.
Status: Implemented.

2. `Hoc lai` sets `mastery_level = 1`.
Target: `api/cards/[cardId]/mastery.ts`, `server/mastery.ts`.
Status: Implemented.

3. `Da biet` sets `mastery_level = 3` and schedules later review.
Target: `server/mastery.ts`, `server/repositories/cards.ts`.
Status: Implemented (`next_review_at = now + 3 days`).

4. Quiz mode endpoint + UI flow exist.
Target: `api/quiz/next.ts`, `api/quiz/answer.ts`, `src/app/screens/QuizMode.tsx`.
Status: Implemented.

5. Quiz scoring rules are server-controlled.
Target: `server/mastery.ts`, `api/quiz/answer.ts`, `server/__tests__/mastery.spec.ts`.
Status: Implemented.

6. Learn queue prioritizes level 1 and 2, occasionally level 0, excludes level 3 by default.
Target: `server/learn-engine.ts`, `api/learn/queue.ts`, `server/__tests__/learn-engine.spec.ts`.
Status: Implemented.

7. Include mastered cards only when requested.
Target: `api/learn/queue.ts`, `api/quiz/next.ts`.
Status: Implemented via `includeMastered=true`.

# MVP Traceability (2026-03-19)

Spec source: `docs/specs/2026-03-18-flashcard-mvp-design.md`

## Acceptance Criteria Mapping

1. Multiple decks supported.
Target: `api/decks/index.ts`, `src/app/screens/Dashboard.tsx`.
Status: Partial (CRUD exists; contract tests added).

2. Import `.xlsx` and `.csv` with fixed `term` + `meaning` schema.
Target: `api/import/index.ts` (to implement), `src/app/components/ImportModal.tsx`.
Status: Gap (server import endpoint not implemented yet).

3. Duplicate terms in same deck are skipped and counted.
Target: `server/import/service.ts` + DB unique index on `(deck_id, normalized_term)`.
Status: Gap (current dedupe mostly client-side).

4. Default tag applied to imported cards.
Target: tag/card_tag model + import service.
Status: Gap.

5. Study cards in 2-sided flip view.
Target: `src/app/screens/StudyMode.tsx`.
Status: Present.

6. Mark/unmark unfamiliar cards manually.
Target: dedicated card unfamiliar API + UI toggles.
Status: Partial (works via full deck patch; needs endpoint split).

7. Filter by tag and unfamiliar status.
Target: `api/cards/index.ts` + deck details UI.
Status: Partial (UI filter exists, API boundary not split).

8. Installable PWA on iPhone with basic app shell cache.
Target: `public/manifest.webmanifest`, `public/sw.js`, `index.html`.
Status: Gap.

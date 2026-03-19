# Flashcard Website MVP Design (Module 1 + Module 5)

**Date:** 2026-03-18  
**Branch:** `feature/flashcard-app`  
**Tech Direction:** Next.js + Supabase + Vercel + PWA

## 1. Scope and Decomposition

This project is large and must be split into modules:

1. Core Flashcard + Import Excel/CSV + Dedupe  
2. Learn Mode (adaptive mastery engine)  
3. Test Mode (exam generation + scoring + report)  
4. Match Game  
5. PWA + Deploy + extension points for pronunciation

MVP for this phase includes:

- Module 1 (Core + Import + Dedupe + tags/filter + manual unfamiliar flag)
- Module 5 (PWA installable on iPhone with basic app shell caching; network required for data)

Out of MVP:

- Mastery level and adaptive Learn Engine (moved to Module 2)
- Test Mode and Match Mode
- Authentication/account system

## 2. Product Requirements (MVP)

- No login required.
- Multiple decks supported.
- Tags and tag filtering supported.
- Flashcard has 2 sides (`term` and `meaning`), click/tap to flip.
- Import supports `.xlsx` and `.csv`.
- Fixed import schema: `term`, `meaning`.
- Dedupe rule: duplicate by `term` within the same deck only.
- Duplicate policy: keep first record, skip later duplicates.
- Import applies one default tag to all imported cards.
- Manual unfamiliar workflow: `mark_unfamiliar` toggle per card.

## 3. Architecture

- **Frontend:** Next.js App Router pages/components.
- **Backend:** Next.js Route Handlers or Server Actions for deck/tag/card/import operations.
- **Database:** Supabase Postgres.
- **Hosting:** Vercel.
- **PWA:** manifest + service worker for installability and app shell cache.

Chosen implementation direction: server-first import with DB-level uniqueness constraint.

## 4. Data Model

### `decks`

- `id` (uuid, pk)
- `name` (text, required)
- `description` (text, nullable)
- `created_at` (timestamp)

### `tags`

- `id` (uuid, pk)
- `deck_id` (uuid, fk -> decks.id)
- `name` (text, required)
- `created_at` (timestamp)
- unique: (`deck_id`, `name`)

### `cards`

- `id` (uuid, pk)
- `deck_id` (uuid, fk -> decks.id)
- `term` (text, required)
- `meaning` (text, required)
- `normalized_term` (text, required)
- `mark_unfamiliar` (boolean, default false)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- unique: (`deck_id`, `normalized_term`)

Normalization for `normalized_term` in MVP:

- trim
- lowercase
- collapse internal whitespace

### `card_tags`

- `card_id` (uuid, fk -> cards.id)
- `tag_id` (uuid, fk -> tags.id)
- unique: (`card_id`, `tag_id`)

### `import_jobs`

- `id` (uuid, pk)
- `deck_id` (uuid, fk -> decks.id)
- `filename` (text)
- `total_rows` (int)
- `inserted_rows` (int)
- `duplicate_rows` (int)
- `failed_rows` (int)
- `created_at` (timestamp)

## 5. Import and Data Flow

1. User selects deck.
2. User uploads `.xlsx` or `.csv`.
3. User selects one default tag for that import.
4. Server parses file and validates required columns (`term`, `meaning`).
5. Server normalizes `term` into `normalized_term`.
6. Server inserts cards in batches with conflict handling on (`deck_id`, `normalized_term`):
   - if conflict: skip row and count duplicate
7. Server creates `card_tags` relations for successfully inserted cards.
8. Server records `import_jobs` summary.
9. UI shows import report (total, inserted, duplicate, failed).

## 6. API/UI Boundaries

## Deck

- Create deck
- Update deck name/description
- List decks

## Tag

- Create tag inside a deck
- List tags by deck

## Card

- List cards by deck
- Filter cards by tag
- Filter cards by `mark_unfamiliar`
- Toggle `mark_unfamiliar`

## Import

- Accept file + `deck_id` + `default_tag`
- Return import summary report

## Study (basic flashcard)

- Show card face
- Flip card on click/tap
- Next/previous card navigation
- Mark/unmark unfamiliar directly from study/list views

## 7. Error Handling

### File-level errors

- Unsupported extension -> reject with clear error
- Missing `term` or `meaning` columns -> reject import
- Empty file/no valid rows -> reject import

### Row-level errors

- Empty `term` or `meaning` -> count in `failed_rows`, continue processing

### Duplicate handling

- Duplicate within same deck -> skip and count in `duplicate_rows`

### System errors

- Parse/database errors -> return safe message + log on server side

### UX behavior

- Partial success is allowed (some rows inserted, some failed/skipped)
- User always gets summary report

## 8. Testing Strategy

### Unit tests

- `normalizeTerm()` behavior
- Parser behavior for `.xlsx` and `.csv`
- Required column validation

### Integration tests

- Successful import for valid file
- Duplicate skipping counts are correct
- Failed row counts are correct
- Tag assignment is applied to imported cards
- Card filters by tag and unfamiliar flag work
- Toggle unfamiliar updates correctly

### E2E smoke

- Create deck
- Create tag
- Import file
- Verify import report
- Open study view and flip cards
- Toggle unfamiliar and filter by unfamiliar

### PWA checks

- Manifest valid
- Service worker active
- iPhone "Add to Home Screen" works
- App shell reload works with cache (data requests still require network)

## 9. PWA and Deployment Scope (MVP)

- Deploy on Vercel.
- Configure Supabase environment variables.
- Enable installable PWA behavior for iPhone.
- Cache static shell assets only.
- Keep online data model (no offline sync in MVP).

## 10. Extension Points (Post-MVP)

Prepare future pronunciation support without implementing now:

- Add optional fields in code contracts for audio/tts metadata.
- Keep service abstraction point for pronunciation provider integration.

Future modules:

- Module 2: Mastery level (`0-3`) + adaptive Learn Engine
- Module 3: Test Mode
- Module 4: Match Game

## 11. Acceptance Criteria for MVP

- User can manage multiple decks.
- User can import `.xlsx` and `.csv` with fixed `term` + `meaning` schema.
- Duplicate terms in same deck are skipped and counted.
- Default tag is applied to imported cards.
- User can study cards in 2-sided flip view.
- User can manually mark/unmark unfamiliar cards.
- User can filter by tag and unfamiliar status.
- App is installable as PWA on iPhone with basic app shell caching.

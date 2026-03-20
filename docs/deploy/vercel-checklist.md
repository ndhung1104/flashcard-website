# Vercel Deployment Checklist

## 1. Supabase

- [ ] Supabase project created
- [ ] `supabase/init.sql` executed successfully
- [ ] Email auth provider enabled (for login/signup)

## 2. Vercel Project

- [ ] Repository connected to Vercel
- [ ] Build command: `npm run build`
- [ ] Output: `dist`
- [ ] Framework preset: Vite

## 3. Environment Variables (Vercel)

Set for **Production + Preview + Development**:

- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `GOOGLE_DRIVE_CLIENT_ID`
- [ ] `GOOGLE_DRIVE_CLIENT_SECRET`
- [ ] `GOOGLE_DRIVE_REFRESH_TOKEN`
- [ ] `DRIVE_SYNC_CRON_KEY` (optional if using Vercel cron header only)

## 4. Deploy Verification

- [ ] `/api/auth/signup` and `/api/auth/login` return expected responses
- [ ] `/api/decks` requires auth and returns deck list after login
- [ ] `/api/cards?deckId=...` returns cards
- [ ] `/api/import` accepts `.csv` / `.xlsx` and returns report
- [ ] `/api/import?action=drive-sources&deckId=...` returns source list
- [ ] `/api/import?action=drive-sync-now` syncs Drive sources
- [ ] Dashboard, Deck Details, Study screens work end-to-end

## 5. PWA Verification

- [ ] `manifest.webmanifest` loads
- [ ] `sw.js` registers successfully in browser
- [ ] iPhone Add to Home Screen works
- [ ] App shell assets cache works after reload

## 6. Release Gate

Before promoting to production:

- [ ] `npm test` passes
- [ ] `npm run build` passes
- [ ] Vercel deployment has no function crash logs
- [ ] Supabase RLS policies active and data scoped by authenticated user

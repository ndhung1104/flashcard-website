# Google Drive Auto Import Setup

This project can auto-import Excel/Google Sheet data into decks via `/api/import`.

## 1. Google Cloud setup

1. Create/select a Google Cloud project.
2. Enable **Google Drive API**.
3. Configure **OAuth consent screen** (External or Internal).
4. Create OAuth client:
   - Type: **Web application**
   - Add redirect URI: `https://developers.google.com/oauthplayground`
5. Save `Client ID` and `Client Secret`.

## 2. Generate refresh token

Use OAuth Playground:

1. Open https://developers.google.com/oauthplayground
2. Click settings icon (top right), enable:
   - **Use your own OAuth credentials**
   - Enter your client id/secret.
3. In step 1, add scope:
   - `https://www.googleapis.com/auth/drive.readonly`
4. Authorize and exchange code for tokens.
5. Copy the **refresh_token** value.

## 3. Configure env vars

Set these on local `.env` and Vercel:

- `GOOGLE_DRIVE_CLIENT_ID`
- `GOOGLE_DRIVE_CLIENT_SECRET`
- `GOOGLE_DRIVE_REFRESH_TOKEN`
- `DRIVE_SYNC_CRON_KEY` (optional, used for manual cron key auth)

Also keep existing Supabase env vars.

## 4. Configure source in app

1. Open a deck -> **Import** modal.
2. In **Auto Import from Google Drive**:
   - Enter `Drive File ID`
   - Enter `Sheet Name`
   - Choose default tag
3. Click **Save Source**.
4. Click **Sync Now** to test.

## 5. Vercel cron

`vercel.json` already includes:

- `/api/import?action=drive-sync-cron`
- every 30 minutes

After deploy, Vercel will call this endpoint automatically.

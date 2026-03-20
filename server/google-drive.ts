import { getServerEnv } from './env.js';

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3/files';
const GOOGLE_SHEETS_MIME = 'application/vnd.google-apps.spreadsheet';
const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export interface DriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string | null;
}

export interface DownloadedDriveFile {
  metadata: DriveFileMetadata;
  fileName: string;
  buffer: Buffer;
}

function requireDriveOAuthEnv() {
  const env = getServerEnv();

  if (
    !env.googleDriveClientId ||
    !env.googleDriveClientSecret ||
    !env.googleDriveRefreshToken
  ) {
    throw new Error(
      'Missing Google Drive OAuth env vars: GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN'
    );
  }

  return env;
}

function normalizeFileName(fileName: string, mimeType: string): string {
  const trimmed = fileName.trim();
  if (!trimmed) {
    if (mimeType === GOOGLE_SHEETS_MIME) {
      return 'drive-sheet.xlsx';
    }
    return 'drive-file.xlsx';
  }

  if (mimeType === GOOGLE_SHEETS_MIME && !trimmed.toLowerCase().endsWith('.xlsx')) {
    return `${trimmed}.xlsx`;
  }

  return trimmed;
}

async function requestDriveAccessToken(): Promise<string> {
  const env = requireDriveOAuthEnv();

  const form = new URLSearchParams();
  form.set('client_id', env.googleDriveClientId);
  form.set('client_secret', env.googleDriveClientSecret);
  form.set('refresh_token', env.googleDriveRefreshToken);
  form.set('grant_type', 'refresh_token');

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok || typeof payload.access_token !== 'string') {
    const reason =
      typeof payload.error_description === 'string'
        ? payload.error_description
        : 'Failed to refresh Drive access token';
    throw new Error(reason);
  }

  return payload.access_token;
}

async function driveGetJson<T>(accessToken: string, url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const reason =
      payload &&
      typeof payload === 'object' &&
      'error' in payload &&
      payload.error &&
      typeof (payload.error as any).message === 'string'
        ? (payload.error as any).message
        : `Drive API failed (${response.status})`;
    throw new Error(reason);
  }

  return payload as T;
}

async function driveGetBinary(accessToken: string, url: string): Promise<Buffer> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Drive download failed (${response.status})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function getDriveFileMetadata(fileId: string): Promise<DriveFileMetadata> {
  const accessToken = await requestDriveAccessToken();

  const metadata = await driveGetJson<DriveFileMetadata>(
    accessToken,
    `${GOOGLE_DRIVE_API_BASE}/${encodeURIComponent(
      fileId
    )}?fields=id,name,mimeType,modifiedTime`
  );

  return {
    id: metadata.id,
    name: metadata.name ?? '',
    mimeType: metadata.mimeType ?? '',
    modifiedTime:
      typeof metadata.modifiedTime === 'string' ? metadata.modifiedTime : null,
  };
}

export async function downloadDriveFile(fileId: string): Promise<DownloadedDriveFile> {
  const accessToken = await requestDriveAccessToken();

  const metadata = await driveGetJson<DriveFileMetadata>(
    accessToken,
    `${GOOGLE_DRIVE_API_BASE}/${encodeURIComponent(
      fileId
    )}?fields=id,name,mimeType,modifiedTime`
  );

  const isGoogleSheet = metadata.mimeType === GOOGLE_SHEETS_MIME;
  const downloadUrl = isGoogleSheet
    ? `${GOOGLE_DRIVE_API_BASE}/${encodeURIComponent(
        fileId
      )}/export?mimeType=${encodeURIComponent(XLSX_MIME)}`
    : `${GOOGLE_DRIVE_API_BASE}/${encodeURIComponent(fileId)}?alt=media`;

  const buffer = await driveGetBinary(accessToken, downloadUrl);
  const normalizedMetadata: DriveFileMetadata = {
    id: metadata.id,
    name: metadata.name ?? '',
    mimeType: metadata.mimeType ?? '',
    modifiedTime:
      typeof metadata.modifiedTime === 'string' ? metadata.modifiedTime : null,
  };

  return {
    metadata: normalizedMetadata,
    fileName: normalizeFileName(normalizedMetadata.name, normalizedMetadata.mimeType),
    buffer,
  };
}

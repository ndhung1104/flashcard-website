import { readFile } from 'node:fs/promises';
import formidable, { type Fields, type Files, type File } from 'formidable';
import { requireAuth } from '../../server/auth.js';
import {
  getQueryParam,
  methodNotAllowed,
  parseJsonBody,
  sendJson,
} from '../../server/http.js';
import { createServiceClient, createUserClient } from '../../server/supabase.js';
import { downloadDriveFile } from '../../server/google-drive.js';
import { getServerEnv } from '../../server/env.js';
import { getWorkbookSheetNames, parseImportFile } from '../../server/import/parsers.js';
import { runDriveSync } from '../../server/import/drive-sync.js';
import { runImport } from '../../server/import/service.js';
import {
  listDriveImportSourcesByUser,
  listDriveImportSourcesForCron,
  upsertDriveImportSource,
} from '../../server/repositories/drive-import-sources.js';

function getStringField(fields: Fields, key: string): string {
  const value = fields[key];

  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0].trim() : '';
  }

  return typeof value === 'string' ? value.trim() : '';
}

function pickUploadedFile(files: Files): File | null {
  const candidate = files.file ?? files.upload ?? null;

  if (!candidate) {
    return null;
  }

  if (Array.isArray(candidate)) {
    return candidate[0] ?? null;
  }

  return candidate;
}

async function parseMultipart(req: any): Promise<{ fields: Fields; file: File | null }> {
  const form = formidable({
    multiples: false,
    maxFileSize: 20 * 1024 * 1024,
    allowEmptyFiles: false,
  });

  return await new Promise((resolve, reject) => {
    form.parse(req, (error, fields, files) => {
      if (error) {
        reject(error);
        return;
      }

      resolve({
        fields,
        file: pickUploadedFile(files),
      });
    });
  });
}

function getRequestAction(req: any): string {
  const action = getQueryParam(req, 'action');
  return action ? action.trim().toLowerCase() : '';
}

function getCronKey(req: any): string {
  const queryKey = getQueryParam(req, 'cronKey');
  if (queryKey) {
    return queryKey;
  }

  const headerKey = req?.headers?.['x-cron-key'];
  return typeof headerKey === 'string' ? headerKey.trim() : '';
}

async function handleManualUpload(req: any, res: any, auth: any) {
  const { fields, file } = await parseMultipart(req);

  const deckId = getStringField(fields, 'deckId');
  const defaultTag = getStringField(fields, 'defaultTag') || 'imported';

  if (!deckId) {
    sendJson(res, 400, {
      error: 'deckId is required',
      code: 'IMPORT_DECK_ID_REQUIRED',
    });
    return;
  }

  if (!file) {
    sendJson(res, 400, {
      error: 'Import file is required',
      code: 'IMPORT_FILE_REQUIRED',
    });
    return;
  }

  const fileName = file.originalFilename ?? file.newFilename ?? 'import-file';
  const buffer = await readFile(file.filepath);
  const rows = await parseImportFile(fileName, buffer);

  const supabase = createUserClient(auth.accessToken);
  const summary = await runImport({
    supabase,
    userId: auth.userId,
    deckId,
    defaultTag,
    fileName,
    rows,
  });

  sendJson(res, 200, {
    report: summary,
    code: 'IMPORT_SUCCESS',
  });
}

async function handleListDriveSources(req: any, res: any, auth: any) {
  const deckId = getQueryParam(req, 'deckId') ?? undefined;
  const supabase = createUserClient(auth.accessToken);
  const sources = await listDriveImportSourcesByUser(supabase, auth.userId, deckId);

  sendJson(res, 200, {
    sources,
    code: 'DRIVE_SOURCES_LIST_SUCCESS',
  });
}

async function handleDriveSheetNames(req: any, res: any, _auth: any) {
  const fileId = getQueryParam(req, 'fileId');
  if (!fileId) {
    sendJson(res, 400, {
      error: 'fileId is required',
      code: 'DRIVE_FILE_ID_REQUIRED',
    });
    return;
  }

  const downloaded = await downloadDriveFile(fileId);
  const sheets = await getWorkbookSheetNames(downloaded.fileName, downloaded.buffer);

  sendJson(res, 200, {
    fileName: downloaded.fileName,
    sheets,
    code: 'DRIVE_SHEET_LIST_SUCCESS',
  });
}

async function handleUpsertDriveSource(req: any, res: any, auth: any) {
  const body = await parseJsonBody(req);

  const deckId = typeof body.deckId === 'string' ? body.deckId.trim() : '';
  const fileId = typeof body.fileId === 'string' ? body.fileId.trim() : '';
  const sheetName =
    typeof body.sheetName === 'string' ? body.sheetName.trim() : '';
  const defaultTag =
    typeof body.defaultTag === 'string' && body.defaultTag.trim()
      ? body.defaultTag.trim()
      : 'imported';
  const isActive = body.isActive !== false;

  if (!deckId || !fileId || !sheetName) {
    sendJson(res, 400, {
      error: 'deckId, fileId and sheetName are required',
      code: 'DRIVE_SOURCE_VALIDATION_ERROR',
    });
    return;
  }

  const supabase = createUserClient(auth.accessToken);
  const source = await upsertDriveImportSource(supabase, {
    userId: auth.userId,
    deckId,
    fileId,
    sheetName,
    defaultTag,
    isActive,
  });

  sendJson(res, 200, {
    source,
    code: 'DRIVE_SOURCE_UPSERT_SUCCESS',
  });
}

async function handleDriveSyncNow(req: any, res: any, auth: any) {
  const body = await parseJsonBody(req);
  const deckId = typeof body.deckId === 'string' ? body.deckId.trim() : '';
  const sourceId = typeof body.sourceId === 'string' ? body.sourceId.trim() : '';
  const force = body.force === true;

  const supabase = createUserClient(auth.accessToken);
  const sources = await listDriveImportSourcesByUser(
    supabase,
    auth.userId,
    deckId || undefined
  );

  const scopedSources = sources.filter((source) => {
    if (!source.is_active) {
      return false;
    }
    if (sourceId && source.id !== sourceId) {
      return false;
    }
    return true;
  });

  if (scopedSources.length === 0) {
    sendJson(res, 200, {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      results: [],
      code: 'DRIVE_SYNC_NOTHING_TO_PROCESS',
    });
    return;
  }

  const result = await runDriveSync(supabase, scopedSources, { force });
  sendJson(res, 200, {
    ...result,
    code: 'DRIVE_SYNC_NOW_SUCCESS',
  });
}

async function handleDriveCronSync(req: any, res: any) {
  const env = getServerEnv();

  const providedKey = getCronKey(req);
  const cronHeader = req?.headers?.['x-vercel-cron'];
  const hasVercelCronHeader = typeof cronHeader === 'string' && cronHeader.length > 0;
  const isValidKey =
    Boolean(env.driveSyncCronKey) && providedKey === env.driveSyncCronKey;

  if (!hasVercelCronHeader && !isValidKey) {
    sendJson(res, 401, {
      error: 'Invalid cron authentication',
      code: 'DRIVE_SYNC_CRON_UNAUTHORIZED',
    });
    return;
  }

  const supabase = createServiceClient();
  const sources = await listDriveImportSourcesForCron(supabase);
  const result = await runDriveSync(supabase, sources);

  sendJson(res, 200, {
    ...result,
    code: 'DRIVE_SYNC_CRON_SUCCESS',
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    methodNotAllowed(res, ['GET', 'POST']);
    return;
  }

  const action = getRequestAction(req);

  try {
    if (req.method === 'GET' && action === 'drive-sync-cron') {
      await handleDriveCronSync(req, res);
      return;
    }

    const auth = await requireAuth(req, res);
    if (!auth) {
      sendJson(res, 401, { error: 'Unauthorized', code: 'AUTH_UNAUTHORIZED' });
      return;
    }

    if (req.method === 'GET') {
      if (action === 'drive-sources') {
        await handleListDriveSources(req, res, auth);
        return;
      }

      if (action === 'drive-sheets') {
        await handleDriveSheetNames(req, res, auth);
        return;
      }

      sendJson(res, 404, {
        error: 'Import action not found',
        code: 'IMPORT_ACTION_NOT_FOUND',
      });
      return;
    }

    if (action === 'drive-source-upsert') {
      await handleUpsertDriveSource(req, res, auth);
      return;
    }

    if (action === 'drive-sync-now') {
      await handleDriveSyncNow(req, res, auth);
      return;
    }

    if (action && action !== '') {
      sendJson(res, 404, {
        error: 'Import action not found',
        code: 'IMPORT_ACTION_NOT_FOUND',
      });
      return;
    }

    await handleManualUpload(req, res, auth);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to import file';

    sendJson(res, 400, {
      error: message,
      code: 'IMPORT_FAILED',
    });
    return;
  }
}

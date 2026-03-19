import { readFile } from 'node:fs/promises';
import formidable, { type Fields, type Files, type File } from 'formidable';
import { requireAuth } from '../../server/auth.js';
import { methodNotAllowed, sendJson } from '../../server/http.js';
import { createUserClient } from '../../server/supabase.js';
import { parseImportFile } from '../../server/import/parsers.js';
import { runImport } from '../../server/import/service.js';

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

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  const auth = await requireAuth(req, res);
  if (!auth) {
    sendJson(res, 401, { error: 'Unauthorized', code: 'AUTH_UNAUTHORIZED' });
    return;
  }

  try {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to import file';

    sendJson(res, 400, {
      error: message,
      code: 'IMPORT_FAILED',
    });
  }
}

import { requireAuth } from '../../server/auth.js';
import { methodNotAllowed, sendJson } from '../../server/http.js';

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

  sendJson(res, 501, {
    error: 'Import endpoint will be implemented in the next task',
    code: 'IMPORT_NOT_IMPLEMENTED',
  });
}

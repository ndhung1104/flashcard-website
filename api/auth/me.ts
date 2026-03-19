import { requireAuth } from '../../server/auth.js';
import { methodNotAllowed, sendJson } from '../../server/http.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET']);
    return;
  }

  const auth = await requireAuth(req, res);
  if (!auth) {
    sendJson(res, 401, {
      error: 'Unauthorized',
      code: 'AUTH_UNAUTHORIZED',
    });
    return;
  }

  sendJson(res, 200, {
    code: 'AUTH_ME_SUCCESS',
    user: {
      id: auth.userId,
      email: auth.email,
    },
  });
}


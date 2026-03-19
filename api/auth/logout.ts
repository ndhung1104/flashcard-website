import { clearAuthCookies } from '../../server/cookies.js';
import { methodNotAllowed, sendJson } from '../../server/http.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  clearAuthCookies(res);
  sendJson(res, 200, {
    success: true,
    code: 'AUTH_LOGOUT_SUCCESS',
  });
}


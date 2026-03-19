import { clearAuthCookies } from '../../server/cookies';
import { methodNotAllowed, sendJson } from '../../server/http';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  clearAuthCookies(res);
  sendJson(res, 200, { success: true });
}

import { setAuthCookies } from '../../server/cookies';
import { toPublicUser } from '../../server/auth';
import { methodNotAllowed, parseJsonBody, sendJson } from '../../server/http';
import { createAnonClient } from '../../server/supabase';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  try {
    const body = await parseJsonBody(req);
    const email =
      typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !password) {
      sendJson(res, 400, { error: 'Email and password are required' });
      return;
    }

    const supabase = createAnonClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session || !data.user) {
      sendJson(res, 401, { error: error?.message ?? 'Invalid credentials' });
      return;
    }

    setAuthCookies(res, data.session);
    sendJson(res, 200, { user: toPublicUser(data.user) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to sign in';
    sendJson(res, 500, { error: message });
  }
}

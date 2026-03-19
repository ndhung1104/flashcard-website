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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      sendJson(res, 400, { error: error.message });
      return;
    }

    if (data.session) {
      setAuthCookies(res, data.session);
    }

    sendJson(res, 200, {
      user: data.session && data.user ? toPublicUser(data.user) : null,
      emailConfirmationRequired: !data.session,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to sign up';
    sendJson(res, 500, { error: message });
  }
}

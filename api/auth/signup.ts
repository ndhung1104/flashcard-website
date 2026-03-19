import { setAuthCookies } from '../../server/cookies.js';
import { toPublicUser } from '../../server/auth.js';
import { methodNotAllowed, parseJsonBody, sendJson } from '../../server/http.js';
import { createAnonClient } from '../../server/supabase.js';

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
    const hasSupabaseEnv = Boolean(
      process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
    );

    console.log('[Auth Signup] Request received', {
      method: req.method,
      hasEmail: Boolean(email),
      hasPassword: Boolean(password),
      hasSupabaseEnv,
      vercelEnv: process.env.VERCEL_ENV ?? 'local',
    });

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
    console.error('[Auth Signup] Unexpected error', error);
    const message =
      error instanceof Error ? error.message : 'Failed to sign up';
    const code =
      typeof message === 'string' &&
      message.includes('Missing required environment variable')
        ? 'ENV_CONFIG_ERROR'
        : 'AUTH_SIGNUP_UNEXPECTED_ERROR';
    sendJson(res, 500, { error: message, code });
  }
}


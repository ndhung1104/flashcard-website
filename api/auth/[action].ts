import { requireAuth, toPublicUser } from '../../server/auth.js';
import { clearAuthCookies, setAuthCookies } from '../../server/cookies.js';
import { methodNotAllowed, parseJsonBody, sendJson } from '../../server/http.js';
import { createAnonClient } from '../../server/supabase.js';

function getAction(req: any): string {
  const rawAction = req?.query?.action;

  if (Array.isArray(rawAction)) {
    return String(rawAction[0] ?? '').trim().toLowerCase();
  }

  return typeof rawAction === 'string' ? rawAction.trim().toLowerCase() : '';
}

async function handleLogin(req: any, res: any) {
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

    console.log('[Auth Login] Request received', {
      method: req.method,
      hasEmail: Boolean(email),
      hasPassword: Boolean(password),
      hasSupabaseEnv,
      vercelEnv: process.env.VERCEL_ENV ?? 'local',
    });

    if (!email || !password) {
      sendJson(res, 400, {
        error: 'Email and password are required',
        code: 'AUTH_VALIDATION_ERROR',
      });
      return;
    }

    const supabase = createAnonClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session || !data.user) {
      sendJson(res, 401, {
        error: error?.message ?? 'Invalid credentials',
        code: 'AUTH_INVALID_CREDENTIALS',
      });
      return;
    }

    setAuthCookies(res, data.session);
    sendJson(res, 200, {
      user: toPublicUser(data.user),
      code: 'AUTH_LOGIN_SUCCESS',
    });
  } catch (error) {
    console.error('[Auth Login] Unexpected error', error);
    const message =
      error instanceof Error ? error.message : 'Failed to sign in';
    const code =
      typeof message === 'string' &&
      message.includes('Missing required environment variable')
        ? 'ENV_CONFIG_ERROR'
        : 'AUTH_LOGIN_UNEXPECTED_ERROR';
    sendJson(res, 500, { error: message, code });
  }
}

async function handleSignup(req: any, res: any) {
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
      sendJson(res, 400, {
        error: 'Email and password are required',
        code: 'AUTH_VALIDATION_ERROR',
      });
      return;
    }

    const supabase = createAnonClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      sendJson(res, 400, {
        error: error.message,
        code: 'AUTH_SIGNUP_FAILED',
      });
      return;
    }

    if (data.session) {
      setAuthCookies(res, data.session);
    }

    sendJson(res, 200, {
      user: data.session && data.user ? toPublicUser(data.user) : null,
      emailConfirmationRequired: !data.session,
      code: 'AUTH_SIGNUP_SUCCESS',
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

async function handleMe(req: any, res: any) {
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

async function handleLogout(req: any, res: any) {
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

export default async function handler(req: any, res: any) {
  const action = getAction(req);

  if (action === 'login') {
    await handleLogin(req, res);
    return;
  }

  if (action === 'signup') {
    await handleSignup(req, res);
    return;
  }

  if (action === 'me') {
    await handleMe(req, res);
    return;
  }

  if (action === 'logout') {
    await handleLogout(req, res);
    return;
  }

  sendJson(res, 404, {
    error: 'Auth endpoint not found',
    code: 'AUTH_ROUTE_NOT_FOUND',
  });
}

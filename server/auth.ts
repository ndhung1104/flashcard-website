import { clearAuthCookies, readAuthCookies, setAuthCookies } from './cookies';
import { createAnonClient } from './supabase';

export interface AuthResult {
  userId: string;
  email: string | null;
  accessToken: string;
}

export function toPublicUser(user: any): { id: string; email: string | null } {
  return {
    id: String(user.id),
    email: typeof user.email === 'string' ? user.email : null,
  };
}

async function getUserByAccessToken(accessToken: string) {
  const supabase = createAnonClient();
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

async function refreshSession(refreshToken: string) {
  const supabase = createAnonClient();
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session || !data.user) {
    return null;
  }

  return data;
}

export async function requireAuth(req: any, res: any): Promise<AuthResult | null> {
  const { accessToken, refreshToken } = readAuthCookies(req);

  if (accessToken) {
    const user = await getUserByAccessToken(accessToken);
    if (user) {
      return {
        userId: String(user.id),
        email: typeof user.email === 'string' ? user.email : null,
        accessToken,
      };
    }
  }

  if (refreshToken) {
    const refreshed = await refreshSession(refreshToken);
    if (refreshed?.session && refreshed.user) {
      setAuthCookies(res, refreshed.session);
      return {
        userId: String(refreshed.user.id),
        email:
          typeof refreshed.user.email === 'string' ? refreshed.user.email : null,
        accessToken: refreshed.session.access_token,
      };
    }
  }

  clearAuthCookies(res);
  return null;
}

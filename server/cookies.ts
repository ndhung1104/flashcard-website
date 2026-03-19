import { parse as parseCookie, serialize as serializeCookie } from 'cookie';

const ACCESS_TOKEN_COOKIE = 'fc_access_token';
const REFRESH_TOKEN_COOKIE = 'fc_refresh_token';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function appendSetCookie(res: any, value: string) {
  const existing = res.getHeader('Set-Cookie');

  if (!existing) {
    res.setHeader('Set-Cookie', [value]);
    return;
  }

  const next = Array.isArray(existing) ? existing : [String(existing)];
  next.push(value);
  res.setHeader('Set-Cookie', next);
}

export function readAuthCookies(req: any): {
  accessToken: string | null;
  refreshToken: string | null;
} {
  const parsed = parseCookie(req.headers?.cookie ?? '');

  return {
    accessToken: parsed[ACCESS_TOKEN_COOKIE] ?? null,
    refreshToken: parsed[REFRESH_TOKEN_COOKIE] ?? null,
  };
}

export function setAuthCookies(res: any, session: any) {
  const accessToken =
    typeof session?.access_token === 'string' ? session.access_token : '';
  const refreshToken =
    typeof session?.refresh_token === 'string' ? session.refresh_token : '';

  if (!accessToken || !refreshToken) {
    return;
  }

  const accessTokenMaxAge =
    typeof session?.expires_in === 'number' && session.expires_in > 0
      ? session.expires_in
      : 60 * 60;

  const refreshTokenMaxAge = 60 * 60 * 24 * 30;

  appendSetCookie(
    res,
    serializeCookie(ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: 'lax',
      path: '/',
      maxAge: accessTokenMaxAge,
    })
  );

  appendSetCookie(
    res,
    serializeCookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: 'lax',
      path: '/',
      maxAge: refreshTokenMaxAge,
    })
  );
}

export function clearAuthCookies(res: any) {
  appendSetCookie(
    res,
    serializeCookie(ACCESS_TOKEN_COOKIE, '', {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
  );

  appendSetCookie(
    res,
    serializeCookie(REFRESH_TOKEN_COOKIE, '', {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
  );
}

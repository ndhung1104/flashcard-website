import loginHandler from '../login';
import signupHandler from '../signup';
import meHandler from '../me';
import logoutHandler from '../logout';
import * as supabaseModule from '../../../server/supabase.js';
import * as authModule from '../../../server/auth.js';
import * as cookiesModule from '../../../server/cookies.js';
import { createMockReq, createMockRes } from '../../__tests__/test-utils';

describe('auth handlers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('POST /api/auth/login returns success payload for valid credentials', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expires_in: 3600,
        },
        user: {
          id: 'user-1',
          email: 'user@example.com',
        },
      },
      error: null,
    });

    vi.spyOn(supabaseModule, 'createAnonClient').mockReturnValue({
      auth: { signInWithPassword },
    } as any);

    const setCookiesSpy = vi
      .spyOn(cookiesModule, 'setAuthCookies')
      .mockImplementation(() => {});

    const req = createMockReq({
      method: 'POST',
      body: {
        email: 'USER@example.com ',
        password: 'secret-123',
      },
    });
    const res = createMockRes();

    await loginHandler(req, res);

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'secret-123',
    });
    expect(setCookiesSpy).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.getJson()).toEqual({
      user: {
        id: 'user-1',
        email: 'user@example.com',
      },
      code: 'AUTH_LOGIN_SUCCESS',
    });
  });

  it('POST /api/auth/login returns invalid credentials contract', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials' },
    });

    vi.spyOn(supabaseModule, 'createAnonClient').mockReturnValue({
      auth: { signInWithPassword },
    } as any);

    const req = createMockReq({
      method: 'POST',
      body: { email: 'user@example.com', password: 'wrong' },
    });
    const res = createMockRes();

    await loginHandler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.getJson()).toEqual({
      error: 'Invalid login credentials',
      code: 'AUTH_INVALID_CREDENTIALS',
    });
  });

  it('POST /api/auth/signup returns success payload', async () => {
    const signUp = vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expires_in: 3600,
        },
        user: {
          id: 'user-2',
          email: 'new@example.com',
        },
      },
      error: null,
    });

    vi.spyOn(supabaseModule, 'createAnonClient').mockReturnValue({
      auth: { signUp },
    } as any);

    const setCookiesSpy = vi
      .spyOn(cookiesModule, 'setAuthCookies')
      .mockImplementation(() => {});

    const req = createMockReq({
      method: 'POST',
      body: { email: 'new@example.com', password: 'secret-123' },
    });
    const res = createMockRes();

    await signupHandler(req, res);

    expect(setCookiesSpy).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.getJson()).toEqual({
      user: {
        id: 'user-2',
        email: 'new@example.com',
      },
      emailConfirmationRequired: false,
      code: 'AUTH_SIGNUP_SUCCESS',
    });
  });

  it('GET /api/auth/me returns authenticated user payload', async () => {
    vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
      userId: 'user-42',
      email: 'owner@example.com',
      accessToken: 'access-token',
    });

    const req = createMockReq({ method: 'GET' });
    const res = createMockRes();

    await meHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.getJson()).toEqual({
      code: 'AUTH_ME_SUCCESS',
      user: {
        id: 'user-42',
        email: 'owner@example.com',
      },
    });
  });

  it('POST /api/auth/logout clears cookies and returns success', async () => {
    const clearCookiesSpy = vi
      .spyOn(cookiesModule, 'clearAuthCookies')
      .mockImplementation(() => {});

    const req = createMockReq({ method: 'POST' });
    const res = createMockRes();

    await logoutHandler(req, res);

    expect(clearCookiesSpy).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.getJson()).toEqual({
      success: true,
      code: 'AUTH_LOGOUT_SUCCESS',
    });
  });
});

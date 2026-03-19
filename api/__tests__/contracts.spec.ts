import decksHandler from '../decks/index';
import loginHandler from '../auth/login';
import meHandler from '../auth/me';
import { createMockReq, createMockRes } from './test-utils';

describe('API contracts baseline', () => {
  it('POST /api/auth/login returns 400 contract when payload missing', async () => {
    const req = createMockReq({ method: 'POST', body: {} });
    const res = createMockRes();

    await loginHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.getJson()).toEqual({
      error: 'Email and password are required',
      code: 'AUTH_VALIDATION_ERROR',
    });
  });

  it('GET /api/auth/me returns 401 contract without auth cookie', async () => {
    const req = createMockReq({ method: 'GET' });
    const res = createMockRes();

    await meHandler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.getJson()).toEqual({
      error: 'Unauthorized',
      code: 'AUTH_UNAUTHORIZED',
    });
  });

  it('GET /api/decks returns 401 contract without auth cookie', async () => {
    const req = createMockReq({ method: 'GET' });
    const res = createMockRes();

    await decksHandler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.getJson()).toEqual({ error: 'Unauthorized' });
  });
});

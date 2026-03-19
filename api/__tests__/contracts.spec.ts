import decksHandler from '../decks/index';
import loginHandler from '../auth/login';
import meHandler from '../auth/me';

function createMockRes() {
  const headers = new Map<string, string | string[]>();
  let rawBody = '';

  return {
    statusCode: 200,
    setHeader(name: string, value: string | string[]) {
      headers.set(name.toLowerCase(), value);
    },
    getHeader(name: string) {
      return headers.get(name.toLowerCase());
    },
    end(chunk?: string) {
      rawBody = chunk ?? '';
    },
    getJson() {
      if (!rawBody) return null;
      return JSON.parse(rawBody);
    },
  };
}

describe('API contracts baseline', () => {
  it('POST /api/auth/login returns 400 contract when payload missing', async () => {
    const req = {
      method: 'POST',
      body: {},
      headers: {},
    };
    const res = createMockRes();

    await loginHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.getJson()).toEqual({ error: 'Email and password are required' });
  });

  it('GET /api/auth/me returns 401 contract without auth cookie', async () => {
    const req = {
      method: 'GET',
      body: {},
      headers: {},
    };
    const res = createMockRes();

    await meHandler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.getJson()).toEqual({ error: 'Unauthorized' });
  });

  it('GET /api/decks returns 401 contract without auth cookie', async () => {
    const req = {
      method: 'GET',
      body: {},
      headers: {},
      query: {},
    };
    const res = createMockRes();

    await decksHandler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.getJson()).toEqual({ error: 'Unauthorized' });
  });
});

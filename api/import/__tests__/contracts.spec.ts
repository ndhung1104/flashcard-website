import importHandler from '../index';
import { createMockReq, createMockRes } from '../../__tests__/test-utils';

describe('import API contract', () => {
  it('POST /api/import returns not implemented contract for now', async () => {
    const req = createMockReq({ method: 'POST' });
    const res = createMockRes();

    await importHandler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.getJson()).toEqual({
      error: 'Unauthorized',
      code: 'AUTH_UNAUTHORIZED',
    });
  });
});

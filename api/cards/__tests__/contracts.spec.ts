import cardsHandler from '../index';
import * as authModule from '../../../server/auth.js';
import * as supabaseModule from '../../../server/supabase.js';
import { createMockReq, createMockRes } from '../../__tests__/test-utils';

describe('cards API contracts', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('GET /api/cards requires deckId', async () => {
    vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
      userId: 'user-1',
      email: 'user@example.com',
      accessToken: 'token',
    });
    vi.spyOn(supabaseModule, 'createUserClient').mockReturnValue({} as any);

    const req = createMockReq({ method: 'GET', query: {} });
    const res = createMockRes();

    await cardsHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.getJson()).toEqual({
      error: 'deckId is required',
      code: 'CARDS_DECK_ID_REQUIRED',
    });
  });

});

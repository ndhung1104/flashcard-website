import nextHandler from '../next';
import answerHandler from '../answer';
import * as authModule from '../../../server/auth.js';
import { createMockReq, createMockRes } from '../../__tests__/test-utils';

describe('quiz API contracts', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('GET /api/quiz/next requires deckId', async () => {
    vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
      userId: 'user-1',
      email: 'user@example.com',
      accessToken: 'token',
    });

    const req = createMockReq({ method: 'GET', query: {} });
    const res = createMockRes();

    await nextHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.getJson()).toEqual({
      error: 'deckId is required',
      code: 'QUIZ_DECK_ID_REQUIRED',
    });
  });

  it('POST /api/quiz/answer validates required payload', async () => {
    vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
      userId: 'user-1',
      email: 'user@example.com',
      accessToken: 'token',
    });

    const req = createMockReq({ method: 'POST', body: {} });
    const res = createMockRes();

    await answerHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.getJson()).toEqual({
      error: 'deckId, cardId and selectedMeaning are required',
      code: 'QUIZ_ANSWER_VALIDATION_ERROR',
    });
  });
});

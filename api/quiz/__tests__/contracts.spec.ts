import nextHandler from '../next';
import answerHandler from '../answer';
import * as authModule from '../../../server/auth.js';
import * as supabaseModule from '../../../server/supabase.js';
import * as cardsRepoModule from '../../../server/repositories/cards.js';
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

  it('GET /api/quiz/next includes cards with mastery above 3', async () => {
    vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
      userId: 'user-1',
      email: 'user@example.com',
      accessToken: 'token',
    });
    vi.spyOn(supabaseModule, 'createUserClient').mockReturnValue({} as any);
    vi.spyOn(cardsRepoModule, 'listCardsByDeck').mockResolvedValue([
      {
        id: 'card-10',
        user_id: 'user-1',
        deck_id: 'deck-1',
        term: 'Mastered card',
        meaning: 'Very known',
        normalized_term: 'mastered card',
        tags: [],
        is_unfamiliar: false,
        mastery_level: 10,
        last_reviewed_at: null,
        next_review_at: null,
      },
    ] as any);

    const req = createMockReq({
      method: 'GET',
      query: { deckId: 'deck-1' },
    });
    const res = createMockRes();

    await nextHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.getJson()).toMatchObject({
      question: {
        cardId: 'card-10',
        deckId: 'deck-1',
      },
      code: 'QUIZ_NEXT_READY',
    });
  });

  it('GET /api/quiz/next fills buckets in order 0 -> 1 -> 2 -> 3', async () => {
    vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
      userId: 'user-1',
      email: 'user@example.com',
      accessToken: 'token',
    });
    vi.spyOn(supabaseModule, 'createUserClient').mockReturnValue({} as any);
    vi.spyOn(cardsRepoModule, 'listCardsByDeck').mockResolvedValue([
      {
        id: 'card-0',
        user_id: 'user-1',
        deck_id: 'deck-1',
        term: 'Lv0',
        meaning: 'Meaning0',
        normalized_term: 'lv0',
        tags: [],
        is_unfamiliar: false,
        mastery_level: 0,
        last_reviewed_at: null,
        next_review_at: null,
      },
      {
        id: 'card-1',
        user_id: 'user-1',
        deck_id: 'deck-1',
        term: 'Lv1',
        meaning: 'Meaning1',
        normalized_term: 'lv1',
        tags: [],
        is_unfamiliar: false,
        mastery_level: 1,
        last_reviewed_at: null,
        next_review_at: null,
      },
      {
        id: 'card-2',
        user_id: 'user-1',
        deck_id: 'deck-1',
        term: 'Lv2',
        meaning: 'Meaning2',
        normalized_term: 'lv2',
        tags: [],
        is_unfamiliar: false,
        mastery_level: 2,
        last_reviewed_at: null,
        next_review_at: null,
      },
      {
        id: 'card-3',
        user_id: 'user-1',
        deck_id: 'deck-1',
        term: 'Lv3',
        meaning: 'Meaning3',
        normalized_term: 'lv3',
        tags: [],
        is_unfamiliar: false,
        mastery_level: 3,
        last_reviewed_at: null,
        next_review_at: null,
      },
    ] as any);

    const req0 = createMockReq({
      method: 'GET',
      query: { deckId: 'deck-1' },
    });
    const res0 = createMockRes();
    await nextHandler(req0, res0);
    expect(res0.getJson()).toMatchObject({
      question: { cardId: 'card-0' },
      code: 'QUIZ_NEXT_READY',
    });

    const req1 = createMockReq({
      method: 'GET',
      query: { deckId: 'deck-1', excludeCardIds: 'card-0' },
    });
    const res1 = createMockRes();
    await nextHandler(req1, res1);
    expect(res1.getJson()).toMatchObject({
      question: { cardId: 'card-1' },
      code: 'QUIZ_NEXT_READY',
    });

    const req2 = createMockReq({
      method: 'GET',
      query: { deckId: 'deck-1', excludeCardIds: 'card-0,card-1' },
    });
    const res2 = createMockRes();
    await nextHandler(req2, res2);
    expect(res2.getJson()).toMatchObject({
      question: { cardId: 'card-2' },
      code: 'QUIZ_NEXT_READY',
    });

    const req3 = createMockReq({
      method: 'GET',
      query: { deckId: 'deck-1', excludeCardIds: 'card-0,card-1,card-2' },
    });
    const res3 = createMockRes();
    await nextHandler(req3, res3);
    expect(res3.getJson()).toMatchObject({
      question: { cardId: 'card-3' },
      code: 'QUIZ_NEXT_READY',
    });
  });

  it('GET /api/quiz/next starts with bucket 0 for ~15% of total questions', async () => {
    vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
      userId: 'user-1',
      email: 'user@example.com',
      accessToken: 'token',
    });
    vi.spyOn(supabaseModule, 'createUserClient').mockReturnValue({} as any);

    const rows = [
      ...Array.from({ length: 10 }, (_, index) => ({
        id: `bucket0-${index + 1}`,
        user_id: 'user-1',
        deck_id: 'deck-1',
        term: `B0-${index + 1}`,
        meaning: `M0-${index + 1}`,
        normalized_term: `b0-${index + 1}`,
        tags: [],
        is_unfamiliar: false,
        mastery_level: 0,
        last_reviewed_at: null,
        next_review_at: null,
      })),
      ...Array.from({ length: 10 }, (_, index) => ({
        id: `bucket1-${index + 1}`,
        user_id: 'user-1',
        deck_id: 'deck-1',
        term: `B1-${index + 1}`,
        meaning: `M1-${index + 1}`,
        normalized_term: `b1-${index + 1}`,
        tags: [],
        is_unfamiliar: false,
        mastery_level: 1,
        last_reviewed_at: null,
        next_review_at: null,
      })),
    ];

    vi.spyOn(cardsRepoModule, 'listCardsByDeck').mockResolvedValue(rows as any);

    const resA = createMockRes();
    await nextHandler(
      createMockReq({ method: 'GET', query: { deckId: 'deck-1' } }),
      resA
    );
    expect(resA.getJson()).toMatchObject({
      question: { cardId: 'bucket0-1' },
      code: 'QUIZ_NEXT_READY',
    });

    const resB = createMockRes();
    await nextHandler(
      createMockReq({
        method: 'GET',
        query: { deckId: 'deck-1', excludeCardIds: 'bucket0-1' },
      }),
      resB
    );
    expect(resB.getJson()).toMatchObject({
      question: { cardId: 'bucket0-2' },
      code: 'QUIZ_NEXT_READY',
    });

    const resC = createMockRes();
    await nextHandler(
      createMockReq({
        method: 'GET',
        query: { deckId: 'deck-1', excludeCardIds: 'bucket0-1,bucket0-2' },
      }),
      resC
    );
    expect(resC.getJson()).toMatchObject({
      question: { cardId: 'bucket0-3' },
      code: 'QUIZ_NEXT_READY',
    });

    const resAfter15Percent = createMockRes();
    await nextHandler(
      createMockReq({
        method: 'GET',
        query: {
          deckId: 'deck-1',
          excludeCardIds: 'bucket0-1,bucket0-2,bucket0-3',
        },
      }),
      resAfter15Percent
    );
    expect(resAfter15Percent.getJson()).toMatchObject({
      question: { cardId: 'bucket1-1' },
      code: 'QUIZ_NEXT_READY',
    });
  });
});

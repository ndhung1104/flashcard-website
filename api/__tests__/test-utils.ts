export function createMockReq(overrides: Record<string, unknown> = {}) {
  const base = {
    method: 'GET',
    body: {},
    headers: {},
    query: {},
    [Symbol.asyncIterator]: async function* () {
      return;
    },
  };

  return { ...base, ...overrides } as any;
}

export function createMockRes() {
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
      return rawBody ? JSON.parse(rawBody) : null;
    },
  } as any;
}

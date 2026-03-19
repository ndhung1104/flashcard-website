export async function parseJsonBody(
  req: any
): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object') {
    return req.body as Record<string, unknown>;
  }

  if (typeof req.body === 'string' && req.body.trim() !== '') {
    return JSON.parse(req.body) as Record<string, unknown>;
  }

  let rawBody = '';
  for await (const chunk of req) {
    rawBody += chunk;
  }

  if (!rawBody.trim()) {
    return {};
  }

  return JSON.parse(rawBody) as Record<string, unknown>;
}

export function sendJson(res: any, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

export function methodNotAllowed(res: any, allowedMethods: string[]) {
  res.setHeader('Allow', allowedMethods.join(', '));
  sendJson(res, 405, { error: 'Method not allowed' });
}

export function getQueryParam(req: any, key: string): string | null {
  const value = req.query?.[key];

  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : null;
  }

  return typeof value === 'string' ? value : null;
}

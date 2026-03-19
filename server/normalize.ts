export function normalizeTerm(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function normalizeTagName(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

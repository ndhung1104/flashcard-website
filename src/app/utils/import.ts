import Papa from 'papaparse';
import readXlsxFile from 'read-excel-file/browser';
import { Card, ImportResult } from '../types';

type ImportRow = Record<string, unknown>;

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function normalizeRows(rows: unknown[][]): ImportRow[] {
  if (rows.length === 0) return [];

  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map((cell) => String(cell ?? '').trim());

  return dataRows
    .filter((cells) =>
      cells.some((cell) => String(cell ?? '').trim() !== '')
    )
    .map((cells) => {
      const row: ImportRow = {};
      headers.forEach((header, index) => {
        if (!header) return;
        row[header] = cells[index] ?? '';
      });
      return row;
    });
}

export async function parseFile(file: File): Promise<ImportRow[]> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.csv')) {
    const text = await file.text();
    const parsed = Papa.parse<ImportRow>(text, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.trim(),
    });

    if (parsed.errors.length > 0) {
      throw new Error(parsed.errors[0]?.message || 'Failed to parse CSV file');
    }

    return parsed.data;
  }

  if (fileName.endsWith('.xlsx')) {
    const rows = await readXlsxFile(file);
    return normalizeRows(rows as unknown[][]);
  }

  throw new Error('Unsupported file format. Please upload .csv or .xlsx.');
}

function getValueByAliases(row: ImportRow, aliases: string[]): unknown {
  const keyByLowercase = new Map(
    Object.keys(row).map((key) => [key.toLowerCase(), key])
  );

  for (const alias of aliases) {
    const key = keyByLowercase.get(alias.toLowerCase());
    if (!key) continue;

    const value = row[key];
    if (value === undefined || value === null) continue;
    if (String(value).trim() === '') continue;
    return value;
  }

  return undefined;
}

export function importCards(
  rows: ImportRow[],
  existingCards: Card[],
  defaultTag: string
): { cards: Card[]; result: ImportResult } {
  const result: ImportResult = {
    totalRows: rows.length,
    inserted: 0,
    duplicates: 0,
    failed: 0,
  };

  const newCards: Card[] = [];
  const existingTerms = new Set(existingCards.map((c) => c.term.toLowerCase()));

  for (const row of rows) {
    try {
      const term = getValueByAliases(row, ['term', 'question']);
      const meaning = getValueByAliases(row, ['meaning', 'answer', 'definition']);

      if (!term || !meaning) {
        result.failed++;
        continue;
      }

      const termStr = String(term).trim();
      const meaningStr = String(meaning).trim();

      if (existingTerms.has(termStr.toLowerCase())) {
        result.duplicates++;
        continue;
      }

      const tags = getValueByAliases(row, ['tags']);
      const tagArray = tags
        ? String(tags).split(/[,;]/).map((t) => t.trim())
        : [defaultTag];

      newCards.push({
        id: generateId(),
        term: termStr,
        meaning: meaningStr,
        tags: tagArray.filter(Boolean),
        isUnfamiliar: false,
      });

      existingTerms.add(termStr.toLowerCase());
      result.inserted++;
    } catch {
      result.failed++;
    }
  }

  return { cards: newCards, result };
}

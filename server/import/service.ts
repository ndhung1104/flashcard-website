import { normalizeTerm } from '../normalize.js';
import { insertCardsIgnoreDuplicates } from '../repositories/cards.js';
import { createImportJob } from '../repositories/import-jobs.js';
import { getOrCreateTags } from '../repositories/tags.js';
import { ImportRawRow, ImportSummary, PreparedImportRow } from './types.js';

function extractValueByAliases(row: ImportRawRow, aliases: string[]): unknown {
  const keyMap = new Map(
    Object.keys(row).map((key) => [key.toLowerCase(), key])
  );

  for (const alias of aliases) {
    const matchedKey = keyMap.get(alias.toLowerCase());
    if (!matchedKey) {
      continue;
    }

    const value = row[matchedKey];
    if (value === undefined || value === null) {
      continue;
    }

    if (String(value).trim() === '') {
      continue;
    }

    return value;
  }

  return undefined;
}

function hasRequiredColumns(rows: ImportRawRow[]): boolean {
  if (rows.length === 0) {
    return false;
  }

  const keys = Object.keys(rows[0]).map((key) => key.toLowerCase());
  return keys.includes('term') && keys.includes('meaning');
}

function parseTagList(raw: unknown, defaultTag: string): string[] {
  const tagSet = new Set<string>();

  if (defaultTag.trim()) {
    tagSet.add(defaultTag.trim());
  }

  if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
    String(raw)
      .split(/[,;]/)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .forEach((tag) => tagSet.add(tag));
  }

  return Array.from(tagSet);
}

function prepareRows(rows: ImportRawRow[], defaultTag: string): {
  prepared: PreparedImportRow[];
  failedCount: number;
} {
  const prepared: PreparedImportRow[] = [];
  let failedCount = 0;

  for (const row of rows) {
    const term = extractValueByAliases(row, ['term']);
    const meaning = extractValueByAliases(row, ['meaning']);

    if (!term || !meaning) {
      failedCount += 1;
      continue;
    }

    const termString = String(term).trim();
    const meaningString = String(meaning).trim();

    if (!termString || !meaningString) {
      failedCount += 1;
      continue;
    }

    prepared.push({
      term: termString,
      meaning: meaningString,
      normalizedTerm: normalizeTerm(termString),
      tags: parseTagList(extractValueByAliases(row, ['tags']), defaultTag),
      rowNumber: typeof row.rowNumber === 'number' ? row.rowNumber : 0,
    });
  }

  return { prepared, failedCount };
}

export interface RunImportInput {
  supabase: any;
  userId: string;
  deckId: string;
  defaultTag: string;
  fileName: string;
  rows: ImportRawRow[];
}

export async function runImport(input: RunImportInput): Promise<ImportSummary> {
  if (!hasRequiredColumns(input.rows)) {
    throw new Error('Import file must contain required columns: term, meaning');
  }

  const { prepared, failedCount } = prepareRows(input.rows, input.defaultTag);

  if (prepared.length === 0) {
    throw new Error('No valid rows to import');
  }

  const insertedCards = await insertCardsIgnoreDuplicates(
    input.supabase,
    prepared.map((row) => ({
      userId: input.userId,
      deckId: input.deckId,
      term: row.term,
      meaning: row.meaning,
      isUnfamiliar: false,
    }))
  );

  const rowsByNormalizedTerm = new Map(
    prepared.map((row) => [row.normalizedTerm, row])
  );

  const cardTagLinks: Array<{ card_id: string; tag_id: string; user_id: string }> = [];

  for (const insertedCard of insertedCards) {
    const sourceRow = rowsByNormalizedTerm.get(insertedCard.normalized_term);
    if (!sourceRow || sourceRow.tags.length === 0) {
      continue;
    }

    const tags = await getOrCreateTags(
      input.supabase,
      input.userId,
      input.deckId,
      sourceRow.tags
    );

    for (const tag of tags) {
      cardTagLinks.push({
        card_id: insertedCard.id,
        tag_id: tag.id,
        user_id: input.userId,
      });
    }
  }

  if (cardTagLinks.length > 0) {
    const { error } = await input.supabase.from('card_tags').upsert(cardTagLinks, {
      onConflict: 'card_id,tag_id',
      ignoreDuplicates: true,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  const inserted = insertedCards.length;
  const duplicates = prepared.length - inserted;

  const summary: ImportSummary = {
    totalRows: input.rows.length,
    inserted,
    duplicates,
    failed: failedCount,
  };

  await createImportJob(input.supabase, {
    userId: input.userId,
    deckId: input.deckId,
    filename: input.fileName,
    totalRows: summary.totalRows,
    insertedRows: summary.inserted,
    duplicateRows: summary.duplicates,
    failedRows: summary.failed,
  });

  return summary;
}

import Papa from 'papaparse';
import readXlsxFile from 'read-excel-file/node';
import { ImportRawRow } from './types.js';
// read-excel-file exports helper to list sheet names.
import { readSheetNames } from 'read-excel-file/node';

function normalizeXlsxRows(rows: unknown[][]): ImportRawRow[] {
  if (rows.length === 0) {
    return [];
  }

  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map((cell) => String(cell ?? '').trim());

  return dataRows
    .map((cells, index) => {
      const row: ImportRawRow = { rowNumber: index + 2 };
      headers.forEach((header, cellIndex) => {
        if (!header) {
          return;
        }
        row[header] = cells[cellIndex] ?? '';
      });
      return row;
    })
    .filter((row) =>
      Object.keys(row).some(
        (key) => key !== 'rowNumber' && String(row[key] ?? '').trim() !== ''
      )
    );
}

function parseCsvBuffer(buffer: Buffer): ImportRawRow[] {
  const text = buffer.toString('utf-8');
  const parsed = Papa.parse<ImportRawRow>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors[0]?.message ?? 'Failed to parse CSV file');
  }

  return (parsed.data ?? []).map((row, index) => ({
    ...row,
    rowNumber: index + 2,
  }));
}

export async function parseImportFile(
  fileName: string,
  buffer: Buffer,
  sheetName?: string
): Promise<ImportRawRow[]> {
  const lowerFileName = fileName.toLowerCase();

  if (lowerFileName.endsWith('.csv')) {
    return parseCsvBuffer(buffer);
  }

  if (lowerFileName.endsWith('.xlsx')) {
    const options = sheetName ? ({ sheet: sheetName } as const) : undefined;
    const rows = await readXlsxFile(buffer, options);
    return normalizeXlsxRows(rows as unknown[][]);
  }

  throw new Error('Unsupported file format. Please upload .csv or .xlsx.');
}

export async function getWorkbookSheetNames(
  fileName: string,
  buffer: Buffer
): Promise<string[]> {
  if (!fileName.toLowerCase().endsWith('.xlsx')) {
    return [];
  }

  const sheets = await readSheetNames(buffer);
  return sheets.map((sheet) => String(sheet).trim()).filter(Boolean);
}

import Papa from 'papaparse';
import readXlsxFile from 'read-excel-file/node';
import { ImportRawRow } from './types.js';

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
  buffer: Buffer
): Promise<ImportRawRow[]> {
  const lowerFileName = fileName.toLowerCase();

  if (lowerFileName.endsWith('.csv')) {
    return parseCsvBuffer(buffer);
  }

  if (lowerFileName.endsWith('.xlsx')) {
    const rows = await readXlsxFile(buffer);
    return normalizeXlsxRows(rows as unknown[][]);
  }

  throw new Error('Unsupported file format. Please upload .csv or .xlsx.');
}

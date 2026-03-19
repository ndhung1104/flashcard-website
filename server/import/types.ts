export interface ImportRawRow {
  [key: string]: unknown;
  rowNumber?: number;
}

export interface PreparedImportRow {
  term: string;
  meaning: string;
  normalizedTerm: string;
  tags: string[];
  rowNumber: number;
}

export interface ImportSummary {
  totalRows: number;
  inserted: number;
  duplicates: number;
  failed: number;
}

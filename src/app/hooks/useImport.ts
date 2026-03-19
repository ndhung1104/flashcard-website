import { useState } from 'react';

export interface ImportReport {
  totalRows: number;
  inserted: number;
  duplicates: number;
  failed: number;
}

interface ImportResponse {
  report: ImportReport;
}

export function useImport() {
  const [isImporting, setIsImporting] = useState(false);

  const importFile = async (params: {
    deckId: string;
    defaultTag: string;
    file: File;
  }): Promise<ImportReport> => {
    setIsImporting(true);

    try {
      const formData = new FormData();
      formData.append('deckId', params.deckId);
      formData.append('defaultTag', params.defaultTag);
      formData.append('file', params.file);

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          payload && typeof payload.error === 'string'
            ? payload.error
            : `Import failed (${response.status})`;
        throw new Error(message);
      }

      return (payload as ImportResponse).report;
    } finally {
      setIsImporting(false);
    }
  };

  return {
    isImporting,
    importFile,
  };
}

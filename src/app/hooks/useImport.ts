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

export interface DriveImportSource {
  id: string;
  deck_id: string;
  file_id: string;
  file_name: string;
  sheet_name: string;
  default_tag: string;
  is_active: boolean;
  last_synced_at: string | null;
  last_source_updated_at: string | null;
  last_sync_status: string;
  last_sync_error: string | null;
}

export interface DriveSyncResult {
  sourceId: string;
  deckId: string;
  fileId: string;
  fileName: string;
  sheetName: string;
  status: 'success' | 'failed' | 'skipped';
  reason?: string;
  report?: ImportReport;
}

interface DriveSourcesResponse {
  sources: DriveImportSource[];
}

interface DriveSyncResponse {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  results: DriveSyncResult[];
}

interface DriveSheetListResponse {
  fileName: string;
  sheets: string[];
}

export function useImport() {
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);

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

  const listDriveSources = async (deckId: string): Promise<DriveImportSource[]> => {
    const response = await fetch(
      `/api/import?action=drive-sources&deckId=${encodeURIComponent(deckId)}`,
      {
        method: 'GET',
        credentials: 'include',
      }
    );

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        payload && typeof payload.error === 'string'
          ? payload.error
          : `Failed to list drive sources (${response.status})`;
      throw new Error(message);
    }

    return (payload as DriveSourcesResponse).sources ?? [];
  };

  const saveDriveSource = async (params: {
    deckId: string;
    fileId: string;
    sheetName: string;
    defaultTag: string;
    isActive?: boolean;
  }): Promise<DriveImportSource> => {
    const response = await fetch('/api/import?action=drive-source-upsert', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deckId: params.deckId,
        fileId: params.fileId,
        sheetName: params.sheetName,
        defaultTag: params.defaultTag,
        isActive: params.isActive ?? true,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        payload && typeof payload.error === 'string'
          ? payload.error
          : `Failed to save drive source (${response.status})`;
      throw new Error(message);
    }

    return (payload as { source: DriveImportSource }).source;
  };

  const syncDriveNow = async (params: {
    deckId?: string;
    sourceId?: string;
    force?: boolean;
  }): Promise<DriveSyncResponse> => {
    setIsSyncingDrive(true);
    try {
      const response = await fetch('/api/import?action=drive-sync-now', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deckId: params.deckId,
          sourceId: params.sourceId,
          force: params.force ?? false,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          payload && typeof payload.error === 'string'
            ? payload.error
            : `Drive sync failed (${response.status})`;
        throw new Error(message);
      }

      return payload as DriveSyncResponse;
    } finally {
      setIsSyncingDrive(false);
    }
  };

  const fetchDriveSheets = async (
    fileId: string
  ): Promise<DriveSheetListResponse> => {
    const response = await fetch(
      `/api/import?action=drive-sheets&fileId=${encodeURIComponent(fileId)}`,
      {
        method: 'GET',
        credentials: 'include',
      }
    );

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        payload && typeof payload.error === 'string'
          ? payload.error
          : `Failed to read sheet names (${response.status})`;
      throw new Error(message);
    }

    return payload as DriveSheetListResponse;
  };

  return {
    isImporting,
    isSyncingDrive,
    importFile,
    listDriveSources,
    saveDriveSource,
    syncDriveNow,
    fetchDriveSheets,
  };
}

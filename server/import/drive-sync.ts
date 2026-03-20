import { downloadDriveFile } from '../google-drive.js';
import {
  DriveImportSourceRecord,
  updateDriveImportSourceStatus,
} from '../repositories/drive-import-sources.js';
import { parseImportFile } from './parsers.js';
import { runImport } from './service.js';

export interface DriveSyncSourceResult {
  sourceId: string;
  deckId: string;
  fileId: string;
  fileName: string;
  sheetName: string;
  status: 'success' | 'failed' | 'skipped';
  reason?: string;
  report?: {
    totalRows: number;
    inserted: number;
    duplicates: number;
    failed: number;
  };
}

export interface DriveSyncBatchResult {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  results: DriveSyncSourceResult[];
}

function isDriveSourceChanged(
  source: DriveImportSourceRecord,
  modifiedTime: string | null
): boolean {
  if (!modifiedTime) {
    return true;
  }

  if (!source.last_source_updated_at) {
    return true;
  }

  return new Date(modifiedTime).getTime() > new Date(source.last_source_updated_at).getTime();
}

export async function runDriveSync(
  supabase: any,
  sources: DriveImportSourceRecord[],
  options: { force?: boolean } = {}
): Promise<DriveSyncBatchResult> {
  const results: DriveSyncSourceResult[] = [];

  for (const source of sources) {
    try {
      const downloaded = await downloadDriveFile(source.file_id);
      const hasChanged = isDriveSourceChanged(source, downloaded.metadata.modifiedTime);

      if (!options.force && !hasChanged) {
        const skippedResult: DriveSyncSourceResult = {
          sourceId: source.id,
          deckId: source.deck_id,
          fileId: source.file_id,
          fileName: downloaded.fileName,
          sheetName: source.sheet_name,
          status: 'skipped',
          reason: 'No source change since last sync',
        };
        results.push(skippedResult);
        await updateDriveImportSourceStatus(supabase, source.id, {
          fileName: downloaded.fileName,
          lastSourceUpdatedAt: downloaded.metadata.modifiedTime,
          lastSyncStatus: 'skipped',
          lastSyncError: skippedResult.reason,
        });
        continue;
      }

      const rows = await parseImportFile(
        downloaded.fileName,
        downloaded.buffer,
        source.sheet_name
      );

      const report = await runImport({
        supabase,
        userId: source.user_id,
        deckId: source.deck_id,
        defaultTag: source.default_tag,
        fileName: `${downloaded.fileName} [${source.sheet_name}]`,
        rows,
      });

      const successResult: DriveSyncSourceResult = {
        sourceId: source.id,
        deckId: source.deck_id,
        fileId: source.file_id,
        fileName: downloaded.fileName,
        sheetName: source.sheet_name,
        status: 'success',
        report,
      };
      results.push(successResult);

      await updateDriveImportSourceStatus(supabase, source.id, {
        fileName: downloaded.fileName,
        lastSourceUpdatedAt: downloaded.metadata.modifiedTime,
        lastSyncStatus: 'success',
        lastSyncError: null,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Drive sync failed unexpectedly';

      results.push({
        sourceId: source.id,
        deckId: source.deck_id,
        fileId: source.file_id,
        fileName: source.file_name,
        sheetName: source.sheet_name,
        status: 'failed',
        reason: message,
      });

      await updateDriveImportSourceStatus(supabase, source.id, {
        lastSyncStatus: 'failed',
        lastSyncError: message,
      });
    }
  }

  return {
    processed: results.length,
    succeeded: results.filter((item) => item.status === 'success').length,
    failed: results.filter((item) => item.status === 'failed').length,
    skipped: results.filter((item) => item.status === 'skipped').length,
    results,
  };
}

export interface DriveImportSourceRecord {
  id: string;
  user_id: string;
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
  created_at: string;
  updated_at: string;
}

interface UpsertDriveImportSourceInput {
  userId: string;
  deckId: string;
  fileId: string;
  fileName?: string;
  sheetName: string;
  defaultTag: string;
  isActive: boolean;
}

const SELECT_COLUMNS =
  'id, user_id, deck_id, file_id, file_name, sheet_name, default_tag, is_active, last_synced_at, last_source_updated_at, last_sync_status, last_sync_error, created_at, updated_at';

export async function listDriveImportSourcesByUser(
  supabase: any,
  userId: string,
  deckId?: string
): Promise<DriveImportSourceRecord[]> {
  let query = supabase
    .from('drive_import_sources')
    .select(SELECT_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (deckId) {
    query = query.eq('deck_id', deckId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as DriveImportSourceRecord[];
}

export async function listDriveImportSourcesForCron(
  supabase: any
): Promise<DriveImportSourceRecord[]> {
  const { data, error } = await supabase
    .from('drive_import_sources')
    .select(SELECT_COLUMNS)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as DriveImportSourceRecord[];
}

export async function upsertDriveImportSource(
  supabase: any,
  input: UpsertDriveImportSourceInput
): Promise<DriveImportSourceRecord> {
  const { data, error } = await supabase
    .from('drive_import_sources')
    .upsert(
      {
        user_id: input.userId,
        deck_id: input.deckId,
        file_id: input.fileId,
        file_name: input.fileName ?? '',
        sheet_name: input.sheetName,
        default_tag: input.defaultTag,
        is_active: input.isActive,
      },
      {
        onConflict: 'user_id,deck_id,file_id,sheet_name',
      }
    )
    .select(SELECT_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to save drive import source');
  }

  return data as DriveImportSourceRecord;
}

export async function updateDriveImportSourceStatus(
  supabase: any,
  sourceId: string,
  updates: {
    fileName?: string;
    lastSourceUpdatedAt?: string | null;
    lastSyncStatus: 'success' | 'failed' | 'skipped';
    lastSyncError?: string | null;
  }
): Promise<void> {
  const payload: Record<string, unknown> = {
    last_sync_status: updates.lastSyncStatus,
    last_sync_error: updates.lastSyncError ?? null,
  };

  if (updates.fileName !== undefined) {
    payload.file_name = updates.fileName;
  }

  if (updates.lastSourceUpdatedAt !== undefined) {
    payload.last_source_updated_at = updates.lastSourceUpdatedAt;
  }

  if (updates.lastSyncStatus === 'success') {
    payload.last_synced_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('drive_import_sources')
    .update(payload)
    .eq('id', sourceId);

  if (error) {
    throw new Error(error.message);
  }
}

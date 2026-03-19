export interface ImportJobInput {
  userId: string;
  deckId: string;
  filename: string;
  totalRows: number;
  insertedRows: number;
  duplicateRows: number;
  failedRows: number;
}

export async function createImportJob(
  supabase: any,
  input: ImportJobInput
): Promise<void> {
  const { error } = await supabase.from('import_jobs').insert({
    user_id: input.userId,
    deck_id: input.deckId,
    filename: input.filename,
    total_rows: input.totalRows,
    inserted_rows: input.insertedRows,
    duplicate_rows: input.duplicateRows,
    failed_rows: input.failedRows,
  });

  if (error) {
    throw new Error(error.message);
  }
}

import { useEffect, useRef, useState } from 'react';
import { Upload, X, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Alert, AlertDescription } from '../components/ui/alert';
import { SampleCSVButton } from './SampleCSVButton';
import { ImportResult } from '../types';
import { useImport } from '../hooks/useImport';
import type { DriveImportSource } from '../hooks/useImport';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  deckId: string;
  onImported: () => Promise<void> | void;
}

export function ImportModal({ isOpen, onClose, deckId, onImported }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [defaultTag, setDefaultTag] = useState('imported');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [driveInfo, setDriveInfo] = useState<string | null>(null);
  const [driveFileId, setDriveFileId] = useState('');
  const [driveSheetName, setDriveSheetName] = useState('');
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [isLoadingSheets, setIsLoadingSheets] = useState(false);
  const [driveSources, setDriveSources] = useState<DriveImportSource[]>([]);
  const [isSavingDriveSource, setIsSavingDriveSource] = useState(false);
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    isImporting,
    isSyncingDrive,
    importFile,
    listDriveSources,
    saveDriveSource,
    syncDriveNow,
    fetchDriveSheets,
  } = useImport();

  const loadDriveSources = async () => {
    setIsLoadingSources(true);
    try {
      const sources = await listDriveSources(deckId);
      setDriveSources(sources);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load Drive sources';
      setDriveError(message);
    } finally {
      setIsLoadingSources(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void loadDriveSources();
  }, [isOpen, deckId]);

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.match(/\.(csv|xlsx)$/i)) {
      setError('Please upload a valid CSV or XLSX file');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setError(null);

    try {
      const report = await importFile({
        deckId,
        defaultTag,
        file,
      });

      setResult(report);

      if (report.inserted > 0) {
        await onImported();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to import file';
      setError(message);
    }
  };

  const handleLoadSheetNames = async () => {
    if (!driveFileId.trim()) {
      setDriveError('Please enter Google Drive file ID first');
      return;
    }

    setDriveError(null);
    setDriveInfo(null);
    setIsLoadingSheets(true);

    try {
      const data = await fetchDriveSheets(driveFileId.trim());
      setAvailableSheets(data.sheets);

      if (data.sheets.length > 0) {
        setDriveSheetName(data.sheets[0]);
      }

      setDriveInfo(
        data.sheets.length > 0
          ? `Found ${data.sheets.length} sheet(s) in ${data.fileName}`
          : `No sheet found in ${data.fileName}`
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load sheet names';
      setDriveError(message);
    } finally {
      setIsLoadingSheets(false);
    }
  };

  const handleSaveDriveSource = async () => {
    if (!driveFileId.trim() || !driveSheetName.trim()) {
      setDriveError('File ID and Sheet Name are required');
      return;
    }

    setIsSavingDriveSource(true);
    setDriveError(null);
    setDriveInfo(null);

    try {
      await saveDriveSource({
        deckId,
        fileId: driveFileId.trim(),
        sheetName: driveSheetName.trim(),
        defaultTag,
      });
      await loadDriveSources();
      setDriveInfo('Drive source saved successfully');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to save drive source';
      setDriveError(message);
    } finally {
      setIsSavingDriveSource(false);
    }
  };

  const handleSyncDriveNow = async () => {
    setDriveError(null);
    setDriveInfo(null);

    try {
      const syncResponse = await syncDriveNow({ deckId });
      await loadDriveSources();

      const inserted = syncResponse.results.reduce(
        (sum, item) => sum + (item.report?.inserted ?? 0),
        0
      );

      if (inserted > 0) {
        await onImported();
      }

      setDriveInfo(
        `Sync done: ${syncResponse.succeeded} success, ${syncResponse.failed} failed, ${syncResponse.skipped} skipped`
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to run drive sync';
      setDriveError(message);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setDriveError(null);
    setDriveInfo(null);
    setDriveFileId('');
    setDriveSheetName('');
    setAvailableSheets([]);
    setDefaultTag('imported');
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!isImporting && !open) {
          handleClose();
        }
      }}
    >
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Cards</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!result && (
            <>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0];
                    if (selectedFile) handleFileSelect(selectedFile);
                  }}
                  className="hidden"
                />
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileSpreadsheet className="w-8 h-8 text-green-600" />
                    <div className="text-left">
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      disabled={isImporting}
                      className="ml-2 p-1 hover:bg-gray-100 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm font-medium mb-1">Click or drag to upload</p>
                    <p className="text-xs text-gray-500">CSV or Excel files (.csv, .xlsx)</p>
                  </div>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">Default Tag</label>
                <Select value={defaultTag} onValueChange={setDefaultTag}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="imported">Imported</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="study">Study</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Applied as default tag for imported cards
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">Expected format:</p>
                  <SampleCSVButton />
                </div>
                <p>Columns: <span className="font-mono">term, meaning</span></p>
                <p>Optional: <span className="font-mono">tags</span> (use ; or , to separate)</p>
                <p className="mt-1 text-gray-500">First row should contain column headers</p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleClose} disabled={isImporting}>
                  Cancel
                </Button>
                <Button onClick={handleUpload} disabled={!file || isImporting}>
                  {isImporting ? 'Uploading...' : 'Upload'}
                </Button>
              </div>

              <div className="border rounded-lg p-3 space-y-3">
                <div>
                  <p className="text-sm font-semibold">Auto Import from Google Drive</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Map one Drive file + sheet into this deck, then run sync manually or by
                    cron.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-600">Drive File ID</label>
                  <Input
                    placeholder="1AbCDefG..."
                    value={driveFileId}
                    onChange={(event) => setDriveFileId(event.target.value)}
                    disabled={isSavingDriveSource || isSyncingDrive}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-600">Sheet Name</label>
                  <Input
                    placeholder="Vocabulary"
                    value={driveSheetName}
                    onChange={(event) => setDriveSheetName(event.target.value)}
                    disabled={isSavingDriveSource || isSyncingDrive}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleLoadSheetNames()}
                    disabled={isLoadingSheets || isSavingDriveSource || isSyncingDrive}
                  >
                    {isLoadingSheets ? 'Loading sheets...' : 'Load Sheets'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void handleSaveDriveSource()}
                    disabled={isSavingDriveSource || isSyncingDrive}
                  >
                    {isSavingDriveSource ? 'Saving...' : 'Save Source'}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void handleSyncDriveNow()}
                    disabled={isSyncingDrive || isSavingDriveSource}
                  >
                    {isSyncingDrive ? 'Syncing...' : 'Sync Now'}
                  </Button>
                </div>

                {availableSheets.length > 0 ? (
                  <div className="text-xs text-gray-500">
                    Sheets: {availableSheets.join(', ')}
                  </div>
                ) : null}

                {driveError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{driveError}</AlertDescription>
                  </Alert>
                ) : null}

                {driveInfo ? (
                  <Alert>
                    <AlertDescription>{driveInfo}</AlertDescription>
                  </Alert>
                ) : null}

                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-600">
                    Saved Sources {isLoadingSources ? '(Loading...)' : ''}
                  </p>
                  {driveSources.length === 0 ? (
                    <p className="text-xs text-gray-500">No source configured for this deck.</p>
                  ) : (
                    <div className="max-h-28 overflow-auto space-y-2">
                      {driveSources.map((source) => (
                        <div key={source.id} className="rounded border p-2 text-xs">
                          <p className="font-medium">
                            {source.file_name || source.file_id} {'->'} {source.sheet_name}
                          </p>
                          <p className="text-gray-500">
                            status: {source.last_sync_status}
                            {source.last_synced_at
                              ? ` | last sync: ${new Date(
                                  source.last_synced_at
                                ).toLocaleString()}`
                              : ''}
                          </p>
                          {source.last_sync_error ? (
                            <p className="text-red-600 mt-1">{source.last_sync_error}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {result && (
            <div className="space-y-4">
              <div className="flex items-center justify-center text-green-600 mb-4">
                <CheckCircle className="w-16 h-16" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-gray-600">Total Rows</span>
                  <span className="font-medium">{result.totalRows}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-green-600">Inserted</span>
                  <span className="font-medium text-green-600">{result.inserted}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-yellow-600">Duplicates Skipped</span>
                  <span className="font-medium text-yellow-600">{result.duplicates}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm text-red-600">Failed</span>
                  <span className="font-medium text-red-600">{result.failed}</span>
                </div>
              </div>

              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

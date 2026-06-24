import { invoke } from '@tauri-apps/api/core';
import { type ReconDocument } from './types';

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

function isTauriAvailable() {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__);
}

export async function loadDocumentsFromDb(): Promise<ReconDocument[] | null> {
  if (!isTauriAvailable()) {
    return null;
  }

  return invoke<ReconDocument[]>('get_documents');
}

export async function saveDocumentToDb(document: ReconDocument): Promise<void> {
  if (!isTauriAvailable()) {
    return;
  }

  await invoke('save_document', { document });
}

export async function deleteDocumentFromDb(documentId: string): Promise<void> {
  if (!isTauriAvailable()) {
    return;
  }

  await invoke('delete_document', { documentId });
}

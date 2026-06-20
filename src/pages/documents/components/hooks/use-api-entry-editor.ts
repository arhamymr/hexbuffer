import * as React from 'react';
import { buildRawHttpRequest } from '@/lib/http-message';
import { type SavedApiEntry } from '../../types';

interface UseApiEntryEditorProps {
  entry: SavedApiEntry;
  onChangeRawRequest: (entryId: string, rawRequest: string) => void;
}

export function useApiEntryEditor({ entry, onChangeRawRequest }: UseApiEntryEditorProps) {
  const savedRawRequest = React.useMemo(
    () =>
      buildRawHttpRequest({
        method: entry.method,
        url: entry.url,
        headers: entry.headers,
        body: entry.requestBody ?? '',
      }),
    [entry.headers, entry.method, entry.requestBody, entry.url]
  );
  const [rawRequest, setRawRequest] = React.useState(savedRawRequest);

  React.useEffect(() => {
    setRawRequest(savedRawRequest);
  }, [entry.id, savedRawRequest]);

  const handleRawRequestChange = React.useCallback((value: string | undefined) => {
    const nextValue = value ?? '';
    setRawRequest(nextValue);
    onChangeRawRequest(entry.id, nextValue);
  }, [entry.id, onChangeRawRequest]);

  const formattedSavedTime = React.useMemo(() => {
    return new Date(entry.savedAt).toLocaleString();
  }, [entry.savedAt]);

  return {
    rawRequest,
    handleRawRequestChange,
    formattedSavedTime,
  };
}

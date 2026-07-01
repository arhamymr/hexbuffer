import { useState, useCallback } from 'react';
import { toast } from 'sonner';

// ponytail: simple reusable clipboard hook with state feedback and toast
export function useCopyToClipboard(duration = 2000) {
  const [isCopied, setIsCopied] = useState(false);

  const copy = useCallback(
    async (text: string, successMessage = 'Copied to clipboard') => {
      if (!text) return false;
      try {
        await navigator.clipboard.writeText(text);
        setIsCopied(true);
        toast.success(successMessage);
        setTimeout(() => setIsCopied(false), duration);
        return true;
      } catch (err) {
        toast.error('Failed to copy text');
        return false;
      }
    },
    [duration],
  );

  return { isCopied, copy };
}

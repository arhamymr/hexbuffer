import * as React from 'react';
import { useClipboardStore } from '@/stores/clipboard';

export function ClipboardWatcher() {
  React.useEffect(() => {
    // 1. Intercept manual copy actions (Ctrl+C, Cmd+C)
    const handleCopy = () => {
      // ponytail: small delay to ensure the browser has completed the copy event/selection update
      setTimeout(() => {
        let text = window.getSelection()?.toString() || '';
        
        // ponytail: fallback if copying from within HTML inputs/textareas
        if (!text && document.activeElement) {
          if (
            document.activeElement instanceof HTMLInputElement ||
            document.activeElement instanceof HTMLTextAreaElement
          ) {
            const start = document.activeElement.selectionStart ?? 0;
            const end = document.activeElement.selectionEnd ?? 0;
            text = document.activeElement.value.substring(start, end);
          }
        }
        
        if (text) {
          useClipboardStore.getState().addClipboardItem(text);
        }
      }, 50);
    };

    document.addEventListener('copy', handleCopy);

    // 2. Intercept programmatic navigator.clipboard.writeText calls
    let originalWriteText: typeof navigator.clipboard.writeText | null = null;
    
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      originalWriteText = navigator.clipboard.writeText;
      navigator.clipboard.writeText = async (text: string) => {
        useClipboardStore.getState().addClipboardItem(text);
        if (originalWriteText) {
          return originalWriteText.call(navigator.clipboard, text);
        }
      };
    }

    return () => {
      document.removeEventListener('copy', handleCopy);
      if (originalWriteText && navigator.clipboard) {
        navigator.clipboard.writeText = originalWriteText;
      }
    };
  }, []);

  return null;
}

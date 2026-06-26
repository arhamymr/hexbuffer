import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { usePromptInputController } from '@/components/ai-elements/prompt-input';
import { mainNavItems, type NavItem } from '@/layout/constants';

interface MentionState {
  isOpen: boolean;
  query: string;
  atPosition: number;
}

export function usePageMentions() {
  const controller = usePromptInputController();
  const cursorRef = useRef<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [mentionedPages, setMentionedPages] = useState<NavItem[]>([]);
  const [mentionState, setMentionState] = useState<MentionState>({
    isOpen: false,
    query: '',
    atPosition: -1,
  });
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // Available pages to mention (exclude devOnly in production)
  const mentionablePages = useMemo(() => mainNavItems, []);

  // Detect @pattern in text up to cursor position
  const detectMention = useCallback(
    (value: string, cursor: number) => {
      const textBeforeCursor = value.slice(0, cursor);

      // Match @ at word boundary followed by non-whitespace, non-@ chars
      // This avoids matching email addresses (user@domain.com)
      const match = textBeforeCursor.match(/(?:^|\s)@([^\s@]*)$/);

      if (match) {
        const query = match[1] ?? '';
        // Find the absolute position of @ in the full value
        const matchStart = textBeforeCursor.lastIndexOf('@' + query);
        const atPos = matchStart;
        setMentionState({ isOpen: true, query, atPosition: atPos });
        setHighlightedIndex(0);
      } else {
        setMentionState((prev) =>
          prev.isOpen ? { isOpen: false, query: '', atPosition: -1 } : prev,
        );
      }
    },
    [],
  );

  // Filter pages by query, exclude already-mentioned
  const filteredPages = useMemo(() => {
    if (!mentionState.isOpen) return [];
    const q = mentionState.query.toLowerCase();
    const mentionedHrefs = new Set(mentionedPages.map((p) => p.href));
    return mentionablePages.filter(
      (page) =>
        !mentionedHrefs.has(page.href) &&
        page.label.toLowerCase().includes(q),
    );
  }, [mentionState.isOpen, mentionState.query, mentionedPages, mentionablePages]);

  // onSelect handler to track cursor position
  const onTextareaSelect = useCallback(
    (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
      const textarea = e.currentTarget;
      cursorRef.current = textarea.selectionStart;
      textareaRef.current = textarea;

      // Re-run detection with updated cursor
      detectMention(controller.textInput.value, textarea.selectionStart);
    },
    [controller.textInput.value, detectMention],
  );

  // onChange handler to detect @ patterns
  const onTextareaChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.currentTarget.value;
      // Use the cursor position from the ref, or fallback to selectionStart
      const cursor = cursorRef.current;
      detectMention(value, cursor);
    },
    [detectMention],
  );

  // onKeyDown handler for popover keyboard navigation
  const onTextareaKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (!mentionState.isOpen) return;

      const items = filteredPages;

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          e.stopPropagation();
          setHighlightedIndex((prev) => (prev + 1) % Math.max(items.length, 1));
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          e.stopPropagation();
          setHighlightedIndex(
            (prev) => (prev - 1 + items.length) % Math.max(items.length, 1),
          );
          break;
        }
        case 'Enter': {
          if (items.length > 0 && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            const page = items[highlightedIndex];
            if (page) {
              selectPage(page);
            }
          }
          break;
        }
        case 'Escape': {
          e.preventDefault();
          e.stopPropagation();
          closePopover();
          break;
        }
      }
    },
    [mentionState.isOpen, filteredPages, highlightedIndex],
  );

  // Select a page: remove @query text, add page, close popover
  const selectPage = useCallback(
    (page: NavItem) => {
      const value = controller.textInput.value;
      const atPos = mentionState.atPosition;
      const queryLen = mentionState.query.length;

      // Remove "@query" from the text
      const beforeAt = value.slice(0, atPos);
      const afterQuery = value.slice(atPos + 1 + queryLen);
      controller.textInput.setInput(beforeAt + afterQuery);

      // Add page to mentioned pages (no duplicates)
      setMentionedPages((prev) => {
        if (prev.some((p) => p.href === page.href)) return prev;
        return [...prev, page];
      });

      closePopover();

      // Refocus textarea and set cursor at replacement point
      requestAnimationFrame(() => {
        const ta = textareaRef.current;
        if (ta) {
          ta.focus();
          ta.setSelectionRange(atPos, atPos);
          cursorRef.current = atPos;
        }
      });
    },
    [controller.textInput, mentionState.atPosition, mentionState.query],
  );

  const removeMentionedPage = useCallback((href: string) => {
    setMentionedPages((prev) => prev.filter((p) => p.href !== href));
  }, []);

  const clearMentionedPages = useCallback(() => {
    setMentionedPages([]);
  }, []);

  const closePopover = useCallback(() => {
    setMentionState({ isOpen: false, query: '', atPosition: -1 });
    setHighlightedIndex(0);
  }, []);

  // Re-detect when controller value changes externally (e.g., after submit clear)
  useEffect(() => {
    const value = controller.textInput.value;
    if (!value) {
      closePopover();
    }
  }, [controller.textInput.value, closePopover]);

  return {
    mentionedPages,
    mentionState,
    filteredPages,
    highlightedIndex,
    onTextareaChange,
    onTextareaSelect,
    onTextareaKeyDown,
    selectPage,
    removeMentionedPage,
    clearMentionedPages,
    closePopover,
  };
}

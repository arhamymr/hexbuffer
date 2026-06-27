import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';

export const MAX_HIGHLIGHTS = 6;

export const HIGHLIGHT_COLORS = [
  '#f43f5e', // rose
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#a855f7', // purple
];

export const HIGHLIGHT_COLOR_LABELS: Record<string, string> = {
  '#f43f5e': 'Rose',
  '#f97316': 'Orange',
  '#eab308': 'Yellow',
  '#22c55e': 'Green',
  '#3b82f6': 'Blue',
  '#a855f7': 'Purple',
};

function makeKey(host: string, path: string): string {
  return `${host.trim().toLowerCase()}|${(path ?? '').trim()}`;
}

interface HighlightState {
  highlightedHosts: Record<string, string>; // "host|path" -> color

  highlightHost: (host: string, path: string, color: string) => void;
  removeHighlight: (host: string, path: string) => void;
  getHighlightColor: (host: string, path: string) => string | undefined;
}

export const useHighlightStore = create<HighlightState>()(
  persist(
    (set, get) => ({
      highlightedHosts: {},

      highlightHost: (host: string, path: string, color: string) => {
        const { highlightedHosts } = get();
        const key = makeKey(host, path);

        if (!key || key === '|') return;

        const currentColor = highlightedHosts[key];

        // Toggle: if same color, remove highlight
        if (currentColor === color) {
          const { [key]: _, ...rest } = highlightedHosts;
          set({ highlightedHosts: rest });
          toast.success(`Removed highlight from ${host}${path ? ` ${path}` : ''}`);
          return;
        }

        // New entry and max reached
        if (!currentColor && Object.keys(highlightedHosts).length >= MAX_HIGHLIGHTS) {
          toast.warning(`Maximum ${MAX_HIGHLIGHTS} highlights reached. Remove a highlight first.`);
          return;
        }

        set({
          highlightedHosts: { ...highlightedHosts, [key]: color },
        });

        const label = HIGHLIGHT_COLOR_LABELS[color] || color;
        const display = `${host}${path ? ` ${path}` : ''}`;
        toast.success(
          currentColor
            ? `Changed ${display} highlight to ${label}`
            : `Highlighted ${display} with ${label}`
        );
      },

      removeHighlight: (host: string, path: string) => {
        const key = makeKey(host, path);
        if (!key || key === '|') return;
        set((state) => {
          const { [key]: _, ...rest } = state.highlightedHosts;
          return { highlightedHosts: rest };
        });
        toast.success(`Removed highlight from ${host}${path ? ` ${path}` : ''}`);
      },

      getHighlightColor: (host: string, path: string) => {
        const key = makeKey(host ?? '', path ?? '');
        return get().highlightedHosts[key];
      },
    }),
    { name: 'hexbuffer-highlights' }
  )
);

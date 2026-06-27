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

interface HighlightState {
  highlightedHosts: Record<string, string>; // host -> color

  highlightHost: (host: string, color: string) => void;
  removeHighlight: (host: string) => void;
  getHighlightColor: (host: string) => string | undefined;
}

export const useHighlightStore = create<HighlightState>()(
  persist(
    (set, get) => ({
      highlightedHosts: {},

      highlightHost: (host: string, color: string) => {
        const { highlightedHosts } = get();
        const normalizedHost = host.trim().toLowerCase();

        if (!normalizedHost) return;

        const currentColor = highlightedHosts[normalizedHost];

        // Toggle: if same color, remove highlight
        if (currentColor === color) {
          const { [normalizedHost]: _, ...rest } = highlightedHosts;
          set({ highlightedHosts: rest });
          toast.success(`Removed highlight from ${normalizedHost}`);
          return;
        }

        // New host and max reached
        if (!currentColor && Object.keys(highlightedHosts).length >= MAX_HIGHLIGHTS) {
          toast.warning(`Maximum ${MAX_HIGHLIGHTS} highlights reached. Remove a highlight first.`);
          return;
        }

        set({
          highlightedHosts: { ...highlightedHosts, [normalizedHost]: color },
        });

        const label = HIGHLIGHT_COLOR_LABELS[color] || color;
        toast.success(
          currentColor
            ? `Changed ${normalizedHost} highlight to ${label}`
            : `Highlighted ${normalizedHost} with ${label}`
        );
      },

      removeHighlight: (host: string) => {
        const normalizedHost = host.trim().toLowerCase();
        if (!normalizedHost) return;
        set((state) => {
          const { [normalizedHost]: _, ...rest } = state.highlightedHosts;
          return { highlightedHosts: rest };
        });
        toast.success(`Removed highlight from ${normalizedHost}`);
      },

      getHighlightColor: (host: string) => {
        const normalizedHost = host?.trim().toLowerCase() ?? '';
        return get().highlightedHosts[normalizedHost];
      },
    }),
    { name: 'hexbuffer-highlights' }
  )
);

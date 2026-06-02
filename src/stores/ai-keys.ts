import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AiKeyStore {
  /** Map of provider ID to API key (e.g., { deepseek: "sk-..." }) */
  keys: Record<string, string>;

  /** Get the API key for a provider */
  getKey: (provider: string) => string | undefined;

  /** Set the API key for a provider */
  setKey: (provider: string, apiKey: string) => void;

  /** Remove the API key for a provider */
  removeKey: (provider: string) => void;

  /** Check if a provider has a key stored */
  hasKey: (provider: string) => boolean;
}

export const useAiKeyStore = create<AiKeyStore>()(
  persist(
    (set, get) => ({
      keys: {},

      getKey: (provider) => {
        const key = get().keys[provider];
        return key || undefined;
      },

      setKey: (provider, apiKey) =>
        set((state) => ({
          keys: { ...state.keys, [provider]: apiKey },
        })),

      removeKey: (provider) =>
        set((state) => {
          const { [provider]: _, ...rest } = state.keys;
          return { keys: rest };
        }),

      hasKey: (provider) => !!get().keys[provider]?.trim(),
    }),
    {
      name: '0xbuffer-ai-keys',
      partialize: (state) => ({ keys: state.keys }),
    },
  ),
);

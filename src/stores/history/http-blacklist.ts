import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import type { ApiCall } from '@/types';

export const MAX_BLACKLIST_RULES = 50;

export interface BlacklistRule {
  id: string;
  host: string;
  path: string | null;
  createdAt: number;
}

interface BlacklistState {
  rules: BlacklistRule[];

  addRule: (host: string, path?: string | null) => string | null;
  removeRule: (id: string) => void;
  isBlacklisted: (call: ApiCall) => boolean;
  getMatchingRule: (call: ApiCall) => BlacklistRule | undefined;
}

export const useBlacklistStore = create<BlacklistState>()(
  persist(
    (set, get) => ({
      rules: [],

      addRule: (host: string, path?: string | null) => {
        const { rules } = get();
        const normalizedHost = host.trim().toLowerCase();
        const normalizedPath = path?.trim() || null;

        if (!normalizedHost) return null;

        const exists = rules.some(
          (r) => r.host === normalizedHost && r.path === normalizedPath
        );
        if (exists) {
          toast.info('This pattern is already blacklisted');
          return null;
        }

        if (rules.length >= MAX_BLACKLIST_RULES) {
          toast.warning(`Maximum ${MAX_BLACKLIST_RULES} blacklist rules reached. Remove a rule first.`);
          return null;
        }

        const id = crypto.randomUUID();
        const newRule: BlacklistRule = {
          id,
          host: normalizedHost,
          path: normalizedPath,
          createdAt: Date.now(),
        };
        set({ rules: [...rules, newRule] });
        toast.success(
          normalizedPath
            ? `Blacklisted ${normalizedHost}${normalizedPath}`
            : `Blacklisted all requests from ${normalizedHost}`
        );
        return id;
      },

      removeRule: (id: string) => {
        set((state) => ({
          rules: state.rules.filter((r) => r.id !== id),
        }));
        toast.success('Blacklist rule removed');
      },

      isBlacklisted: (call: ApiCall) => {
        const { rules } = get();
        const callHost = call.host?.trim().toLowerCase() ?? '';
        const callPath = call.path?.trim() ?? '/';
        return rules.some((rule) => {
          if (callHost !== rule.host) return false;
          if (rule.path === null) return true;
          return callPath === rule.path;
        });
      },

      getMatchingRule: (call: ApiCall) => {
        const { rules } = get();
        const callHost = call.host?.trim().toLowerCase() ?? '';
        const callPath = call.path?.trim() ?? '/';
        return rules.find((rule) => {
          if (callHost !== rule.host) return false;
          if (rule.path === null) return true;
          return callPath === rule.path;
        });
      },
    }),
    { name: 'hexbuffer-blacklist' }
  )
);

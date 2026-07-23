import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import type { ApiCall } from '@/types';

export const MAX_GROUPS = 20;

const GROUP_COLORS = [
  '#3b82f6', '#10b981', '#8b5cf6',
  '#f43f5e', '#f97316', '#06b6d4',
  '#ec4899', '#eab308', '#6366f1', '#14b8a6',
];

export interface GroupDefinition {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

interface GroupsState {
  groups: GroupDefinition[];
  groupRequestIds: Record<string, string[]>;
  cachedCalls: Record<string, ApiCall>;

  createGroup: (name: string, color?: string) => string | null;
  renameGroup: (groupId: string, name: string) => void;
  deleteGroup: (groupId: string) => void;
  addRequestToGroup: (groupId: string, call: ApiCall) => void;
  removeRequestFromGroup: (groupId: string, requestId: string) => void;
  removeRequestFromAllGroups: (requestId: string) => void;
  getGroupsForRequest: (requestId: string) => GroupDefinition[];
  getGroupRequests: (groupId: string) => ApiCall[];
}

export const useGroupsStore = create<GroupsState>()(
  persist(
    (set, get) => ({
      groups: [],
      groupRequestIds: {},
      cachedCalls: {},

      createGroup: (name: string, color?: string) => {
        const { groups } = get();
        if (groups.length >= MAX_GROUPS) {
          toast.warning(`Maximum ${MAX_GROUPS} groups reached. Delete a group first.`);
          return null;
        }
        const id = crypto.randomUUID();
        const assignedColor = color ?? GROUP_COLORS[groups.length % GROUP_COLORS.length];
        const newGroup: GroupDefinition = {
          id,
          name: name.trim().slice(0, 50),
          color: assignedColor,
          createdAt: Date.now(),
        };
        set({
          groups: [...groups, newGroup],
          groupRequestIds: { ...get().groupRequestIds, [id]: [] },
        });
        return id;
      },

      renameGroup: (groupId: string, name: string) => {
        set({
          groups: get().groups.map((g) =>
            g.id === groupId ? { ...g, name: name.trim().slice(0, 50) } : g
          ),
        });
      },

      deleteGroup: (groupId: string) => {
        const { groupRequestIds, groups } = get();
        const removedIds = new Set(groupRequestIds[groupId] ?? []);
        const { [groupId]: _, ...restGroupRequestIds } = groupRequestIds;

        const stillReferenced = new Set<string>();
        for (const ids of Object.values(restGroupRequestIds)) {
          for (const id of ids) stillReferenced.add(id);
        }

        const { cachedCalls } = get();
        const newCache: Record<string, ApiCall> = {};
        for (const [id, call] of Object.entries(cachedCalls)) {
          if (stillReferenced.has(id) || !removedIds.has(id)) {
            newCache[id] = call;
          }
        }

        set({
          groups: groups.filter((g) => g.id !== groupId),
          groupRequestIds: restGroupRequestIds,
          cachedCalls: newCache,
        });
      },

      addRequestToGroup: (groupId: string, call: ApiCall) => {
        const { groupRequestIds, cachedCalls } = get();
        const ids = groupRequestIds[groupId] ?? [];
        if (ids.includes(call.id)) return;
        set({
          groupRequestIds: {
            ...groupRequestIds,
            [groupId]: [...ids, call.id],
          },
          cachedCalls: { ...cachedCalls, [call.id]: call },
        });
      },

      removeRequestFromGroup: (groupId: string, requestId: string) => {
        set((state) => {
          const ids = state.groupRequestIds[groupId] ?? [];
          const newIds = ids.filter((id) => id !== requestId);
          const newGroupRequestIds = { ...state.groupRequestIds, [groupId]: newIds };

          let stillReferenced = false;
          for (const [gid, rids] of Object.entries(newGroupRequestIds)) {
            if (gid !== groupId && rids.includes(requestId)) {
              stillReferenced = true;
              break;
            }
          }

          const newCache = stillReferenced
            ? state.cachedCalls
            : (() => {
                const { [requestId]: _, ...rest } = state.cachedCalls;
                return rest;
              })();

          return {
            groupRequestIds: newGroupRequestIds,
            cachedCalls: newCache,
          };
        });
      },

      removeRequestFromAllGroups: (requestId: string) => {
        set((state) => {
          const newGroupRequestIds: Record<string, string[]> = {};
          for (const [gid, ids] of Object.entries(state.groupRequestIds)) {
            newGroupRequestIds[gid] = ids.filter((id) => id !== requestId);
          }
          const { [requestId]: _, ...newCache } = state.cachedCalls;
          return {
            groupRequestIds: newGroupRequestIds,
            cachedCalls: newCache,
          };
        });
      },

      getGroupsForRequest: (requestId: string) => {
        const { groups, groupRequestIds } = get();
        return groups.filter((g) => groupRequestIds[g.id]?.includes(requestId));
      },

      getGroupRequests: (groupId: string) => {
        const { groupRequestIds, cachedCalls } = get();
        const ids = groupRequestIds[groupId] ?? [];
        return ids.map((id) => cachedCalls[id]).filter(Boolean);
      },
    }),
    { name: 'hexbuffer-groups' }
  )
);

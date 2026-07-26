import { create } from 'zustand';
import { coupleApi, type LovePing } from '@/src/services/coupleApi';

const locallyReadIds = new Set<string>();

type State = {
  pending: LovePing[];
  fetchPending: () => Promise<void>;
  pushIncoming: (love: LovePing) => void;
  markRead: (id: string) => Promise<void>;
  clear: () => void;
};

export const useCoupleLoveStore = create<State>((set, get) => ({
  pending: [],

  fetchPending: async () => {
    try {
      const { loves } = await coupleApi.getPendingLove();
      set((state) => {
        // Keep live socket items that may have arrived while this request was
        // in flight, then deduplicate and preserve server creation order.
        const byId = new Map(state.pending.map((love) => [love.id, love]));
        loves.forEach((love) => {
          if (!locallyReadIds.has(love.id)) byId.set(love.id, love);
        });
        return {
          pending: [...byId.values()].filter((love) => !locallyReadIds.has(love.id)).sort(
            (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
          ),
        };
      });
    } catch {
      /* offline */
    }
  },

  pushIncoming: (love) => {
    if (locallyReadIds.has(love.id)) return;
    set((s) => {
      if (s.pending.some((p) => p.id === love.id)) return s;
      return { pending: [...s.pending, love] };
    });
  },

  markRead: async (id) => {
    // Record this before the request so a slower pending-list response cannot
    // put the buzz back into the queue after its animation has completed.
    locallyReadIds.add(id);
    try {
      await coupleApi.markLoveRead(id);
    } catch {
      /* ignore */
    }
    set((s) => ({ pending: s.pending.filter((p) => p.id !== id) }));
  },

  clear: () => {
    locallyReadIds.clear();
    set({ pending: [] });
  },
}));

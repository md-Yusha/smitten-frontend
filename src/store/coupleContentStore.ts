import { create } from 'zustand';

/** Bumped when vault/memories change (socket or local upload). */
export const useCoupleContentStore = create<{
  revision: number;
  bump: () => void;
}>((set) => ({
  revision: 0,
  bump: () => set((s) => ({ revision: s.revision + 1 })),
}));

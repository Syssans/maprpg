import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { world } from '../content';
import * as rules from './rules';
import type { PlayerState } from './types';

interface Store {
  player: PlayerState;
  notices: string[];
  travel(placeId: string): void;
  enter(): void;
  leave(): void;
  talk(): void;
  choose(index: number): void;
  clearNotices(): void;
  reset(): void;
}

export const useGame = create<Store>()(
  persist(
    (set) => ({
      player: rules.initialState(world),
      notices: [],
      travel: (placeId) => set((s) => ({ player: rules.travel(world, s.player, placeId) })),
      enter: () => set((s) => ({ player: rules.enter(world, s.player) })),
      leave: () => set((s) => ({ player: rules.leave(world, s.player) })),
      talk: () =>
        set((s) => {
          const r = rules.startDialogue(world, s.player);
          return { player: r.state, notices: [...s.notices, ...r.notices] };
        }),
      choose: (index) =>
        set((s) => {
          const r = rules.choose(world, s.player, index);
          return { player: r.state, notices: [...s.notices, ...r.notices] };
        }),
      clearNotices: () => set({ notices: [] }),
      reset: () => set({ player: rules.initialState(world), notices: [] }),
    }),
    { name: 'maprpg-save-v3', partialize: (s) => ({ player: s.player }) },
  ),
);

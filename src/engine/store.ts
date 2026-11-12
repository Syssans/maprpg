import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { playable, world } from '../content';
import * as rules from './rules';
import type { PlayerState } from './types';

interface Store {
  player: PlayerState;
  notices: string[];
  travel(placeId: string): void;
  enter(): void;
  leave(): void;
  startScene(sceneId: string): void;
  choose(index: number): void;
  openTalk(personId: string): void;
  ask(topicId: string): void;
  backToTopics(): void;
  closeTalk(): void;
  submitReport(picks: number[]): void;
  dismissNews(): void;
  toggleUniform(): void;
  clearNotices(): void;
  reset(): void;
  /** Remplace l'état du joueur : import de sauvegarde et mode auteur. */
  load(raw: unknown): void;
}

const start = (): PlayerState => (playable ? rules.initialState(world) : ({} as PlayerState));

export const useGame = create<Store>()(
  persist(
    (set) => {
      /** Applique une action, puis laisse le monde réagir (événements). */
      const act = (fn: (p: PlayerState) => rules.Applied | PlayerState) =>
        set((s) => {
          const r = fn(s.player);
          const applied = 'state' in r ? r : { state: r, notices: [] };
          const ticked = rules.tick(world, applied.state);
          const fresh = [...applied.notices, ...ticked.notices];
          // Sans nouveauté, la liste garde son identité : le délai d'effacement n'est pas relancé.
          return { player: ticked.state, notices: fresh.length ? [...s.notices, ...fresh].slice(-3) : s.notices };
        });
      return {
        player: start(),
        notices: [],
        travel: (placeId) => act((p) => rules.travel(world, p, placeId)),
        enter: () => act((p) => rules.enter(world, p)),
        leave: () => act((p) => rules.leave(world, p)),
        startScene: (id) => act((p) => rules.startScene(world, p, id)),
        choose: (index) => act((p) => rules.choose(world, p, index)),
        openTalk: (id) => act((p) => rules.openTalk(world, p, id)),
        ask: (topic) => act((p) => rules.ask(world, p, topic)),
        backToTopics: () => act((p) => rules.backToTopics(p)),
        closeTalk: () => act((p) => rules.closeTalk(p)),
        submitReport: (picks) => act((p) => rules.submitReport(world, p, picks)),
        dismissNews: () => act((p) => rules.dismissNews(p)),
        toggleUniform: () => act((p) => (rules.busy(p) ? p : { ...p, uniform: !p.uniform })),
        clearNotices: () => set({ notices: [] }),
        reset: () => set({ player: start(), notices: [] }),
        load: (raw) => act(() => rules.repair(world, raw)),
      };
    },
    {
      name: 'sanctuaire-sauvegarde',
      partialize: (s) => ({ player: s.player }),
      // Une sauvegarde ancienne est remise d'aplomb plutôt que jetée.
      merge: (saved, current) => ({
        ...current,
        player: playable ? rules.repair(world, (saved as { player?: unknown } | undefined)?.player) : current.player,
      }),
    },
  ),
);

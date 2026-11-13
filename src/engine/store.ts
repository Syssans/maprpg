import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { playable, world } from '../content';
import * as rules from './rules';
import type { Note, PlayerState } from './types';

interface Store {
  player: PlayerState;
  notices: string[];
  /** Ce que le joueur a déjà vu de chaque page du codex : sert à signaler les nouveautés. */
  seen: Record<string, string>;
  markSeen(tab: string, signature: string): void;
  travel(placeId: string): void;
  enter(): void;
  leave(): void;
  startScene(sceneId: string): void;
  choose(index: number): void;
  openTalk(personId: string): void;
  ask(topicId: string): void;
  closeTalk(): void;
  submitReport(picks: number[]): void;
  dismissNews(): void;
  toggleUniform(): void;
  /** Épingle une note sur la carte courante et renvoie son identifiant. */
  addNote(x: number, y: number): string;
  updateNote(id: string, patch: Partial<Pick<Note, 'x' | 'y' | 'text'>>): void;
  deleteNote(id: string): void;
  clearNotices(): void;
  reset(): void;
  /** Remplace l'état du joueur : import de sauvegarde et mode auteur. */
  load(raw: unknown): void;
}

const start = (): PlayerState => (playable ? rules.initialState(world) : ({} as PlayerState));

export const useGame = create<Store>()(
  persist(
    (set, get) => {
      /** Applique une action, puis laisse le monde réagir (événements). */
      const act = (fn: (p: PlayerState) => rules.Applied | PlayerState) =>
        set((s) => {
          const r = fn(s.player);
          const applied = 'state' in r ? r : { state: r, notices: [] };
          const ticked = rules.tick(world, applied.state);
          // Pendant une scène, les conséquences se lisent dans le fil ; ailleurs, elles s'affichent en passant.
          const inScene = !!(ticked.state.dialogue || ticked.state.talk);
          const fresh = inScene ? [] : [...applied.notices, ...ticked.notices];
          // Sans nouveauté, la liste garde son identité : le délai d'effacement n'est pas relancé.
          return { player: ticked.state, notices: fresh.length ? [...s.notices, ...fresh].slice(-3) : s.notices };
        });
      return {
        player: start(),
        notices: [],
        seen: {},
        markSeen: (tab, signature) => set((s) => (s.seen[tab] === signature ? s : { seen: { ...s.seen, [tab]: signature } })),
        travel: (placeId) => act((p) => rules.travel(world, p, placeId)),
        enter: () => act((p) => rules.enter(world, p)),
        leave: () => act((p) => rules.leave(world, p)),
        startScene: (id) => act((p) => rules.startScene(world, p, id)),
        choose: (index) => act((p) => rules.choose(world, p, index)),
        openTalk: (id) => act((p) => rules.openTalk(world, p, id)),
        ask: (topic) => act((p) => rules.ask(world, p, topic)),
        closeTalk: () => act((p) => rules.closeTalk(p)),
        submitReport: (picks) => act((p) => rules.submitReport(world, p, picks)),
        dismissNews: () => act((p) => rules.dismissNews(p)),
        toggleUniform: () => act((p) => (rules.busy(p) ? p : { ...p, uniform: !p.uniform })),
        addNote: (x, y) => {
          const id = `n${Date.now().toString(36)}`;
          const p = get().player;
          set({ player: { ...p, notes: [...p.notes, { id, map: p.mapId, x, y, text: '' }] } });
          return id;
        },
        updateNote: (id, patch) =>
          set((s) => ({
            player: { ...s.player, notes: s.player.notes.map((n) => (n.id === id ? { ...n, ...patch } : n)) },
          })),
        deleteNote: (id) =>
          set((s) => ({ player: { ...s.player, notes: s.player.notes.filter((n) => n.id !== id) } })),
        clearNotices: () => set({ notices: [] }),
        reset: () => set({ player: start(), notices: [], seen: {} }),
        load: (raw) => act(() => rules.repair(world, raw)),
      };
    },
    {
      name: 'sanctuaire-sauvegarde',
      partialize: (s) => ({ player: s.player, seen: s.seen }),
      // Une sauvegarde ancienne est remise d'aplomb plutôt que jetée.
      merge: (saved, current) => ({
        ...current,
        seen: (saved as { seen?: Record<string, string> } | undefined)?.seen ?? {},
        player: playable ? rules.repair(world, (saved as { player?: unknown } | undefined)?.player) : current.player,
      }),
    },
  ),
);

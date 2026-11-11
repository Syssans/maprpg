// Règles pures : (état, action) -> nouvel état. Aucune dépendance à l'interface,
// ce qui permettra de les exécuter côté serveur pour le multijoueur.
import type { Condition, Effect, MapDef, PlayerState, World } from './types';

export const key = (mapId: string, placeId: string) => `${mapId}/${placeId}`;

export function initialState(world: World): PlayerState {
  const map = world.maps[world.startMap];
  return {
    mapId: map.id,
    positions: { [map.id]: map.entry },
    visited: [key(map.id, map.entry)],
    flags: [],
    inventory: {},
    quests: {},
    dialogue: null,
  };
}

export function check(s: PlayerState, c?: Condition): boolean {
  if (!c) return true;
  const has = (id: string) => (s.inventory[id] ?? 0) > 0;
  if (c.flags?.some((f) => !s.flags.includes(f))) return false;
  if (c.notFlags?.some((f) => s.flags.includes(f))) return false;
  if (c.items?.some((i) => !has(i))) return false;
  if (c.notItems?.some(has)) return false;
  if (c.questStage) {
    const q = s.quests[c.questStage[0]];
    if (!q || q.done || q.stage !== c.questStage[1]) return false;
  }
  if (c.questNotStarted && s.quests[c.questNotStarted]) return false;
  if (c.questDone && !s.quests[c.questDone]?.done) return false;
  return true;
}

export interface Applied {
  state: PlayerState;
  notices: string[];
}

export function apply(world: World, s: PlayerState, effects: Effect[] = []): Applied {
  let state = s;
  const notices: string[] = [];
  for (const e of effects) {
    if (e.setFlag && !state.flags.includes(e.setFlag)) {
      state = { ...state, flags: [...state.flags, e.setFlag] };
    }
    if (e.giveItem) {
      const n = state.inventory[e.giveItem] ?? 0;
      state = { ...state, inventory: { ...state.inventory, [e.giveItem]: n + 1 } };
      notices.push(`Objet reçu : ${world.items[e.giveItem].name}`);
    }
    if (e.takeItem && state.inventory[e.takeItem]) {
      const inventory = { ...state.inventory };
      if (--inventory[e.takeItem] <= 0) delete inventory[e.takeItem];
      state = { ...state, inventory };
      notices.push(`Objet cédé : ${world.items[e.takeItem].name}`);
    }
    if (e.questStage) {
      const [id, stage] = e.questStage;
      const title = world.quests[id].title;
      notices.push(state.quests[id] ? `Journal mis à jour : ${title}` : `Nouvelle quête : ${title}`);
      state = { ...state, quests: { ...state.quests, [id]: { stage, done: false } } };
    }
    if (e.completeQuest && state.quests[e.completeQuest]) {
      const id = e.completeQuest;
      state = { ...state, quests: { ...state.quests, [id]: { ...state.quests[id], done: true } } };
      notices.push(`Quête close : ${world.quests[id].title}`);
    }
  }
  return { state, notices };
}

export function neighbours(map: MapDef, placeId: string): string[] {
  return map.routes.flatMap(([a, b]) => (a === placeId ? [b] : b === placeId ? [a] : []));
}

/** Lieux connus : ceux déjà visités et ceux qu'un chemin relie à un lieu visité. */
export function knownPlaces(map: MapDef, s: PlayerState): Set<string> {
  const known = new Set<string>();
  for (const p of map.places) {
    if (s.visited.includes(key(map.id, p.id))) {
      known.add(p.id);
      neighbours(map, p.id).forEach((n) => known.add(n));
    }
  }
  return known;
}

function arrive(s: PlayerState, mapId: string, placeId: string): PlayerState {
  const k = key(mapId, placeId);
  return {
    ...s,
    mapId,
    positions: { ...s.positions, [mapId]: placeId },
    visited: s.visited.includes(k) ? s.visited : [...s.visited, k],
  };
}

export function travel(world: World, s: PlayerState, placeId: string): PlayerState {
  const map = world.maps[s.mapId];
  if (s.dialogue || !neighbours(map, s.positions[map.id]).includes(placeId)) return s;
  return arrive(s, map.id, placeId);
}

export function enter(world: World, s: PlayerState): PlayerState {
  const map = world.maps[s.mapId];
  const target = map.places.find((p) => p.id === s.positions[map.id])?.enters;
  if (s.dialogue || !target) return s;
  return arrive(s, target, world.maps[target].entry);
}

/** On ne quitte une carte que depuis son lieu d'entrée. */
export function canLeave(world: World, s: PlayerState): boolean {
  const map = world.maps[s.mapId];
  return !!map.parent && s.positions[map.id] === map.entry;
}

export function leave(world: World, s: PlayerState): PlayerState {
  const map = world.maps[s.mapId];
  if (s.dialogue || !canLeave(world, s)) return s;
  return { ...s, mapId: map.parent! };
}

function openNode(world: World, s: PlayerState, id: string, node: string): Applied {
  const applied = apply(world, s, world.dialogues[id].nodes[node].effects);
  return { ...applied, state: { ...applied.state, dialogue: { id, node } } };
}

export function startDialogue(world: World, s: PlayerState): Applied {
  const map = world.maps[s.mapId];
  const id = map.places.find((p) => p.id === s.positions[map.id])?.dialogue;
  const start = id && world.dialogues[id].start.find((e) => check(s, e.if));
  if (s.dialogue || !id || !start) return { state: s, notices: [] };
  return openNode(world, s, id, start.node);
}

export function visibleChoices(world: World, s: PlayerState) {
  if (!s.dialogue) return [];
  const node = world.dialogues[s.dialogue.id].nodes[s.dialogue.node];
  return (node.choices ?? []).map((c, index) => ({ ...c, index })).filter((c) => check(s, c.if));
}

/** index = position du choix dans le nœud ; -1 pour clore un nœud sans choix. */
export function choose(world: World, s: PlayerState, index: number): Applied {
  if (!s.dialogue) return { state: s, notices: [] };
  const { id, node } = s.dialogue;
  const choice = world.dialogues[id].nodes[node].choices?.[index];
  if (!choice) return { state: { ...s, dialogue: null }, notices: [] };
  if (!check(s, choice.if)) return { state: s, notices: [] };
  const first = apply(world, s, choice.effects);
  if (!choice.next) return { ...first, state: { ...first.state, dialogue: null } };
  const second = openNode(world, first.state, id, choice.next);
  return { state: second.state, notices: [...first.notices, ...second.notices] };
}

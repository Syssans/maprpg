// Règles pures : (monde, état, action) -> nouvel état. Aucune dépendance à l'interface,
// ce qui permettra de les exécuter côté serveur pour le multijoueur.
import type { Answer, Cond, Effect, Lore, MapDef, Op, Person, Place, PlayerState, Scene, World } from './types';

export const key = (a: string, b: string) => `${a}/${b}`;

export function initialState(world: World): PlayerState {
  const map = world.maps[world.game.startMap];
  return {
    mapId: map.id,
    positions: { [map.id]: map.entry },
    visited: [key(map.id, map.entry)],
    flags: [],
    inventory: {},
    quests: {},
    dialogue: null,
    day: 1,
    markers: {},
    dossier: [],
    uniform: true,
    talk: null,
    asked: [],
    reports: {},
    pendingReports: [],
    fired: [],
    news: [],
  };
}

export const here = (s: PlayerState) => key(s.mapId, s.positions[s.mapId]);

/** Le joueur est-il pris dans quelque chose qui doit se finir avant toute autre action ? */
export const busy = (s: PlayerState) => !!s.dialogue || !!s.talk || s.pendingReports.length > 0 || s.news.length > 0;

// ——— Calendrier ———

export function calendar(world: World, day: number) {
  const g = world.game;
  const total = g.dayOfYear - 1 + (day - 1);
  const years = Math.floor(total / g.yearLength);
  return {
    year: g.year + years,
    dayOfYear: (total % g.yearLength) + 1,
    moons: years % 2 === 0 ? g.moons : 3 - g.moons,
  };
}

export function dateLabel(world: World, day: number): string {
  const c = calendar(world, day);
  return `Jour ${c.dayOfYear} de l'An ${c.year} · ${c.moons === 2 ? 'deux lunes' : 'une lune'}`;
}

// ——— Conditions ———

const compare = (a: number, op: Op, b: number) =>
  op === '>=' ? a >= b : op === '<=' ? a <= b : op === '>' ? a > b : op === '<' ? a < b : a === b;

export function check(world: World, s: PlayerState, cond: Cond): boolean {
  return cond.every((c) => {
    switch (c.k) {
      case 'flag':
        return s.flags.includes(c.id) !== c.not;
      case 'item':
        return (s.inventory[c.id] ?? 0) > 0 !== c.not;
      case 'quest': {
        const q = s.quests[c.id];
        if (c.state === 'none') return !q;
        if (c.state === 'started') return !!q;
        if (c.state === 'active') return !!q && !q.done;
        if (c.state === 'done') return !!q?.done;
        return !!q && !q.done && q.stage === c.stage;
      }
      case 'knows':
        return knows(world, s, c.id) !== c.not;
      case 'contradiction':
        return knownLore(world, s).some((l) => l.id === c.id && l.contradiction);
      case 'day':
        return compare(s.day, c.op, c.n);
      case 'since':
        return c.id in s.markers && compare(s.day - s.markers[c.id], c.op, c.n);
      case 'dossier':
        return compare(c.word ? s.dossier.filter((d) => d.word === c.word).length : s.dossier.length, c.op, c.n);
      case 'uniform':
        return s.uniform === c.on;
      case 'visited':
        return s.visited.includes(c.place);
      case 'here':
        return here(s) === c.place;
    }
  });
}

// ——— Savoir ———

export interface KnownLore extends Lore {
  /** Le joueur connaît au moins une version qui en contredit une autre. */
  contradiction: boolean;
}

/** Les sujets dont le personnage sait quelque chose, réduits aux versions qu'il connaît. */
export function knownLore(world: World, s: PlayerState): KnownLore[] {
  return world.lore
    .map((l) => {
      const versions = l.versions.filter((v) => check(world, s, v.if));
      return { ...l, versions, contradiction: versions.length > 1 && versions.some((v) => v.contradicts) };
    })
    .filter((l) => l.versions.length > 0);
}

const knows = (world: World, s: PlayerState, id: string) =>
  !!world.lore.find((l) => l.id === id)?.versions.some((v) => check(world, s, v.if));

// ——— Effets ———

export interface Applied {
  state: PlayerState;
  notices: string[];
}

const same = (s: PlayerState): Applied => ({ state: s, notices: [] });

function arrive(s: PlayerState, mapId: string, placeId: string): PlayerState {
  const k = key(mapId, placeId);
  return {
    ...s,
    mapId,
    positions: { ...s.positions, [mapId]: placeId },
    visited: s.visited.includes(k) ? s.visited : [...s.visited, k],
  };
}

export function apply(world: World, s: PlayerState, effects: Effect[]): Applied {
  let state = s;
  const notices: string[] = [];
  for (const e of effects) {
    switch (e.k) {
      case 'flag': {
        const has = state.flags.includes(e.id);
        if (e.on && !has) state = { ...state, flags: [...state.flags, e.id] };
        if (!e.on && has) state = { ...state, flags: state.flags.filter((f) => f !== e.id) };
        break;
      }
      case 'item': {
        const item = world.items[e.id];
        const n = state.inventory[e.id] ?? 0;
        if (!item || (!e.give && n === 0)) break;
        const inventory = { ...state.inventory, [e.id]: n + (e.give ? 1 : -1) };
        if (inventory[e.id] <= 0) delete inventory[e.id];
        state = { ...state, inventory };
        notices.push(`${e.give ? 'Objet reçu' : 'Objet cédé'} : ${item.name}`);
        break;
      }
      case 'quest': {
        const quest = world.quests[e.id];
        if (!quest) break;
        const cur = state.quests[e.id];
        if (e.stage) {
          notices.push(`${cur ? 'Journal mis à jour' : 'Nouvelle quête'} : ${quest.title}`);
          state = { ...state, quests: { ...state.quests, [e.id]: { stage: e.stage, done: false } } };
        } else if (e.close && cur && !cur.done) {
          state = { ...state, quests: { ...state.quests, [e.id]: { ...cur, done: true } } };
          notices.push(`Quête close : ${quest.title}`);
        }
        break;
      }
      case 'days':
        state = { ...state, day: state.day + e.n };
        break;
      case 'marker':
        state = { ...state, markers: { ...state.markers, [e.id]: state.day } };
        break;
      case 'dossier':
        // Aucune notification : le joueur ne sait pas ce qu'on écrit sur lui.
        state = { ...state, dossier: [...state.dossier, { word: e.word, note: e.note, day: state.day }] };
        break;
      case 'report':
        if (world.reports[e.id] && !state.pendingReports.includes(e.id))
          state = { ...state, pendingReports: [...state.pendingReports, e.id] };
        break;
      case 'goto': {
        const [m, p] = e.place.split('/');
        if (world.maps[m]?.places.some((x) => x.id === p)) state = arrive(state, m, p);
        break;
      }
      case 'scene': {
        const scene = world.scenes[e.id];
        const start = scene?.starts.find((st) => check(world, state, st.if) && scene.nodes[st.node]);
        if (scene && start && !state.dialogue) {
          const opened = openNode(world, state, scene, start.node);
          state = opened.state;
          notices.push(...opened.notices);
        }
        break;
      }
    }
  }
  return { state, notices };
}

// ——— Carte et voyage ———

export function neighbours(map: MapDef, placeId: string): { id: string; days: number }[] {
  return map.routes.flatMap((r) =>
    r.a === placeId ? [{ id: r.b, days: r.days }] : r.b === placeId ? [{ id: r.a, days: r.days }] : [],
  );
}

/** Lieux connus : ceux déjà visités et ceux qu'un chemin relie à un lieu visité. */
export function knownPlaces(map: MapDef, s: PlayerState): Set<string> {
  const known = new Set<string>();
  for (const p of map.places) {
    if (s.visited.includes(key(map.id, p.id))) {
      known.add(p.id);
      neighbours(map, p.id).forEach((n) => known.add(n.id));
    }
  }
  return known;
}

export function describe(world: World, s: PlayerState, place: Place): { text: string; notes: string[] } {
  return {
    text: place.variants.find((v) => check(world, s, v.if))?.text ?? place.description,
    notes: place.notes.filter((n) => check(world, s, n.if)).map((n) => n.text),
  };
}

/** Valeur connue du joueur pour ce lieu sur ce calque. */
export function layerValue(world: World, s: PlayerState, place: Place, layerId: string) {
  const entry = place.layers.find((l) => l.layer === layerId && check(world, s, l.if));
  return entry ? world.layers[layerId]?.values[entry.value] : undefined;
}

export function travel(world: World, s: PlayerState, placeId: string): PlayerState {
  const map = world.maps[s.mapId];
  const route = neighbours(map, s.positions[map.id]).find((n) => n.id === placeId);
  if (busy(s) || !route) return s;
  return { ...arrive(s, map.id, placeId), day: s.day + route.days };
}

export function enter(world: World, s: PlayerState): PlayerState {
  const map = world.maps[s.mapId];
  const target = map.places.find((p) => p.id === s.positions[map.id])?.enters;
  if (busy(s) || !target || !world.maps[target]) return s;
  return arrive(s, target, s.positions[target] ?? world.maps[target].entry);
}

/** On ne quitte une carte que depuis son lieu d'entrée. */
export function canLeave(world: World, s: PlayerState): boolean {
  const map = world.maps[s.mapId];
  return !!map.parent && !!world.maps[map.parent] && s.positions[map.id] === map.entry;
}

export function leave(world: World, s: PlayerState): PlayerState {
  const map = world.maps[s.mapId];
  if (busy(s) || !canLeave(world, s)) return s;
  return { ...s, mapId: map.parent! };
}

// ——— Scènes ———

function openNode(world: World, s: PlayerState, scene: Scene, node: string): Applied {
  const applied = apply(world, { ...s, dialogue: { scene: scene.id, node } }, scene.nodes[node].effects);
  return applied;
}

/** Scènes que l'on peut lancer depuis le lieu où se trouve le joueur. */
export function scenesHere(world: World, s: PlayerState): Scene[] {
  const at = here(s);
  return Object.values(world.scenes).filter(
    (sc) => sc.place === at && sc.starts.some((st) => check(world, s, st.if) && sc.nodes[st.node]),
  );
}

export function startScene(world: World, s: PlayerState, sceneId: string): Applied {
  const scene = scenesHere(world, s).find((sc) => sc.id === sceneId);
  if (busy(s) || !scene) return same(s);
  const start = scene.starts.find((st) => check(world, s, st.if) && scene.nodes[st.node])!;
  return openNode(world, s, scene, start.node);
}

export function visibleChoices(world: World, s: PlayerState) {
  if (!s.dialogue) return [];
  const node = world.scenes[s.dialogue.scene]?.nodes[s.dialogue.node];
  return (node?.choices ?? []).map((c, index) => ({ ...c, index })).filter((c) => check(world, s, c.if));
}

/** index = position du choix dans le passage ; -1 pour clore un passage sans choix. */
export function choose(world: World, s: PlayerState, index: number): Applied {
  if (!s.dialogue) return same(s);
  const scene = world.scenes[s.dialogue.scene];
  const choice = scene?.nodes[s.dialogue.node]?.choices[index];
  if (!choice) return same({ ...s, dialogue: null });
  if (!check(world, s, choice.if)) return same(s);
  const first = apply(world, { ...s, dialogue: null }, choice.effects);
  // Un effet « + scène » a pu ouvrir une autre scène : elle prend alors le pas.
  if (!choice.next || first.state.dialogue) return first;
  const second = openNode(world, first.state, scene, choice.next);
  return { state: second.state, notices: [...first.notices, ...second.notices] };
}

// ——— Personnes et sujets ———

export function peopleHere(world: World, s: PlayerState): Person[] {
  const at = here(s);
  return Object.values(world.people).filter((p) => p.place === at && check(world, s, p.if));
}

export function openTalk(world: World, s: PlayerState, personId: string): PlayerState {
  if (busy(s) || !peopleHere(world, s).some((p) => p.id === personId)) return s;
  return { ...s, talk: { person: personId } };
}

export const closeTalk = (s: PlayerState): PlayerState => ({ ...s, talk: null });

/** La réponse que cette personne ferait sur ce sujet, dans l'état actuel. */
function answerFor(world: World, s: PlayerState, person: Person, topic: KnownLore): Answer | undefined {
  const ok = (a: Answer) => check(world, s, a.if);
  return (
    (topic.contradiction ? person.answers.find((a) => a.confront && a.topic === topic.id && ok(a)) : undefined) ??
    person.answers.find((a) => !a.confront && a.topic === topic.id && ok(a)) ??
    person.answers.find((a) => a.topic === '*' && ok(a))
  );
}

export function ask(world: World, s: PlayerState, topicId: string): Applied {
  const person = s.talk && world.people[s.talk.person];
  const topic = knownLore(world, s).find((l) => l.id === topicId);
  if (!person || !topic) return same(s);
  const answer = answerFor(world, s, person, topic);
  const k = key(person.id, topicId) + (answer?.confront ? '!' : '');
  const first = !s.asked.includes(k);
  const base: PlayerState = {
    ...s,
    asked: first ? [...s.asked, k] : s.asked,
    talk: { person: person.id, topic: topicId, reply: answer?.text ?? 'Rien à vous dire là-dessus.' },
  };
  // Les conséquences d'une réponse ne valent qu'une fois.
  return first && answer ? apply(world, base, answer.effects) : same(base);
}

export const backToTopics = (s: PlayerState): PlayerState =>
  s.talk ? { ...s, talk: { person: s.talk.person } } : s;

// ——— Rapports ———

/** Réponses que le joueur peut donner à chaque point du rapport. */
export function reportOptions(world: World, s: PlayerState, reportId: string) {
  return world.reports[reportId].points.map((pt) =>
    pt.options.map((o, index) => ({ ...o, index })).filter((o) => check(world, s, o.if)),
  );
}

/** picks[i] = position de la réponse choisie au point i, ou -1 si le point n'offrait rien. */
export function submitReport(world: World, s: PlayerState, picks: number[]): Applied {
  const id = s.pendingReports[0];
  const report = world.reports[id];
  if (!report) return same(s);
  const options = reportOptions(world, s, id);
  const valid = options.every((opts, i) => (opts.length ? opts.some((o) => o.index === picks[i]) : true));
  if (!valid) return same(s);
  const effects = report.points.flatMap((pt, i) => pt.options[picks[i]]?.effects ?? []);
  const base: PlayerState = {
    ...s,
    pendingReports: s.pendingReports.slice(1),
    reports: { ...s.reports, [id]: { day: s.day, picks } },
  };
  return apply(world, base, effects);
}

// ——— Événements ———

/** Fait survenir les événements dont la condition vient d'être remplie. À appeler après chaque action. */
export function tick(world: World, s: PlayerState): Applied {
  let state = s;
  const notices: string[] = [];
  for (let guard = 0; guard < 20; guard++) {
    if (state.dialogue || state.talk || state.pendingReports.length) break;
    const event = world.events.find((e) => !state.fired.includes(e.id) && check(world, state, e.if));
    if (!event) break;
    const applied = apply(
      world,
      { ...state, fired: [...state.fired, event.id], news: event.text ? [...state.news, event.id] : state.news },
      event.effects,
    );
    state = applied.state;
    notices.push(...applied.notices);
  }
  return { state, notices };
}

export const dismissNews = (s: PlayerState): PlayerState => ({ ...s, news: s.news.slice(1) });

// ——— Dossier ———

/** Ce que le personnage devine du dossier que l'Inquisition tient sur lui. */
export function dossierHint(s: PlayerState): string {
  const n = s.dossier.length;
  if (n === 0) return "Rien, que vous sachiez.";
  if (n <= 2) return "On a noté quelque chose à votre sujet. Vous ne savez pas quoi.";
  if (n <= 5) return "Votre dossier s'épaissit. On vous regarde un peu plus longtemps qu'avant.";
  return "Votre dossier pèse lourd. Vous le sentez à la façon dont on vous salue.";
}

// ——— Sauvegardes ———

/**
 * Remet d'aplomb une sauvegarde venue d'une version antérieure du contenu :
 * champs manquants, lieux ou scènes disparus, objets retirés.
 */
export function repair(world: World, raw: unknown): PlayerState {
  const base = initialState(world);
  if (!raw || typeof raw !== 'object') return base;
  const s = { ...base, ...(raw as Partial<PlayerState>) };
  const arr = <T,>(v: T[] | undefined): T[] => (Array.isArray(v) ? v : []);
  const obj = <T,>(v: Record<string, T> | undefined): Record<string, T> => (v && typeof v === 'object' ? v : {});
  const placeOk = (m: string, p: string) => !!world.maps[m]?.places.some((x) => x.id === p);

  s.positions = Object.fromEntries(Object.entries(obj(s.positions)).filter(([m, p]) => placeOk(m, p)));
  if (!world.maps[s.mapId]) s.mapId = base.mapId;
  if (!s.positions[s.mapId]) s.positions[s.mapId] = world.maps[s.mapId].entry;
  s.visited = [...new Set([...arr(s.visited), key(s.mapId, s.positions[s.mapId])])];
  s.flags = arr(s.flags);
  s.inventory = Object.fromEntries(Object.entries(obj(s.inventory)).filter(([id, n]) => world.items[id] && n > 0));
  s.quests = Object.fromEntries(
    Object.entries(obj(s.quests)).filter(([id, q]) => world.quests[id] && q && q.stage in world.quests[id].stages),
  );
  s.dialogue = s.dialogue && world.scenes[s.dialogue.scene]?.nodes[s.dialogue.node] ? s.dialogue : null;
  s.talk = s.talk && world.people[s.talk.person] ? s.talk : null;
  s.day = Number.isFinite(s.day) && s.day >= 1 ? Math.floor(s.day) : 1;
  s.markers = obj(s.markers);
  s.dossier = arr(s.dossier);
  s.uniform = s.uniform !== false;
  s.asked = arr(s.asked);
  s.reports = Object.fromEntries(Object.entries(obj(s.reports)).filter(([id]) => world.reports[id]));
  s.pendingReports = arr(s.pendingReports).filter((id) => world.reports[id]);
  s.fired = arr(s.fired);
  s.news = arr(s.news).filter((id) => world.events.some((e) => e.id === id));
  return s;
}

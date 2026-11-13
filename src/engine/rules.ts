// Règles pures : (monde, état, action) -> nouvel état. Aucune dépendance à l'interface,
// ce qui permettra de les exécuter côté serveur pour le multijoueur.
import type {
  Answer,
  Choice,
  Cond,
  Effect,
  LogEntry,
  Lore,
  MapDef,
  Op,
  Person,
  Place,
  PlayerState,
  Scene,
  World,
} from './types';

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
    skills: {},
    points: world.game.startPoints,
    checks: {},
    learned: [],
    log: [],
    notes: [],
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

// ——— Talents et jets ———

export const SKILL_BASE = 1;
export const SKILL_MAX = 6;

export const skillLevel = (s: PlayerState, id: string) => SKILL_BASE + (s.skills[id] ?? 0);

export function spendPoint(world: World, s: PlayerState, id: string): PlayerState {
  if (s.points < 1 || skillLevel(s, id) >= SKILL_MAX || !world.skills.some((k) => k.id === id)) return s;
  return { ...s, points: s.points - 1, skills: { ...s.skills, [id]: (s.skills[id] ?? 0) + 1 } };
}

/** Double un : échec quoi qu'il arrive. Double six : réussite quoi qu'il arrive. */
export const rollSucceeds = (dice: [number, number], bonus: number, difficulty: number) =>
  dice[0] + dice[1] === 2 ? false : dice[0] + dice[1] === 12 ? true : dice[0] + dice[1] + bonus >= difficulty;

/** Chance de réussite, en pourcentage, sur les trente-six tirages possibles. */
export function chance(bonus: number, difficulty: number): number {
  let wins = 0;
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (rollSucceeds([a, b], bonus, difficulty)) wins++;
  return Math.round((wins / 36) * 100);
}

export const difficultyLabel = (d: number) =>
  d <= 6 ? 'Aisé' : d <= 8 ? 'Ordinaire' : d <= 10 ? 'Malaisé' : d <= 12 ? 'Ardu' : d <= 14 ? 'Redoutable' : 'Presque impossible';

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
      case 'skill':
        return compare(skillLevel(s, c.id), c.op, c.n);
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

/**
 * Un sujet s'ouvre quand le personnage le découvre (« + savoir ») ou quand l'une de ses
 * versions conditionnelles devient vraie. Tant qu'il est fermé, le joueur n'en voit rien.
 */
const visibleVersions = (world: World, s: PlayerState, l: Lore) => {
  const earned = l.versions.filter((v) => v.if.length > 0 && check(world, s, v.if));
  if (!earned.length && !s.learned.includes(l.id)) return [];
  return l.versions.filter((v) => v.if.length === 0 || earned.includes(v));
};

/** Les sujets que le personnage a découverts, réduits aux versions qu'il connaît. */
export function knownLore(world: World, s: PlayerState): KnownLore[] {
  return world.lore
    .map((l) => {
      const versions = visibleVersions(world, s, l);
      return { ...l, versions, contradiction: versions.length > 1 && versions.some((v) => v.contradicts) };
    })
    .filter((l) => l.versions.length > 0);
}

const knows = (world: World, s: PlayerState, id: string) => {
  const l = world.lore.find((x) => x.id === id);
  return !!l && visibleVersions(world, s, l).length > 0;
};

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
      case 'learn': {
        const lore = world.lore.find((l) => l.id === e.id);
        if (!lore || state.learned.includes(e.id)) break;
        const already = knows(world, state, e.id);
        state = { ...state, learned: [...state.learned, e.id] };
        if (!already) notices.push(`Savoir : ${lore.title}`);
        break;
      }
      case 'points':
        state = { ...state, points: state.points + e.n };
        notices.push(e.n > 1 ? `${e.n} points de talent à répartir` : 'Un point de talent à répartir');
        break;
      case 'skill': {
        const skill = world.skills.find((k) => k.id === e.id);
        if (!skill) break;
        const gain = Math.min(e.n, SKILL_MAX - skillLevel(state, e.id));
        if (gain <= 0) break;
        state = { ...state, skills: { ...state.skills, [e.id]: (state.skills[e.id] ?? 0) + gain } };
        notices.push(`${skill.name} +${gain}`);
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

const say = (s: PlayerState, ...entries: LogEntry[]): PlayerState => ({ ...s, log: [...s.log, ...entries] });

/** Inscrit dans le fil les conséquences d'une action, pour qu'on les lise là où elles surviennent. */
const logged = (a: Applied): Applied => ({
  ...a,
  state: say(a.state, ...a.notices.map((text): LogEntry => ({ k: 'notice', text }))),
});

/** Ouvre un passage : son texte entre dans le fil, ses effets s'appliquent. */
function openNode(world: World, s: PlayerState, scene: Scene, node: string): Applied {
  const n = scene.nodes[node];
  const voices = n.passives
    .filter((p) => skillLevel(s, p.skill) >= p.level)
    .map((p): LogEntry => ({ k: 'voice', speaker: world.skills.find((k) => k.id === p.skill)?.name, text: p.text }));
  const base = say(
    { ...s, dialogue: { scene: scene.id, node } },
    { k: 'text', speaker: n.speaker, text: n.text },
    ...voices,
  );
  return apply(world, base, n.effects);
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
  return logged(openNode(world, { ...s, log: [] }, scene, start.node));
}

export interface TestView {
  skill: string;
  difficulty: number;
  /** Niveau du talent, modificateurs compris. */
  bonus: number;
  chance: number;
  /** Modificateurs qui s'appliquent en ce moment. */
  mods: { value: number; text: string }[];
  /** Déjà réussi : le choix se reprend sans relancer les dés. */
  passed: boolean;
  /** Déjà raté, et pas encore de quoi retenter. */
  locked: boolean;
  once: boolean;
}

function testView(world: World, s: PlayerState, k: string, test: NonNullable<Choice['test']>): TestView {
  const mods = test.mods.filter((m) => check(world, s, m.if)).map((m) => ({ value: m.value, text: m.text }));
  const level = skillLevel(s, test.skill);
  const bonus = level + mods.reduce((n, m) => n + m.value, 0);
  const prev = s.checks[k];
  return {
    skill: world.skills.find((x) => x.id === test.skill)?.name ?? test.skill,
    difficulty: test.difficulty,
    bonus,
    chance: chance(bonus, test.difficulty),
    mods,
    passed: !!prev?.ok,
    // Un jet raté se retente quand le talent a progressé, sauf s'il est « sans retour ».
    locked: !!prev && !prev.ok && (test.once || level <= prev.level),
    once: test.once,
  };
}

const checkKey = (s: PlayerState, index: number) => `${s.dialogue!.scene}/${s.dialogue!.node}/${index}`;

export function visibleChoices(world: World, s: PlayerState) {
  if (!s.dialogue) return [];
  const node = world.scenes[s.dialogue.scene]?.nodes[s.dialogue.node];
  return (node?.choices ?? [])
    .map((c, index) => ({ ...c, index, roll: c.test ? testView(world, s, checkKey(s, index), c.test) : undefined }))
    .filter((c) => check(world, s, c.if));
}

/**
 * index = position du choix dans le passage ; -1 pour clore un passage sans choix.
 * `dice` : les deux dés tirés par l'interface, requis quand le choix porte un jet encore à tenter.
 */
export function choose(world: World, s: PlayerState, index: number, dice?: [number, number]): Applied {
  if (!s.dialogue) return same(s);
  const scene = world.scenes[s.dialogue.scene];
  const choice = scene?.nodes[s.dialogue.node]?.choices[index];
  if (!choice) return same({ ...s, dialogue: null });
  if (!check(world, s, choice.if)) return same(s);

  let state = say({ ...s, dialogue: null }, { k: 'you', text: choice.text });
  let ok = true;
  if (choice.test) {
    const k = checkKey(s, index);
    const view = testView(world, s, k, choice.test);
    if (view.locked) return same(s);
    if (!view.passed) {
      if (!dice) return same(s);
      ok = rollSucceeds(dice, view.bonus, view.difficulty);
      state = say(
        { ...state, checks: { ...state.checks, [k]: { ok, level: skillLevel(s, choice.test.skill) } } },
        {
          k: 'roll',
          ok,
          speaker: view.skill,
          text: `${ok ? 'Réussite' : 'Échec'} — ${dice[0]} et ${dice[1]} aux dés, ${view.bonus >= 0 ? '+' : ''}${view.bonus}, contre ${view.difficulty}`,
        },
      );
    }
  }
  // Les effets d'un choix à jet ne valent qu'en cas de réussite.
  const first = ok ? logged(apply(world, state, choice.effects)) : same(state);
  const next = ok ? choice.next : choice.test?.fail;
  // Un effet « + scène » a pu ouvrir une autre scène : elle prend alors le pas.
  if (!next || first.state.dialogue || !scene.nodes[next]) return first;
  const second = logged(openNode(world, first.state, scene, next));
  return { state: second.state, notices: [...first.notices, ...second.notices] };
}

// ——— Personnes et sujets ———

export function peopleHere(world: World, s: PlayerState): Person[] {
  const at = here(s);
  return Object.values(world.people).filter((p) => p.place === at && check(world, s, p.if));
}

export function openTalk(world: World, s: PlayerState, personId: string): PlayerState {
  if (busy(s) || !peopleHere(world, s).some((p) => p.id === personId)) return s;
  const person = world.people[personId];
  const log: LogEntry[] = [{ k: 'title', text: person.name }];
  if (person.intro) log.push({ k: 'text', text: person.intro });
  return { ...s, talk: { person: personId }, log };
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
  const base = say(
    { ...s, asked: first ? [...s.asked, k] : s.asked },
    { k: 'you', text: `À propos de : ${topic.title}` },
    { k: 'text', speaker: person.name, text: answer?.text ?? 'Rien à vous dire là-dessus.' },
  );
  // Les conséquences d'une réponse ne valent qu'une fois.
  return first && answer ? logged(apply(world, base, answer.effects)) : same(base);
}

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
  s.talk = s.talk && world.people[s.talk.person] ? { person: s.talk.person } : null;
  s.day = Number.isFinite(s.day) && s.day >= 1 ? Math.floor(s.day) : 1;
  s.markers = obj(s.markers);
  s.dossier = arr(s.dossier);
  s.uniform = s.uniform !== false;
  s.asked = arr(s.asked);
  s.reports = Object.fromEntries(Object.entries(obj(s.reports)).filter(([id]) => world.reports[id]));
  s.pendingReports = arr(s.pendingReports).filter((id) => world.reports[id]);
  s.fired = arr(s.fired);
  s.news = arr(s.news).filter((id) => world.events.some((e) => e.id === id));
  s.skills = Object.fromEntries(Object.entries(obj(s.skills)).filter(([id]) => world.skills.some((k) => k.id === id)));
  s.points = Number.isFinite(s.points) && s.points >= 0 ? Math.floor(s.points) : 0;
  s.checks = obj(s.checks);
  s.learned = arr(s.learned);
  s.log = arr(s.log);
  s.notes = arr(s.notes).filter((n) => n && world.maps[n.map]);
  return s;
}

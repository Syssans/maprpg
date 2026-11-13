// Le monde tel que le moteur le comprend. Il est produit par `parser.ts`
// à partir des fichiers texte du dossier `content/` : personne n'écrit ceci à la main.

/** Emplacement d'origine dans les fichiers de contenu, pour les messages du vérificateur. */
export interface Src {
  file: string;
  line: number;
}

export type Op = '>=' | '<=' | '>' | '<' | '=';

export type Clause =
  | { k: 'flag'; id: string; not: boolean }
  | { k: 'item'; id: string; not: boolean }
  | { k: 'quest'; id: string; state: 'none' | 'started' | 'active' | 'done' | 'stage'; stage?: string }
  | { k: 'knows'; id: string; not: boolean }
  | { k: 'contradiction'; id: string }
  | { k: 'day'; op: Op; n: number }
  | { k: 'since'; id: string; op: Op; n: number }
  | { k: 'dossier'; word?: string; op: Op; n: number }
  | { k: 'uniform'; on: boolean }
  | { k: 'skill'; id: string; op: Op; n: number }
  | { k: 'visited'; place: string }
  | { k: 'here'; place: string };

/** Toutes les clauses doivent être vraies. Une liste vide est toujours vraie. */
export type Cond = Clause[];

export type Effect =
  | { k: 'flag'; id: string; on: boolean }
  | { k: 'item'; id: string; give: boolean }
  | { k: 'quest'; id: string; stage?: string; close?: boolean }
  | { k: 'days'; n: number }
  | { k: 'marker'; id: string }
  | { k: 'dossier'; word: string; note?: string }
  | { k: 'report'; id: string }
  | { k: 'goto'; place: string }
  | { k: 'scene'; id: string }
  | { k: 'learn'; id: string }
  | { k: 'points'; n: number }
  | { k: 'skill'; id: string; n: number };

export interface Place {
  id: string;
  name: string;
  x: number;
  y: number;
  region?: string;
  description: string;
  /** La première variante dont la condition est remplie remplace la description. */
  variants: { if: Cond; text: string; src: Src }[];
  /** Annotations : toutes celles dont la condition est remplie s'ajoutent sous la description. */
  notes: { if: Cond; text: string; src: Src }[];
  enters?: string;
  src: Src;
}

export interface Route {
  a: string;
  b: string;
  days: number;
  src: Src;
}

export interface MapDef {
  id: string;
  name: string;
  image: string;
  width: number;
  height: number;
  printedLabels: boolean;
  entry: string;
  parent?: string;
  places: Place[];
  routes: Route[];
  src: Src;
}

/** Un jet de dés attaché à un choix : deux dés + le talent contre une difficulté. */
export interface Test {
  skill: string;
  difficulty: number;
  /** Sans retour : une seule tentative, quoi qu'il arrive ensuite. */
  once: boolean;
  /** Passage où mène l'échec. */
  fail?: string;
  mods: { value: number; if: Cond; text: string; src: Src }[];
}

export interface Choice {
  text: string;
  /** Passage suivant ; pour un jet, celui de la réussite. */
  next?: string;
  test?: Test;
  if: Cond;
  effects: Effect[];
  src: Src;
}

export interface SceneNode {
  id: string;
  speaker?: string;
  text: string;
  /** Remarques qu'un talent souffle au joueur s'il est assez élevé. */
  passives: { skill: string; level: number; text: string; src: Src }[];
  effects: Effect[];
  choices: Choice[];
  src: Src;
}

export interface Scene {
  id: string;
  /** « carte/lieu ». Absent : la scène n'est lancée que par un effet « + scène ». */
  place?: string;
  label: string;
  starts: { node: string; if: Cond; src: Src }[];
  nodes: Record<string, SceneNode>;
  src: Src;
}

export interface Answer {
  /** Identifiant d'un sujet du Savoir, ou « * » pour la réponse par défaut. */
  topic: string;
  /** Réponse réservée au cas où le joueur tient une contradiction sur ce sujet. */
  confront: boolean;
  if: Cond;
  text: string;
  effects: Effect[];
  src: Src;
}

export interface Person {
  id: string;
  name: string;
  place: string;
  if: Cond;
  intro: string;
  answers: Answer[];
  src: Src;
}

export type ReportTag = 'vrai' | 'faux' | 'omis';

export interface Report {
  id: string;
  title: string;
  intro: string;
  points: {
    title: string;
    options: { tag: ReportTag; text: string; if: Cond; effects: Effect[]; src: Src }[];
    src: Src;
  }[];
  src: Src;
}

export interface GameEvent {
  id: string;
  title: string;
  if: Cond;
  text: string;
  effects: Effect[];
  src: Src;
}

export interface Lore {
  id: string;
  title: string;
  versions: { source: string; if: Cond; text: string; contradicts: boolean; src: Src }[];
  src: Src;
}

export interface Quest {
  id: string;
  title: string;
  stages: Record<string, string>;
  epilogue?: string;
  src: Src;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  src: Src;
}

export interface Skill {
  id: string;
  name: string;
  group: string;
  description: string;
  src: Src;
}

export interface Game {
  title: string;
  origin: string;
  startMap: string;
  year: number;
  dayOfYear: number;
  yearLength: number;
  /** Nombre de lunes l'année de départ ; il alterne ensuite d'une année sur l'autre. */
  moons: number;
  /** Points de talent à répartir en commençant. */
  startPoints: number;
}

export interface World {
  game: Game;
  maps: Record<string, MapDef>;
  items: Record<string, Item>;
  quests: Record<string, Quest>;
  lore: Lore[];
  scenes: Record<string, Scene>;
  people: Record<string, Person>;
  reports: Record<string, Report>;
  events: GameEvent[];
  skills: Skill[];
}

export interface LogEntry {
  /** text : ce qu'on lit · you : choix du joueur · notice : conséquence · title : en-tête · voice : un talent parle · roll : jet */
  k: 'text' | 'you' | 'notice' | 'title' | 'voice' | 'roll';
  /** Pour un jet : réussi ou non. */
  ok?: boolean;
  speaker?: string;
  text: string;
}

export interface Note {
  id: string;
  map: string;
  x: number;
  y: number;
  text: string;
}

/** État d'un joueur : sérialisable, donc sauvegardable, exportable, synchronisable. */
export interface PlayerState {
  mapId: string;
  positions: Record<string, string>;
  /** Clés « carte/lieu » */
  visited: string[];
  flags: string[];
  inventory: Record<string, number>;
  quests: Record<string, { stage: string; done: boolean }>;
  dialogue: { scene: string; node: string } | null;
  /** Jours écoulés depuis le début de la partie, à partir de 1. */
  day: number;
  /** Repères : jour auquel chacun a été posé. */
  markers: Record<string, number>;
  /** Ce que l'Inquisition a noté. Le joueur n'en voit que le poids. */
  dossier: { word: string; note?: string; day: number }[];
  uniform: boolean;
  /** Conversation en cours avec une personne. */
  talk: { person: string } | null;
  /** Fil de la scène ou de la conversation en cours : tout ce qui s'y est dit, dans l'ordre. */
  log: LogEntry[];
  /** Niveaux gagnés dans chaque talent, au-delà du niveau de base. */
  skills: Record<string, number>;
  /** Points de talent à dépenser. */
  points: number;
  /** Jets déjà tentés : clé « scène/passage/choix ». `level` est le niveau du talent lors de la tentative. */
  checks: Record<string, { ok: boolean; level: number }>;
  /** Sujets du Savoir que le personnage a découverts en jeu. */
  learned: string[];
  /** Notes du joueur, épinglées sur les cartes. */
  notes: Note[];
  /** Clés « personne/sujet » déjà abordées. */
  asked: string[];
  reports: Record<string, { day: number; picks: number[] }>;
  pendingReports: string[];
  /** Événements déjà survenus. */
  fired: string[];
  /** Événements survenus que le joueur n'a pas encore lus. */
  news: string[];
}

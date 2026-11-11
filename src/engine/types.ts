// Format du contenu : tout l'univers (cartes, lieux, dialogues, quêtes, objets)
// est décrit par des données. Le moteur ne contient aucune narration.

export interface Condition {
  flags?: string[];
  notFlags?: string[];
  items?: string[];
  notItems?: string[];
  /** [idQuête, idÉtape] : la quête est en cours à cette étape */
  questStage?: [string, string];
  questNotStarted?: string;
  questDone?: string;
}

export interface Effect {
  setFlag?: string;
  giveItem?: string;
  takeItem?: string;
  /** [idQuête, idÉtape] : démarre la quête ou la fait avancer */
  questStage?: [string, string];
  completeQuest?: string;
}

export interface Place {
  id: string;
  name: string;
  /** Coordonnées en pixels sur l'image de la carte (origine en haut à gauche) */
  x: number;
  y: number;
  description: string;
  /** Carte de niveau inférieur dans laquelle on peut entrer depuis ce lieu */
  enters?: string;
  dialogue?: string;
  /** Libellé du bouton lançant le dialogue (« Parler », « Examiner »…) */
  actionLabel?: string;
}

export interface MapDef {
  id: string;
  name: string;
  image: string;
  width: number;
  height: number;
  /** Lieu d'arrivée quand on entre sur cette carte */
  entry: string;
  /** Carte de niveau supérieur (absente pour la carte du monde) */
  parent?: string;
  places: Place[];
  /** Chemins praticables entre deux lieux */
  routes: [string, string][];
}

export interface Choice {
  text: string;
  next?: string;
  if?: Condition;
  effects?: Effect[];
}

export interface DialogueNode {
  speaker?: string;
  text: string;
  effects?: Effect[];
  /** Sans choix, le dialogue se termine après ce nœud */
  choices?: Choice[];
}

export interface Dialogue {
  id: string;
  /** Premier nœud dont la condition est remplie */
  start: { if?: Condition; node: string }[];
  nodes: Record<string, DialogueNode>;
}

export interface Quest {
  id: string;
  title: string;
  stages: Record<string, string>;
  /** Texte du journal une fois la quête close */
  epilogue?: string;
}

export interface Item {
  id: string;
  name: string;
  description: string;
}

export interface World {
  startMap: string;
  maps: Record<string, MapDef>;
  dialogues: Record<string, Dialogue>;
  quests: Record<string, Quest>;
  items: Record<string, Item>;
}

/** État d'un joueur : sérialisable, donc sauvegardable ou synchronisable avec un serveur. */
export interface PlayerState {
  mapId: string;
  /** Position du joueur sur chaque carte déjà parcourue */
  positions: Record<string, string>;
  /** Clés « carte/lieu » */
  visited: string[];
  flags: string[];
  inventory: Record<string, number>;
  quests: Record<string, { stage: string; done: boolean }>;
  dialogue: { id: string; node: string } | null;
}

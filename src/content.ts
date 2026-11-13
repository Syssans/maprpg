// Charge les fichiers texte de `content/` et en fait le monde du jeu.
// L'atelier d'écriture peut y ajouter des documents rédigés dans le jeu : le monde est alors reconstruit.
import { parse, type Problem, type SourceFile } from './engine/parser';
import { validate } from './engine/validate';
import type { World } from './engine/types';

const raw = import.meta.glob('../content/**/*.txt', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;

const base: SourceFile[] = Object.keys(raw)
  .sort()
  .map((path) => ({ path: path.replace(/^\.\.\//, ''), text: raw[path] }));

const isPlayable = (w: World) => !!w.maps[w.game.startMap]?.places.some((p) => p.id === w.maps[w.game.startMap].entry);

function build(extras: SourceFile[]) {
  const parsed = parse([...base, ...extras]);
  return { world: parsed.world, problems: [...parsed.problems, ...validate(parsed.world)] };
}

// ——— Documents de l'atelier, gardés sur l'appareil ———

const DRAFTS = 'sanctuaire-atelier';

export interface Draft {
  name: string;
  text: string;
}

export const draftPath = (name: string) => `atelier/${name}.txt`;

export function loadDrafts(): Draft[] {
  try {
    const v = JSON.parse(localStorage.getItem(DRAFTS) ?? '[]');
    return Array.isArray(v) ? v.filter((d) => d && typeof d.name === 'string' && typeof d.text === 'string') : [];
  } catch {
    return [];
  }
}

export function saveDrafts(drafts: Draft[]) {
  try {
    localStorage.setItem(DRAFTS, JSON.stringify(drafts));
  } catch {
    // Sans stockage, les documents ne vivent que le temps de la page.
  }
}

const toFiles = (drafts: Draft[]) => drafts.map((d) => ({ path: draftPath(d.name), text: d.text }));

// Ces liaisons sont vivantes : tout module qui importe `world` voit le monde reconstruit.
let current = build(toFiles(loadDrafts()));
/** Les documents de l'atelier sont-ils pris en compte ? Non s'ils rendent le monde injouable. */
export let draftsApplied = true;
if (!isPlayable(current.world)) {
  draftsApplied = false;
  current = { ...build([]), problems: current.problems };
}

export let world: World = current.world;
export let problems: Problem[] = current.problems;
export const playable = isPlayable(world);

/** Reconstruit le monde avec ces documents d'atelier. Renvoie les problèmes relevés. */
export function rebuild(drafts: Draft[]): Problem[] {
  const next = build(toFiles(drafts));
  problems = next.problems;
  draftsApplied = isPlayable(next.world);
  if (draftsApplied) world = next.world;
  return problems;
}

/** Chemin d'une ressource du dossier public/, quel que soit l'endroit où le jeu est hébergé. */
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;

const AUTHOR = 'sanctuaire-auteur';
const stored = (() => {
  try {
    return localStorage.getItem(AUTHOR) === '1';
  } catch {
    return false;
  }
})();

/** Le mode auteur s'ouvre en développement, par « #auteur » dans l'adresse, ou depuis la page du personnage. */
export const authorDefault =
  import.meta.env.DEV || stored || new URLSearchParams(location.search).has('auteur') || location.hash === '#auteur';

export function rememberAuthor(on: boolean) {
  try {
    localStorage.setItem(AUTHOR, on ? '1' : '0');
  } catch {
    // sans importance
  }
}

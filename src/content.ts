// Charge les fichiers texte de `content/` et en fait le monde du jeu.
import { parse, type Problem } from './engine/parser';
import { validate } from './engine/validate';

const raw = import.meta.glob('../content/**/*.txt', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;

const files = Object.keys(raw)
  .sort()
  .map((path) => ({ path: path.replace(/^\.\.\//, ''), text: raw[path] }));

const parsed = parse(files);

export const world = parsed.world;
export const problems: Problem[] = [...parsed.problems, ...validate(parsed.world)];
/** Le monde est-il jouable ? Sans carte de départ, rien ne peut s'afficher. */
export const playable = !!world.maps[world.game.startMap]?.places.some(
  (p) => p.id === world.maps[world.game.startMap].entry,
);

/** Chemin d'une ressource du dossier public/, quel que soit l'endroit où le jeu est hébergé. */
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;

/** Le mode auteur s'ouvre en développement, ou en ajoutant « ?auteur » ou « #auteur » à l'adresse. */
export const authorMode =
  import.meta.env.DEV || new URLSearchParams(location.search).has('auteur') || location.hash === '#auteur';

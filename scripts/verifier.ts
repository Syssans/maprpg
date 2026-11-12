// Vérifie le contenu du dossier `content/` :  npm run verifier
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse, type Problem } from '../src/engine/parser';
import { validate } from '../src/engine/validate';

const root = join(import.meta.dirname, '..');
const dir = join(root, 'content');

function list(d: string): string[] {
  return readdirSync(d)
    .sort()
    .flatMap((name) => {
      const p = join(d, name);
      return statSync(p).isDirectory() ? list(p) : name.endsWith('.txt') ? [p] : [];
    });
}

const files = list(dir).map((p) => ({ path: relative(root, p), text: readFileSync(p, 'utf8') }));
const { world, problems } = parse(files);
const all: Problem[] = [...problems, ...validate(world)];

for (const m of Object.values(world.maps))
  if (m.image && !existsSync(join(root, 'public', m.image)))
    all.push({ level: 'erreur', ...m.src, message: `L'image « ${m.image} » est introuvable dans le dossier public/.` });

const errors = all.filter((p) => p.level === 'erreur');
const warnings = all.filter((p) => p.level === 'avertissement');
for (const p of [...errors, ...warnings])
  console.log(`${p.level === 'erreur' ? 'ERREUR' : 'attention'}  ${p.file}${p.line ? ':' + p.line : ''}\n    ${p.message}`);

const places = Object.values(world.maps).reduce((n, m) => n + m.places.length, 0);
console.log(
  `\n${files.length} fichiers lus : ${places} lieux, ${Object.keys(world.scenes).length} scènes, ` +
    `${Object.keys(world.quests).length} quêtes, ${world.lore.length} sujets, ${Object.keys(world.people).length} personnes, ` +
    `${Object.keys(world.reports).length} rapports, ${world.events.length} événements.`,
);
console.log(errors.length ? `${errors.length} erreur(s), ${warnings.length} avertissement(s).` : `Aucune erreur, ${warnings.length} avertissement(s).`);
process.exit(errors.length ? 1 : 0);

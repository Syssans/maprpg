// Lit les fichiers texte du dossier `content/` et en fait un monde.
// La syntaxe est décrite, pour l'auteur, dans `content/LISEZ-MOI.md`.
// Ce module ne dépend ni du navigateur ni de Node : le jeu et le vérificateur l'utilisent tous deux.
import type {
  Answer,
  Clause,
  Cond,
  Effect,
  Game,
  Op,
  Place,
  ReportTag,
  Route,
  Src,
  World,
} from './types';

export interface Problem {
  level: 'erreur' | 'avertissement';
  file: string;
  line: number;
  message: string;
}

export interface SourceFile {
  path: string;
  text: string;
}

/** Sans accents, en minuscules : sert à reconnaître les mots-clés et à former les identifiants. */
export const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

const ident = (s: string) => norm(s).replace(/\s+/g, '-');
const ref = (s: string) => s.split('/').map(ident).join('/');

interface Line {
  no: number;
  s: string;
}

interface Variant {
  prose: Prose;
  if: Cond;
  src: Src;
}

interface Block {
  type: string;
  id: string;
  at?: string;
  title: string;
  cond: Cond;
  lines: Line[];
  src: Src;
}

/** Accumule des lignes de prose : les lignes vides séparent les paragraphes. */
class Prose {
  private paras: string[] = [];
  private cur: string[] = [];
  add(s: string) {
    if (s.trim() === '') this.flush();
    else this.cur.push(s.trim());
  }
  private flush() {
    if (this.cur.length) this.paras.push(this.cur.join(' '));
    this.cur = [];
  }
  get text() {
    this.flush();
    return this.paras.join('\n\n');
  }
}

export function parse(files: SourceFile[]): { world: World; problems: Problem[] } {
  const problems: Problem[] = [];
  const err = (src: Src, message: string) => problems.push({ level: 'erreur', ...src, message });
  const warn = (src: Src, message: string) => problems.push({ level: 'avertissement', ...src, message });

  // ——— Conditions et effets ———

  function parseCond(text: string, src: Src): Cond {
    const out: Cond = [];
    for (const raw of norm(text).split(/\s*,\s*|\s+et\s+/)) {
      const c = raw.trim();
      if (!c) continue;
      let m: RegExpExecArray | null;
      let clause: Clause | null = null;
      if ((m = /^(pas )?fait (\S+)$/.exec(c))) clause = { k: 'flag', id: m[2], not: !!m[1] };
      else if (c === 'en uniforme') clause = { k: 'uniform', on: true };
      else if (c === 'sans uniforme') clause = { k: 'uniform', on: false };
      else if ((m = /^(a|sans) (\S+)$/.exec(c))) clause = { k: 'item', id: m[2], not: m[1] === 'sans' };
      else if ((m = /^quete (\S+) (non commencee|commencee|en cours|close)$/.exec(c))) {
        const state = { 'non commencee': 'none', commencee: 'started', 'en cours': 'active', close: 'done' } as const;
        clause = { k: 'quest', id: m[1], state: state[m[2] as keyof typeof state] };
      } else if ((m = /^quete (\S+) = (\S+)$/.exec(c))) clause = { k: 'quest', id: m[1], state: 'stage', stage: m[2] };
      else if ((m = /^(sait|ignore) (\S+)$/.exec(c))) clause = { k: 'knows', id: m[2], not: m[1] === 'ignore' };
      else if ((m = /^contradiction (\S+)$/.exec(c))) clause = { k: 'contradiction', id: m[1] };
      else if ((m = /^jour (>=|<=|>|<|=) (\d+)$/.exec(c))) clause = { k: 'day', op: m[1] as Op, n: +m[2] };
      else if ((m = /^depuis (\S+) (>=|<=|>|<|=) (\d+)$/.exec(c)))
        clause = { k: 'since', id: m[1], op: m[2] as Op, n: +m[3] };
      else if ((m = /^dossier (?:(\S+) )?(>=|<=|>|<|=) (\d+)$/.exec(c)))
        clause = { k: 'dossier', word: m[1], op: m[2] as Op, n: +m[3] };
      else if ((m = /^(visite|ici) (\S+)$/.exec(c)))
        clause = { k: m[1] === 'ici' ? 'here' : 'visited', place: m[2] };
      if (clause) out.push(clause);
      else err(src, `Condition incomprise : « ${raw} ».`);
    }
    return out;
  }

  /** Détache une condition « [si …] » placée en fin de ligne. */
  function takeCond(s: string, src: Src): { rest: string; cond: Cond } {
    const m = /\[\s*si\s+([^\]]*)\]\s*$/i.exec(s);
    if (!m) return { rest: s.trim(), cond: [] };
    return { rest: s.slice(0, m.index).trim(), cond: parseCond(m[1], src) };
  }

  const isEffect = (s: string) => /^\+\s/.test(s) || /^-\s+(fait|objet)\s/i.test(s);

  function parseEffect(s: string, src: Src): Effect | null {
    const on = s[0] === '+';
    const body = s.slice(1).trim();
    const n = norm(body);
    let m: RegExpExecArray | null;
    if ((m = /^fait (\S+)$/.exec(n))) return { k: 'flag', id: m[1], on };
    if ((m = /^objet (\S+)$/.exec(n))) return { k: 'item', id: m[1], give: on };
    if ((m = /^quete (\S+) = (\S+)$/.exec(n))) return { k: 'quest', id: m[1], stage: m[2] };
    if ((m = /^quete (\S+) close$/.exec(n))) return { k: 'quest', id: m[1], close: true };
    if ((m = /^jours? (\d+)$/.exec(n))) return { k: 'days', n: +m[1] };
    if ((m = /^repere (\S+)$/.exec(n))) return { k: 'marker', id: m[1] };
    if ((m = /^dossier (\S+?)(\s*:.*)?$/.exec(n))) {
      const colon = body.indexOf(':');
      return { k: 'dossier', word: m[1], note: colon >= 0 ? body.slice(colon + 1).trim() : undefined };
    }
    if ((m = /^rapport (\S+)$/.exec(n))) return { k: 'report', id: m[1] };
    if ((m = /^va (\S+)$/.exec(n))) return { k: 'goto', place: m[1] };
    if ((m = /^scene (\S+)$/.exec(n))) return { k: 'scene', id: m[1] };
    err(src, `Effet incompris : « ${s} ».`);
    return null;
  }

  // ——— Découpage en blocs ———

  const blocks: Block[] = [];
  for (const file of files) {
    let cur: Block | null = null;
    file.text.split(/\r?\n/).forEach((raw, i) => {
      const src = { file: file.path, line: i + 1 };
      const s = raw.trim();
      if (s.startsWith('//')) return;
      const head = /^==\s*(\S+)\s*(.*)$/.exec(s);
      if (head) {
        const { rest, cond } = takeCond(head[2], src);
        const colon = rest.indexOf(':');
        const left = colon >= 0 ? rest.slice(0, colon) : rest;
        const [rawId, at] = left.split('@').map((p) => p.trim());
        cur = {
          type: norm(head[1]),
          id: ref(rawId ?? ''),
          at: at ? ref(at) : undefined,
          title: colon >= 0 ? rest.slice(colon + 1).trim() : '',
          cond,
          lines: [],
          src,
        };
        blocks.push(cur);
      } else if (cur) cur.lines.push({ no: i + 1, s });
      else if (s) err(src, 'Texte placé avant tout bloc « == ».');
    });
  }

  // ——— Construction du monde ———

  const game: Game = {
    title: 'Voyageur',
    origin: '',
    startMap: '',
    year: 1,
    dayOfYear: 1,
    yearLength: 225,
    moons: 1,
  };
  const world: World = {
    game,
    maps: {},
    items: {},
    quests: {},
    lore: [],
    scenes: {},
    people: {},
    reports: {},
    events: [],
    layers: {},
  };
  const places: { map: string; place: Place; routes: { to: string; days: number; src: Src }[] }[] = [];
  const seen = new Set<string>();

  /** « clé : valeur », la clé étant comparée sans accents. */
  const keyValue = (s: string): [string, string] | null => {
    const m = /^([^:=\[]+?)\s*[:=]\s*(.*)$/.exec(s);
    return m ? [norm(m[1]), m[2].trim()] : null;
  };
  const bracket = (s: string) => /^\[([^\]]*)\]\s*(.*)$/.exec(s);

  for (const b of blocks) {
    const at = (l: Line): Src => ({ file: b.src.file, line: l.no });
    const needId = () => {
      if (!b.id) err(b.src, `Il manque un identifiant après « == ${b.type.toUpperCase()} ».`);
      const k = `${b.type}:${b.id}`;
      if (seen.has(k)) err(b.src, `« ${b.id} » est défini deux fois (${b.type}).`);
      seen.add(k);
      return !!b.id;
    };
    const effect = (l: Line, into: Effect[]) => {
      const e = parseEffect(l.s, at(l));
      if (e) into.push(e);
    };

    switch (b.type) {
      case 'jeu': {
        for (const l of b.lines) {
          if (!l.s) continue;
          const kv = keyValue(l.s);
          if (!kv) err(at(l), `Ligne incomprise : « ${l.s} ».`);
          else if (kv[0] === 'personnage') game.title = kv[1];
          else if (kv[0] === 'origine') game.origin = kv[1];
          else if (kv[0] === 'depart') game.startMap = ident(kv[1]);
          else if (kv[0] === 'an') game.year = +kv[1];
          else if (kv[0] === 'jour') game.dayOfYear = +kv[1];
          else if (kv[0] === 'jours par an') game.yearLength = +kv[1];
          else if (kv[0] === 'lunes') game.moons = +kv[1];
          else err(at(l), `Réglage inconnu : « ${kv[0]} ».`);
        }
        break;
      }

      case 'carte': {
        if (!needId()) break;
        const map = {
          id: b.id,
          name: b.title || b.id,
          image: '',
          width: 0,
          height: 0,
          printedLabels: false,
          entry: '',
          parent: undefined as string | undefined,
          places: [],
          routes: [],
          src: b.src,
        };
        for (const l of b.lines) {
          if (!l.s) continue;
          const kv = keyValue(l.s);
          if (!kv) err(at(l), `Ligne incomprise : « ${l.s} ».`);
          else if (kv[0] === 'image') map.image = kv[1];
          else if (kv[0] === 'taille') {
            const m = /^(\d+)\s*[x×]\s*(\d+)$/i.exec(kv[1]);
            if (m) [map.width, map.height] = [+m[1], +m[2]];
            else err(at(l), 'La taille s’écrit « largeur x hauteur », par exemple « 2000 x 1564 ».');
          } else if (kv[0] === 'entree') map.entry = ident(kv[1]);
          else if (kv[0] === 'parent') map.parent = ident(kv[1]);
          else if (kv[0] === 'noms imprimes') map.printedLabels = norm(kv[1]) === 'oui';
          else err(at(l), `Réglage de carte inconnu : « ${kv[0]} ».`);
        }
        world.maps[b.id] = map;
        break;
      }

      case 'lieu': {
        if (!needId()) break;
        const [mapId, placeId] = b.id.split('/');
        if (!placeId) {
          err(b.src, 'Un lieu se nomme « carte/lieu », par exemple « monde/courveil ».');
          break;
        }
        const place: Place = {
          id: placeId,
          name: b.title || placeId,
          x: 0,
          y: 0,
          description: '',
          variants: [],
          notes: [],
          layers: [],
          src: b.src,
        };
        const routes: { to: string; days: number; src: Src }[] = [];
        const prose = new Prose();
        let variant: Variant | null = null;
        const variants: Variant[] = [];
        let positioned = false;
        for (const l of b.lines) {
          let m: RegExpExecArray | null;
          const n = norm(l.s);
          if ((m = /^position\s*:\s*(-?\d+)\s*,\s*(-?\d+)$/.exec(n))) {
            [place.x, place.y] = [+m[1], +m[2]];
            positioned = true;
          } else if (/^region\s*:/.test(n)) place.region = l.s.slice(l.s.indexOf(':') + 1).trim();
          else if (/^entre dans\s*:/.test(n)) place.enters = ident(l.s.slice(l.s.indexOf(':') + 1));
          else if (/^chemins?\s*:/.test(n)) {
            for (const part of n.slice(n.indexOf(':') + 1).split(',')) {
              const r = /^(\S+)(?:\s*\((\d+)(?:\s*jours?)?\))?$/.exec(part.trim());
              if (r) routes.push({ to: r[1], days: r[2] ? +r[2] : 1, src: at(l) });
              else if (part.trim()) err(at(l), `Chemin incompris : « ${part.trim()} ». Exemple : « terner (3) ».`);
            }
          } else if ((m = /^calque\s+(\S+)\s*=\s*(\S+)\s*(\[.*\])?$/.exec(n))) {
            place.layers.push({ layer: m[1], value: m[2], if: takeCond(l.s, at(l)).cond, src: at(l) });
          } else if ((m = /^note\s*(\[[^\]]*\])?\s*:\s*(.*)$/i.exec(l.s))) {
            place.notes.push({ if: m[1] ? takeCond(m[1], at(l)).cond : [], text: m[2].trim(), src: at(l) });
          } else if ((m = bracket(l.s))) {
            variant = { prose: new Prose(), if: takeCond(`[${m[1]}]`, at(l)).cond, src: at(l) };
            if (!/^\s*si\s/i.test(m[1])) err(at(l), 'Une variante de description commence par « [si …] ».');
            variant.prose.add(m[2]);
            variants.push(variant);
          } else (variant ? variant.prose : prose).add(l.s);
        }
        if (!positioned) err(b.src, `Le lieu « ${b.id} » n'a pas de ligne « position : x, y ».`);
        place.description = prose.text;
        place.variants = variants.map((v) => ({ if: v.if, text: v.prose.text, src: v.src }));
        places.push({ map: mapId, place, routes });
        break;
      }

      case 'objet': {
        if (!needId()) break;
        const prose = new Prose();
        b.lines.forEach((l) => prose.add(l.s));
        world.items[b.id] = { id: b.id, name: b.title || b.id, description: prose.text, src: b.src };
        break;
      }

      case 'quete': {
        if (!needId()) break;
        const stages: Record<string, Prose> = {};
        let epilogue: Prose | null = null;
        let cur: Prose | null = null;
        for (const l of b.lines) {
          let m: RegExpExecArray | null;
          if ((m = /^[ée]tape\s+(\S+)\s*:\s*(.*)$/i.exec(l.s))) {
            cur = stages[ident(m[1])] = new Prose();
            cur.add(m[2]);
          } else if ((m = /^[ée]pilogue\s*:\s*(.*)$/i.exec(l.s))) {
            cur = epilogue = new Prose();
            cur.add(m[1]);
          } else if (cur) cur.add(l.s);
          else if (l.s) err(at(l), 'Dans une quête, chaque texte commence par « étape nom : » ou « épilogue : ».');
        }
        world.quests[b.id] = {
          id: b.id,
          title: b.title || b.id,
          stages: Object.fromEntries(Object.entries(stages).map(([k, p]) => [k, p.text])),
          epilogue: epilogue ? (epilogue as Prose).text : undefined,
          src: b.src,
        };
        break;
      }

      case 'savoir': {
        if (!needId()) break;
        const versions: { source: string; if: Cond; contradicts: boolean; prose: Prose; src: Src }[] = [];
        for (const l of b.lines) {
          const m = bracket(l.s);
          if (m) {
            const parts = m[1].split('|').map((p) => p.trim());
            const v = { source: parts[0], if: [] as Cond, contradicts: false, prose: new Prose(), src: at(l) };
            for (const p of parts.slice(1)) {
              if (norm(p) === 'contredit') v.contradicts = true;
              else if (/^si\s/i.test(p)) v.if = parseCond(p.replace(/^si\s+/i, ''), at(l));
              else err(at(l), `Mention incomprise dans l'en-tête de version : « ${p} ».`);
            }
            v.prose.add(m[2]);
            versions.push(v);
          } else if (versions.length) versions[versions.length - 1].prose.add(l.s);
          else if (l.s) err(at(l), 'Chaque version commence par sa source entre crochets : « [Ce qu’on vous a enseigné] … ».');
        }
        world.lore.push({
          id: b.id,
          title: b.title || b.id,
          versions: versions.map(({ prose, ...v }) => ({ ...v, text: prose.text })),
          src: b.src,
        });
        break;
      }

      case 'scene': {
        if (!needId()) break;
        const scene = {
          id: b.id,
          place: b.at,
          label: b.title || 'Poursuivre',
          starts: [] as { node: string; if: Cond; src: Src }[],
          nodes: {} as World['scenes'][string]['nodes'],
          src: b.src,
        };
        let node: (World['scenes'][string]['nodes'][string] & { prose: Prose }) | null = null;
        const order: string[] = [];
        const close = () => {
          if (node) node.text = node.prose.text;
        };
        for (const l of b.lines) {
          let m: RegExpExecArray | null;
          if ((m = /^---+\s*(\S+)/.exec(l.s))) {
            close();
            const id = ident(m[1]);
            if (scene.nodes[id]) err(at(l), `Le passage « ${id} » existe déjà dans cette scène.`);
            node = { id, text: '', effects: [], choices: [], src: at(l), prose: new Prose() };
            scene.nodes[id] = node;
            order.push(id);
          } else if (!node) {
            if ((m = /^d[ée]but\s+(\S+)\s*(\[.*\])?$/i.exec(l.s)))
              scene.starts.push({ node: ident(m[1]), if: takeCond(l.s, at(l)).cond, src: at(l) });
            else if (l.s) err(at(l), 'Avant le premier passage « --- nom », seules les lignes « début … » sont admises.');
          } else if (l.s.startsWith('@')) node.speaker = l.s.slice(1).trim();
          else if (l.s.startsWith('>')) {
            const { rest, cond } = takeCond(l.s.slice(1), at(l));
            const arrow = rest.lastIndexOf('->');
            node.choices.push({
              text: (arrow >= 0 ? rest.slice(0, arrow) : rest).trim(),
              next: arrow >= 0 ? ident(rest.slice(arrow + 2)) : undefined,
              if: cond,
              effects: [],
              src: at(l),
            });
          } else if (isEffect(l.s)) {
            const last = node.choices[node.choices.length - 1];
            effect(l, last ? last.effects : node.effects);
          } else if (node.choices.length && l.s) {
            err(at(l), 'Le texte d’un passage se place avant ses choix « > ».');
          } else node.prose.add(l.s);
        }
        close();
        for (const n of Object.values(scene.nodes)) delete (n as { prose?: Prose }).prose;
        if (!scene.starts.length && order.length) scene.starts.push({ node: order[0], if: [], src: b.src });
        world.scenes[b.id] = scene;
        break;
      }

      case 'personne': {
        if (!needId()) break;
        const intro = new Prose();
        const answers: (Answer & { prose: Prose })[] = [];
        for (const l of b.lines) {
          const m = /^([?!])\s*(\S+)\s*(\[[^\]]*\])?\s*:\s*(.*)$/.exec(l.s);
          if (m) {
            const a = {
              topic: m[2] === '*' ? '*' : ident(m[2]),
              confront: m[1] === '!',
              if: m[3] ? takeCond(m[3], at(l)).cond : [],
              text: '',
              effects: [],
              src: at(l),
              prose: new Prose(),
            };
            a.prose.add(m[4]);
            answers.push(a);
          } else if (isEffect(l.s)) {
            if (answers.length) effect(l, answers[answers.length - 1].effects);
            else err(at(l), 'Un effet doit suivre une réponse « ? sujet : … ».');
          } else (answers.length ? answers[answers.length - 1].prose : intro).add(l.s);
        }
        if (!b.at) err(b.src, `La personne « ${b.id} » n'est placée nulle part : ajoutez « @ carte/lieu ».`);
        world.people[b.id] = {
          id: b.id,
          name: b.title || b.id,
          place: b.at ?? '',
          if: b.cond,
          intro: intro.text,
          answers: answers.map(({ prose, ...a }) => ({ ...a, text: prose.text })),
          src: b.src,
        };
        break;
      }

      case 'rapport': {
        if (!needId()) break;
        const intro = new Prose();
        const points: World['reports'][string]['points'] = [];
        for (const l of b.lines) {
          let m: RegExpExecArray | null;
          if ((m = /^\*\s*(.+)$/.exec(l.s))) points.push({ title: m[1].trim(), options: [], src: at(l) });
          else if ((m = /^=\s*(\S+)\s*:\s*(.*)$/.exec(l.s))) {
            const tag = norm(m[1]);
            const { rest, cond } = takeCond(m[2], at(l));
            if (!points.length) err(at(l), 'Une réponse « = » doit suivre un point « * ».');
            else if (tag !== 'vrai' && tag !== 'faux' && tag !== 'omis')
              err(at(l), `Une réponse de rapport est « vrai », « faux » ou « omis », pas « ${m[1]} ».`);
            else
              points[points.length - 1].options.push({ tag: tag as ReportTag, text: rest, if: cond, effects: [], src: at(l) });
          } else if (isEffect(l.s)) {
            const opts = points[points.length - 1]?.options;
            if (opts?.length) effect(l, opts[opts.length - 1].effects);
            else err(at(l), 'Un effet doit suivre une réponse « = ».');
          } else if (!points.length) intro.add(l.s);
          else if (l.s) err(at(l), `Ligne incomprise dans le rapport : « ${l.s} ».`);
        }
        world.reports[b.id] = { id: b.id, title: b.title || 'Rapport', intro: intro.text, points, src: b.src };
        break;
      }

      case 'evenement': {
        if (!needId()) break;
        const prose = new Prose();
        const effects: Effect[] = [];
        for (const l of b.lines) (isEffect(l.s) ? effect(l, effects) : prose.add(l.s));
        if (!b.cond.length) warn(b.src, `L'événement « ${b.id} » n'a pas de condition « [si …] » : il surviendra dès le début.`);
        world.events.push({ id: b.id, title: b.title, if: b.cond, text: prose.text, effects, src: b.src });
        break;
      }

      case 'calque': {
        if (!needId()) break;
        const values: Record<string, { label: string; color: string }> = {};
        for (const l of b.lines) {
          const m = /^valeur\s+(\S+)\s*:\s*(.*?)\s*(#[0-9a-f]{3,8})?$/i.exec(l.s);
          if (m) values[ident(m[1])] = { label: m[2], color: m[3] ?? '#7a2e22' };
          else if (l.s) err(at(l), 'Une ligne de calque s’écrit « valeur nom : Libellé #couleur ».');
        }
        world.layers[b.id] = { id: b.id, name: b.title || b.id, values, src: b.src };
        break;
      }

      default:
        err(b.src, `Type de bloc inconnu : « ${b.type} ».`);
    }
  }

  // ——— Lieux et chemins rattachés à leurs cartes ———

  for (const { map, place } of places) {
    if (world.maps[map]) world.maps[map].places.push(place);
    else err(place.src, `Le lieu « ${place.id} » est sur la carte « ${map} », qui n'existe pas.`);
  }
  for (const { map, place, routes } of places) {
    const m = world.maps[map];
    if (!m) continue;
    for (const r of routes) {
      const existing = m.routes.find(
        (x: Route) => (x.a === place.id && x.b === r.to) || (x.b === place.id && x.a === r.to),
      );
      if (!existing) m.routes.push({ a: place.id, b: r.to, days: r.days, src: r.src });
      else if (existing.days !== r.days)
        warn(r.src, `Le chemin ${place.id} – ${r.to} est écrit deux fois avec des durées différentes (${existing.days} et ${r.days} jours).`);
    }
  }

  return { world, problems };
}

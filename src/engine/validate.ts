// Relit un monde et signale ce qui casserait en jeu : renvois vers rien,
// passages inatteignables, lieux isolés… Utilisé par `npm run verifier` et par le mode auteur.
import type { Problem } from './parser';
import type { Cond, Effect, Src, World } from './types';

interface Use {
  src: Src;
  cond?: Cond;
  effects?: Effect[];
}

/** Tout endroit du contenu qui porte une condition ou des effets. */
function uses(world: World): Use[] {
  const out: Use[] = [];
  for (const m of Object.values(world.maps))
    for (const p of m.places) {
      p.variants.forEach((v) => out.push({ src: v.src, cond: v.if }));
      p.notes.forEach((v) => out.push({ src: v.src, cond: v.if }));
    }
  for (const l of world.lore) l.versions.forEach((v) => out.push({ src: v.src, cond: v.if }));
  for (const s of Object.values(world.scenes)) {
    s.starts.forEach((st) => out.push({ src: st.src, cond: st.if }));
    for (const n of Object.values(s.nodes)) {
      out.push({ src: n.src, effects: n.effects });
      n.choices.forEach((c) => out.push({ src: c.src, cond: c.if, effects: c.effects }));
      n.choices.forEach((c) => c.test?.mods.forEach((m) => out.push({ src: m.src, cond: m.if })));
    }
  }
  for (const p of Object.values(world.people)) {
    out.push({ src: p.src, cond: p.if });
    p.answers.forEach((a) => out.push({ src: a.src, cond: a.if, effects: a.effects }));
  }
  for (const r of Object.values(world.reports))
    for (const pt of r.points) pt.options.forEach((o) => out.push({ src: o.src, cond: o.if, effects: o.effects }));
  for (const e of world.events) out.push({ src: e.src, cond: e.if, effects: e.effects });
  return out;
}

/** Tous les faits (« fait x ») que le contenu pose ou interroge. Sert au mode auteur. */
export function allFlags(world: World): string[] {
  const set = new Set<string>();
  for (const u of uses(world)) {
    u.cond?.forEach((c) => c.k === 'flag' && set.add(c.id));
    u.effects?.forEach((e) => e.k === 'flag' && set.add(e.id));
  }
  return [...set].sort();
}

export function validate(world: World): Problem[] {
  const problems: Problem[] = [];
  const err = (src: Src, message: string) => problems.push({ level: 'erreur', ...src, message });
  const warn = (src: Src, message: string) => problems.push({ level: 'avertissement', ...src, message });
  const nowhere: Src = { file: 'content', line: 0 };

  const placeExists = (ref: string) => {
    const [m, p] = ref.split('/');
    return !!world.maps[m]?.places.some((x) => x.id === p);
  };
  const loreIds = new Set(world.lore.map((l) => l.id));
  const skillIds = new Set(world.skills.map((k) => k.id));

  // ——— Jeu et cartes ———
  if (!world.game.startMap) err(nowhere, 'Aucun bloc « == JEU » n’indique la carte de départ (« départ : … »).');
  else if (!world.maps[world.game.startMap])
    err(nowhere, `La carte de départ « ${world.game.startMap} » n'existe pas.`);

  for (const m of Object.values(world.maps)) {
    const ids = new Set(m.places.map((p) => p.id));
    if (!m.image) err(m.src, `La carte « ${m.id} » n'a pas d'image.`);
    if (!m.width || !m.height) err(m.src, `La carte « ${m.id} » n'a pas de taille.`);
    if (!m.entry) err(m.src, `La carte « ${m.id} » n'a pas de lieu d'entrée (« entrée : … »).`);
    else if (!ids.has(m.entry)) err(m.src, `L'entrée « ${m.entry} » de la carte « ${m.id} » n'est pas un de ses lieux.`);
    if (m.parent && !world.maps[m.parent]) err(m.src, `La carte parente « ${m.parent} » n'existe pas.`);
    if (m.id !== world.game.startMap && !Object.values(world.maps).some((o) => o.places.some((p) => p.enters === m.id)))
      warn(m.src, `Aucun lieu ne permet d'entrer dans la carte « ${m.id} ».`);

    for (const r of m.routes) {
      for (const end of [r.a, r.b])
        if (!ids.has(end)) err(r.src, `Le chemin ${r.a} – ${r.b} mène à « ${end} », qui n'est pas un lieu de la carte « ${m.id} ».`);
      if (r.a === r.b) err(r.src, `Le lieu « ${r.a} » a un chemin vers lui-même.`);
    }
    for (const p of m.places) {
      if (p.x < 0 || p.y < 0 || p.x > m.width || p.y > m.height)
        warn(p.src, `Le lieu « ${p.id} » est placé hors de l'image de sa carte.`);
      if (!p.description) warn(p.src, `Le lieu « ${p.id} » n'a pas de description.`);
      if (p.enters) {
        const target = world.maps[p.enters];
        if (!target) err(p.src, `Le lieu « ${p.id} » ouvre sur la carte « ${p.enters} », qui n'existe pas.`);
        else if (target.parent !== m.id)
          warn(p.src, `On entre dans « ${p.enters} » depuis « ${m.id} », mais sa ligne « parent » dit autre chose : on ne pourra pas en ressortir ici.`);
      }
      if (m.places.length > 1 && !m.routes.some((r) => r.a === p.id || r.b === p.id))
        warn(p.src, `Le lieu « ${p.id} » n'est relié à aucun autre : on ne peut ni y aller ni en partir à pied.`);
    }
  }

  // ——— Scènes ———
  for (const s of Object.values(world.scenes)) {
    const nodes = Object.keys(s.nodes);
    if (!nodes.length) {
      err(s.src, `La scène « ${s.id} » n'a aucun passage « --- nom ».`);
      continue;
    }
    if (s.place && !placeExists(s.place)) err(s.src, `La scène « ${s.id} » se tient à « ${s.place} », qui n'existe pas.`);
    const reached = new Set<string>();
    const walk = (id: string) => {
      if (reached.has(id) || !s.nodes[id]) return;
      reached.add(id);
      s.nodes[id].choices.forEach((c) => {
        if (c.next) walk(c.next);
        if (c.test?.fail) walk(c.test.fail);
      });
    };
    for (const st of s.starts) {
      if (!s.nodes[st.node]) err(st.src, `La scène « ${s.id} » débute par « ${st.node} », qui n'existe pas.`);
      walk(st.node);
    }
    for (const n of Object.values(s.nodes)) {
      if (!reached.has(n.id)) warn(n.src, `Le passage « ${n.id} » de la scène « ${s.id} » n'est atteint par aucun choix.`);
      if (!n.text) warn(n.src, `Le passage « ${n.id} » de la scène « ${s.id} » n'a pas de texte.`);
      for (const p of n.passives)
        if (!skillIds.has(p.skill)) err(p.src, `Le talent « ${p.skill} » n'existe pas.`);
      for (const c of n.choices) {
        if (c.next && !s.nodes[c.next]) err(c.src, `Le choix « ${c.text} » mène à « ${c.next} », qui n'existe pas dans la scène « ${s.id} ».`);
        if (!c.test) continue;
        if (!skillIds.has(c.test.skill)) err(c.src, `Le talent « ${c.test.skill} » n'existe pas.`);
        if (!c.next || !c.test.fail) err(c.src, `Un jet mène à deux passages : « -> reussite / echec » (choix « ${c.text} »).`);
        else if (!s.nodes[c.test.fail]) err(c.src, `L'échec du jet mène à « ${c.test.fail} », qui n'existe pas dans la scène « ${s.id} ».`);
        if (c.test.difficulty < 3 || c.test.difficulty > 20) warn(c.src, `Une difficulté de ${c.test.difficulty} est hors de l'échelle utile (de 6, facile, à 16, presque impossible).`);
      }
      if (n.choices.length && n.choices.every((c) => c.test))
        warn(n.src, `Le passage « ${n.id} » (scène « ${s.id} ») n'offre que des jets : un échec sans retour peut y enfermer le joueur.`);
      if (n.choices.length && n.choices.every((c) => c.if.length))
        warn(n.src, `Tous les choix du passage « ${n.id} » (scène « ${s.id} ») ont une condition : si aucune n'est remplie, la scène s'arrêtera là.`);
    }
    if (!s.place && !uses(world).some((u) => u.effects?.some((e) => e.k === 'scene' && e.id === s.id)))
      warn(s.src, `La scène « ${s.id} » n'est attachée à aucun lieu et rien ne la déclenche.`);
  }

  // ——— Personnes ———
  for (const p of Object.values(world.people)) {
    if (p.place && !placeExists(p.place)) err(p.src, `« ${p.name} » se trouve à « ${p.place} », qui n'existe pas.`);
    for (const a of p.answers)
      if (a.topic !== '*' && !loreIds.has(a.topic))
        err(a.src, `« ${p.name} » répond sur « ${a.topic} », qui n'est pas un sujet du Savoir.`);
  }

  // ——— Rapports ———
  const triggered = new Set<string>();
  for (const r of Object.values(world.reports)) {
    if (!r.points.length) err(r.src, `Le rapport « ${r.id} » n'a aucun point « * ».`);
    for (const pt of r.points) {
      if (!pt.options.length) err(pt.src, `Le point « ${pt.title} » du rapport « ${r.id} » n'a aucune réponse « = ».`);
      else if (pt.options.every((o) => o.if.length))
        warn(pt.src, `Toutes les réponses du point « ${pt.title} » ont une condition : prévoyez-en une toujours disponible.`);
    }
  }

  // ——— Renvois dans les conditions et les effets ———
  const flagsSet = new Set<string>();
  const flagsRead = new Map<string, Src>();
  const markersSet = new Set<string>();
  const questsStarted = new Set<string>();
  const taught = new Set<string>();
  const all = uses(world);
  const questCheck = (src: Src, id: string, stage?: string) => {
    const q = world.quests[id];
    if (!q) err(src, `La quête « ${id} » n'existe pas.`);
    else if (stage && !(stage in q.stages)) err(src, `La quête « ${id} » n'a pas d'étape « ${stage} ».`);
  };
  for (const u of all) {
    for (const e of u.effects ?? []) {
      if (e.k === 'flag') flagsSet.add(e.id);
      else if (e.k === 'item' && !world.items[e.id]) err(u.src, `L'objet « ${e.id} » n'existe pas.`);
      else if (e.k === 'quest') {
        questCheck(u.src, e.id, e.stage);
        if (e.stage) questsStarted.add(e.id);
      } else if (e.k === 'marker') markersSet.add(e.id);
      else if (e.k === 'report') {
        triggered.add(e.id);
        if (!world.reports[e.id]) err(u.src, `Le rapport « ${e.id} » n'existe pas.`);
      } else if (e.k === 'goto' && !placeExists(e.place)) err(u.src, `Le lieu « ${e.place} » n'existe pas.`);
      else if (e.k === 'scene' && !world.scenes[e.id]) err(u.src, `La scène « ${e.id} » n'existe pas.`);
      else if (e.k === 'skill' && !skillIds.has(e.id)) err(u.src, `Le talent « ${e.id} » n'existe pas.`);
      else if (e.k === 'learn') {
        taught.add(e.id);
        if (!loreIds.has(e.id)) err(u.src, `« ${e.id} » n'est pas un sujet du Savoir.`);
      }
    }
  }
  for (const u of all) {
    for (const c of u.cond ?? []) {
      if (c.k === 'flag' && !flagsRead.has(c.id)) flagsRead.set(c.id, u.src);
      else if (c.k === 'item' && !world.items[c.id]) err(u.src, `L'objet « ${c.id} » n'existe pas.`);
      else if (c.k === 'quest') questCheck(u.src, c.id, c.stage);
      else if ((c.k === 'knows' || c.k === 'contradiction') && !loreIds.has(c.id))
        err(u.src, `« ${c.id} » n'est pas un sujet du Savoir.`);
      else if (c.k === 'skill' && !skillIds.has(c.id)) err(u.src, `Le talent « ${c.id} » n'existe pas.`);
      else if (c.k === 'since' && !markersSet.has(c.id))
        err(u.src, `Le repère « ${c.id} » n'est posé nulle part (« + repère ${c.id} »).`);
      else if ((c.k === 'visited' || c.k === 'here') && !placeExists(c.place))
        err(u.src, `Le lieu « ${c.place} » n'existe pas.`);
    }
  }
  for (const [id, src] of flagsRead)
    if (!flagsSet.has(id)) warn(src, `On teste « fait ${id} », mais rien ne le pose jamais (« + fait ${id} »). Faute de frappe ?`);
  for (const r of Object.values(world.reports))
    if (!triggered.has(r.id)) warn(r.src, `Rien ne demande le rapport « ${r.id} » (« + rapport ${r.id} »).`);
  for (const q of Object.values(world.quests)) {
    if (!questsStarted.has(q.id)) warn(q.src, `Rien ne commence la quête « ${q.id} ».`);
    if (!Object.keys(q.stages).length) err(q.src, `La quête « ${q.id} » n'a aucune étape.`);
  }
  for (const l of world.lore) {
    if (!l.versions.length) err(l.src, `Le sujet « ${l.id} » n'a aucune version.`);
    else if (!taught.has(l.id) && l.versions.every((v) => !v.if.length))
      warn(l.src, `Rien ne fait découvrir le sujet « ${l.id} » (« + savoir ${l.id} ») : le joueur ne le verra jamais.`);
  }

  return problems;
}

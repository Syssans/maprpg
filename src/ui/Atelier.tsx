import { useRef, useState } from 'react';
import { draftPath, draftsApplied, loadDrafts, rebuild, saveDrafts, world, type Draft } from '../content';
import type { Problem } from '../engine/parser';
import { useGame } from '../engine/store';

/** Morceaux prêts à compléter, dans le format décrit par content/LISEZ-MOI.md. */
const TEMPLATES: [string, string][] = [
  [
    'Quête',
    `== QUÊTE ma-quete : Titre de la quête
étape debut : Ce que le journal dit quand la quête commence.
étape suite : Ce qu'il dit ensuite.
`,
  ],
  [
    'Scène',
    `== SCÈNE ma-scene @ monde/courveil : Texte du bouton
début entree [si quête ma-quete non commencée]

--- entree
Ce que le joueur lit en arrivant.
+ quête ma-quete = debut
> Première réponse possible. -> suite
> Partir.

--- suite
@ Qui parle
Ce que cette personne répond.
`,
  ],
  [
    'Passage',
    `--- nom-du-passage
@ Qui parle
Le texte du passage.
> Une réponse. -> autre-passage
`,
  ],
  ['Choix', `> Ce que le joueur répond. -> passage-suivant [si fait quelque_chose]\n  + fait autre_chose\n`],
  [
    'Jet de dés',
    `> Ce que le joueur tente. [jet vigilance 9] -> reussite / echec
  bonus +2 [si fait quelque_chose] : Pourquoi c'est plus facile.
`,
  ],
  ['Remarque d’un talent', `~ doute 3 : Ce que le talent souffle au joueur s'il atteint ce niveau.\n`],
  [
    'Personne',
    `== PERSONNE quelquun @ monde/courveil : Nom affiché
Ce que l'on voit d'elle en l'abordant.

? elfes : Ce qu'elle dit de ce sujet.
! elfes : Ce qu'elle dit si le joueur tient une contradiction.
? * : Ce qu'elle répond à tout le reste.
`,
  ],
  [
    'Savoir',
    `== SAVOIR mon-sujet : Titre du sujet
[Ce qu'on vous a enseigné] La version officielle.
[Ce que vous avez constaté | si fait quelque_chose | contredit] Ce que le joueur découvre.
`,
  ],
  ['Objet', `== OBJET mon-objet : Nom de l'objet\nCe qu'on lit en l'examinant.\n`],
  [
    'Rapport',
    `== RAPPORT mon-rapport : Titre du rapport
Quelques mots avant d'écrire.

* Premier point
= vrai : « Ce qui s'est passé. »
= faux : « Ce qu'on attend de vous. »
= omis : Ne rien écrire.
`,
  ],
  [
    'Événement',
    `== ÉVÉNEMENT mon-evenement : Titre [si jour >= 10]
Ce que le joueur apprend ce jour-là, où qu'il soit.
+ fait quelque_chose
`,
  ],
  [
    'Lieu',
    `== LIEU monde/mon-lieu : Nom du lieu
position : 500, 500
région : Région
chemins : courveil (2)
Ce que le personnage en sait.
`,
  ],
];

const clean = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** L'atelier : écrire des quêtes dans le jeu, les vérifier, les essayer aussitôt. */
export function Atelier({ onBack }: { onBack(): void }) {
  const { refresh } = useGame();
  const [drafts, setDrafts] = useState<Draft[]>(loadDrafts);
  const [open, setOpen] = useState(0);
  const [report, setReport] = useState<Problem[] | null>(null);
  const [message, setMessage] = useState('');
  const [confirming, setConfirming] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const draft = drafts[open];

  const store = (next: Draft[]) => {
    setDrafts(next);
    saveDrafts(next);
    setReport(null);
    setMessage('');
  };
  const patch = (p: Partial<Draft>) => store(drafts.map((d, i) => (i === open ? { ...d, ...p } : d)));

  const add = () => {
    let n = drafts.length + 1;
    while (drafts.some((d) => d.name === `quete-${n}`)) n++;
    store([...drafts, { name: `quete-${n}`, text: '' }]);
    setOpen(drafts.length);
  };

  const insert = (tpl: string) => {
    const el = area.current;
    const at = el ? el.selectionStart : draft.text.length;
    const before = draft.text.slice(0, at);
    const gap = before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
    patch({ text: before + gap + tpl + draft.text.slice(at) });
    requestAnimationFrame(() => {
      el?.focus();
      const pos = (before + gap + tpl).length;
      el?.setSelectionRange(pos, pos);
    });
  };

  const apply = () => {
    saveDrafts(drafts);
    setReport(rebuild(drafts));
    refresh();
    setMessage(draftsApplied ? '' : 'Ces documents rendent le jeu injouable : ils ne sont pas appliqués.');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft.text);
      setMessage('Texte copié.');
    } catch {
      area.current?.select();
      setMessage('Texte sélectionné : copiez-le depuis le menu de votre appareil.');
    }
  };

  const mine = report?.filter((p) => draft && p.file === draftPath(draft.name)) ?? [];
  const others = report ? report.filter((p) => p.level === 'erreur').length - mine.filter((p) => p.level === 'erreur').length : 0;

  return (
    <div className="atelier">
      <button className="quiet back" onClick={onBack}>
        ← Retour
      </button>
      <h2>Atelier</h2>
      <hr className="rule" />
      <p className="muted">
        Écrivez ici vos quêtes, vérifiez-les et essayez-les aussitôt. Elles restent sur cet appareil : pour les faire entrer
        dans le jeu de tous, copiez le texte et transmettez-le.
      </p>

      <div className="docs">
        {drafts.map((d, i) => (
          <button key={i} className={i === open ? 'on' : ''} onClick={() => { setOpen(i); setConfirming(false); }}>
            {d.name}
          </button>
        ))}
        <button onClick={add}>+ Nouveau</button>
      </div>

      {draft && (
        <>
          <label>
            Nom du document
            <input id="atelier-name" value={draft.name} onChange={(e) => patch({ name: clean(e.target.value) || 'document' })} />
          </label>

          <small className="eyebrow">Insérer</small>
          <div className="chips">
            {TEMPLATES.map(([label, tpl]) => (
              <button key={label} onClick={() => insert(tpl)}>
                {label}
              </button>
            ))}
          </div>

          <textarea
            id="atelier-text"
            ref={area}
            value={draft.text}
            rows={16}
            spellCheck={false}
            autoCapitalize="off"
            placeholder="Touchez « Quête » puis « Scène » pour commencer, et remplacez les mots d'exemple."
            onChange={(e) => patch({ text: e.target.value })}
          />

          <div className="actions">
            <button className="seal" onClick={apply}>
              Vérifier et essayer
            </button>
            <button className="ghost" onClick={copy}>
              Copier le texte
            </button>
            {confirming ? (
              <button
                className="ghost"
                onClick={() => {
                  store(drafts.filter((_, i) => i !== open));
                  setOpen(0);
                  setConfirming(false);
                }}
              >
                Oui, supprimer
              </button>
            ) : (
              <button className="ghost" onClick={() => setConfirming(true)}>
                Supprimer
              </button>
            )}
          </div>

          {message && <p className="clash">{message}</p>}
          {report && mine.length === 0 && (
            <p className="points">
              Rien à signaler dans ce document. Il est en jeu : fermez l'atelier pour l'essayer.
              {others > 0 && ` (${others} erreur(s) ailleurs dans le contenu.)`}
            </p>
          )}
          {mine.map((p, i) => (
            <p key={i} className="problem">
              <b>{p.level === 'erreur' ? 'Erreur' : 'Attention'}</b> · ligne {p.line}
              <br />
              {p.message}
            </p>
          ))}
        </>
      )}

      <details>
        <summary>Aide-mémoire : les noms existants</summary>
        <p>
          <b>Lieux.</b>{' '}
          {Object.values(world.maps)
            .flatMap((m) => m.places.map((p) => `${m.id}/${p.id}`))
            .join(' · ')}
        </p>
        <p>
          <b>Talents.</b> {world.skills.map((k) => k.id).join(' · ')}
        </p>
        <p>
          <b>Sujets du Savoir.</b> {world.lore.map((l) => l.id).join(' · ')}
        </p>
        <p>
          <b>Quêtes.</b> {Object.keys(world.quests).join(' · ') || '—'}
        </p>
        <p>
          <b>Objets.</b> {Object.keys(world.items).join(' · ') || '—'}
        </p>
        <p>
          <b>Difficultés.</b> 6 aisé · 8 ordinaire · 10 malaisé · 12 ardu · 14 redoutable · 16 presque impossible
        </p>
        <p>
          <b>Conditions.</b> fait x · pas fait x · a objet · quête q = étape · quête q close · sait sujet · compétence doute
          &gt;= 3 · jour &gt;= 10 · en uniforme · visité carte/lieu
        </p>
        <p>
          <b>Effets.</b> + fait x · + objet x · + quête q = étape · + quête q close · + savoir sujet · + points 1 · + jours 2 ·
          + dossier mot : note · + rapport r
        </p>
      </details>
    </div>
  );
}

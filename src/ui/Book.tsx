import { useState } from 'react';
import { world } from '../content';
import * as rules from '../engine/rules';
import { useGame } from '../engine/store';
import type { ReportTag } from '../engine/types';
import { IconClose } from './icons';
import { Prose } from './pages';
import { You } from './You';

export type BookTab = 'journal' | 'savoir' | 'besace' | 'carnet' | 'vous';
const TABS: [BookTab, string][] = [
  ['journal', 'Journal'],
  ['savoir', 'Savoir'],
  ['besace', 'Besace'],
  ['carnet', 'Carnet'],
  ['vous', 'Vous'],
];

interface Props {
  tab: BookTab;
  onTab(tab: BookTab): void;
  onClose(): void;
  onOpenNote(id: string): void;
  author: boolean;
}

/** Le codex : tout ce que le personnage porte sur lui, en un seul livre à signets. */
export function Book({ tab, onTab, onClose, onOpenNote, author }: Props) {
  return (
    <section className="book">
      <nav className="ribbons">
        {TABS.map(([id, label]) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => onTab(id)}>
            {label}
          </button>
        ))}
        <button className="close" onClick={onClose} aria-label="Refermer le codex">
          <IconClose />
        </button>
      </nav>
      <div className="leaf" key={tab}>
        {tab === 'journal' && <Journal />}
        {tab === 'savoir' && <Knowledge />}
        {tab === 'besace' && <Bag />}
        {tab === 'carnet' && <Notebook onOpenNote={onOpenNote} />}
        {tab === 'vous' && <You author={author} />}
      </div>
    </section>
  );
}

const Rule = () => <hr className="rule" />;
const TAGS: Record<ReportTag, string> = { vrai: 'Vrai', faux: 'Faux', omis: 'Passé sous silence' };

function Journal() {
  const { player } = useGame();
  const quests = Object.entries(player.quests);
  const reports = Object.entries(player.reports);
  return (
    <>
      <h2>Journal</h2>
      <Rule />
      {quests.length === 0 && <p className="muted">Rien encore qui mérite d'être écrit.</p>}
      {quests.map(([id, q]) => {
        const quest = world.quests[id];
        return (
          <article key={id} className={q.done ? 'done' : ''}>
            <h3>{quest.title}</h3>
            {q.done && <small className="eyebrow">Close</small>}
            <Prose text={q.done ? (quest.epilogue ?? quest.stages[q.stage]) : quest.stages[q.stage]} />
          </article>
        );
      })}
      {reports.length > 0 && (
        <>
          <h2 className="again">Rapports remis</h2>
          <Rule />
        </>
      )}
      {reports.map(([id, r]) => {
        const report = world.reports[id];
        return (
          <article key={id}>
            <h3>{report.title}</h3>
            <small className="eyebrow">{rules.dateLabel(world, r.day)}</small>
            {report.points.map((pt, i) => {
              const o = pt.options[r.picks[i]];
              return o ? (
                <p key={i} className="written">
                  <b>{pt.title}.</b> {o.text} <span className={`tag ${o.tag}`}>{TAGS[o.tag]}</span>
                </p>
              ) : null;
            })}
          </article>
        );
      })}
    </>
  );
}

function Knowledge() {
  const { player } = useGame();
  return (
    <>
      <h2>Savoir</h2>
      <Rule />
      {rules.knownLore(world, player).map((l) => (
        <article key={l.id}>
          <h3>{l.title}</h3>
          {l.contradiction && <p className="clash">Ces versions ne s'accordent pas.</p>}
          {l.versions.map((v, i) => (
            <div key={i} className={`version ${v.contradicts ? 'own' : ''}`}>
              <small className="eyebrow">{v.source}</small>
              <Prose text={v.text} />
            </div>
          ))}
        </article>
      ))}
    </>
  );
}

/** La besace : des cases que l'on touche pour examiner ce qu'elles contiennent. */
function Bag() {
  const { player } = useGame();
  const ids = Object.keys(player.inventory);
  const [picked, setPicked] = useState<string | null>(null);
  const shown = picked && player.inventory[picked] ? picked : (ids[0] ?? null);
  const slots = Math.max(8, Math.ceil(ids.length / 4) * 4);
  return (
    <>
      <h2>Besace</h2>
      <Rule />
      <div className="slots">
        {Array.from({ length: slots }, (_, i) => {
          const id = ids[i];
          if (!id) return <span key={i} className="slot empty" />;
          const item = world.items[id];
          return (
            <button
              key={id}
              className={`slot ${shown === id ? 'on' : ''}`}
              onClick={() => setPicked(id)}
              aria-label={item.name}
              aria-pressed={shown === id}
            >
              <b>{item.name.charAt(0)}</b>
              {player.inventory[id] > 1 && <i>{player.inventory[id]}</i>}
            </button>
          );
        })}
      </div>
      {shown ? (
        <article className="examined">
          <h3>{world.items[shown].name}</h3>
          <Prose text={world.items[shown].description} />
        </article>
      ) : (
        <p className="muted">Vous voyagez les mains vides.</p>
      )}
    </>
  );
}

function Notebook({ onOpenNote }: { onOpenNote(id: string): void }) {
  const { player } = useGame();
  return (
    <>
      <h2>Carnet</h2>
      <Rule />
      {player.notes.length === 0 && (
        <p className="muted">
          Vos notes s'épinglent sur la carte : touchez « Noter », écrivez, puis faites glisser l'étiquette où vous voulez.
        </p>
      )}
      {player.notes.map((n) => (
        <button key={n.id} className="note-row" onClick={() => onOpenNote(n.id)}>
          <small className="eyebrow">{world.maps[n.map]?.name}</small>
          <span>{n.text.trim() || 'Note vide'}</span>
        </button>
      ))}
    </>
  );
}

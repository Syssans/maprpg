import { useEffect, useState } from 'react';
import { world } from '../content';
import * as rules from '../engine/rules';
import { useGame } from '../engine/store';
import type { PlayerState, ReportTag } from '../engine/types';
import { IconClose } from './icons';
import { Prose } from './pages';
import { Atelier } from './Atelier';
import { You } from './You';

export type BookTab = 'quetes' | 'savoir' | 'talents' | 'besace' | 'carnet' | 'vous' | 'atelier';

/** Empreinte de ce qu'une page contient : si elle change, la page a du nouveau. */
export function signature(tab: BookTab, player: PlayerState): string {
  if (tab === 'quetes') {
    const quests = Object.entries(player.quests).map(([id, q]) => `${id}:${q.stage}:${q.done}`);
    return [...quests, ...Object.keys(player.reports)].join(',');
  }
  if (tab === 'savoir') return rules.knownLore(world, player).map((l) => `${l.id}:${l.versions.length}`).join(',');
  if (tab === 'talents') return player.points > 0 ? `points:${player.points}` : '';
  if (tab === 'besace') return Object.keys(player.inventory).join(',');
  return '';
}

interface Props {
  tab: BookTab;
  onTab(tab: BookTab): void;
  onClose(): void;
  onOpenNote(id: string): void;
}

/** Une page du codex. Chaque bouton de la barre ouvre la sienne, et elle seule. */
export function Page({ tab, onTab, onClose, onOpenNote }: Props) {
  const { player, markSeen } = useGame();
  const sig = signature(tab, player);
  useEffect(() => {
    // Les points de talent restent signalés tant qu'il en reste à dépenser.
    if (tab !== 'talents') markSeen(tab, sig);
  }, [tab, sig, markSeen]);
  return (
    <section className="book">
      <button className="close" onClick={onClose} aria-label="Fermer">
        <IconClose />
      </button>
      <div className="leaf" key={tab}>
        {tab === 'quetes' && <Journal />}
        {tab === 'savoir' && <Knowledge />}
        {tab === 'talents' && <Skills />}
        {tab === 'besace' && <Bag />}
        {tab === 'carnet' && <Notebook onOpenNote={onOpenNote} />}
        {tab === 'vous' && <You onAtelier={() => onTab('atelier')} />}
        {tab === 'atelier' && <Atelier onBack={() => onTab('vous')} />}
      </div>
    </section>
  );
}

/** Les talents, rangés par famille. Un point se dépense d'un geste et ne se reprend pas. */
function Skills() {
  const { player, spendPoint } = useGame();
  const groups = [...new Set(world.skills.map((k) => k.group))];
  return (
    <>
      <h2>Talents</h2>
      <Rule />
      <p className={player.points > 0 ? 'points' : 'muted'}>
        {player.points > 1
          ? `${player.points} points à répartir.`
          : player.points === 1
            ? 'Un point à répartir.'
            : 'Aucun point à répartir pour l’instant.'}
      </p>
      {groups.map((g) => (
        <div key={g} className="branch">
          <h3>{g}</h3>
          {world.skills
            .filter((k) => k.group === g)
            .map((k) => {
              const level = rules.skillLevel(player, k.id);
              return (
                <div key={k.id} className="skill">
                  <div className="skill-head">
                    <b>{k.name}</b>
                    <span className="pips" aria-label={`Niveau ${level} sur ${rules.SKILL_MAX}`}>
                      {Array.from({ length: rules.SKILL_MAX }, (_, i) => (
                        <i key={i} className={i < level ? 'on' : ''} />
                      ))}
                    </span>
                    <button
                      className="raise"
                      disabled={player.points < 1 || level >= rules.SKILL_MAX}
                      onClick={() => spendPoint(k.id)}
                      aria-label={`Augmenter ${k.name}`}
                    >
                      +
                    </button>
                  </div>
                  <Prose text={k.description} />
                </div>
              );
            })}
        </div>
      ))}
    </>
  );
}

const Rule = () => <hr className="rule" />;
const TAGS: Record<ReportTag, string> = { vrai: 'Vrai', faux: 'Faux', omis: 'Passé sous silence' };

function Journal() {
  const { player } = useGame();
  const all = Object.entries(player.quests).reverse();
  const quests = [...all.filter(([, q]) => !q.done), ...all.filter(([, q]) => q.done)];
  const reports = Object.entries(player.reports);
  return (
    <>
      <h2>Quêtes</h2>
      <Rule />
      {quests.length === 0 && <p className="muted">Aucune tâche ne vous a encore été confiée.</p>}
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
      {rules.knownLore(world, player).length === 0 && (
        <p className="muted">Rien encore. Ce que vous apprendrez en chemin viendra s'inscrire ici.</p>
      )}
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

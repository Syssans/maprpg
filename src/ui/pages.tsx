import { useEffect, useRef, useState } from 'react';
import { world } from '../content';
import * as rules from '../engine/rules';
import { useGame } from '../engine/store';

/** Un texte dont les paragraphes sont séparés par une ligne vide. */
export function Prose({ text, className }: { text: string; className?: string }) {
  return (
    <>
      {text.split('\n\n').map((p, i) => (
        <p key={i} className={className}>
          {p}
        </p>
      ))}
    </>
  );
}

interface Option {
  key: string;
  text: string;
  hint?: string;
  dim?: boolean;
  disabled?: boolean;
  /** En-tête d'un choix à jet : talent, difficulté, chance. */
  roll?: string;
  pick(): void;
}

interface Pending {
  index: number;
  dice: [number, number];
  view: rules.TestView;
}

const die = () => 1 + Math.floor(Math.random() * 6);

/**
 * Scènes et conversations se lisent comme un fil continu : ce qui a été dit reste
 * au-dessus, les réponses possibles viennent en dessous, numérotées.
 */
export function Conversation() {
  const { player, choose, ask, closeTalk } = useGame();
  const [pending, setPending] = useState<Pending | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [player.log.length]);

  let options: Option[];
  if (player.dialogue) {
    options = rules.visibleChoices(world, player).map((c) => {
      const r = c.roll;
      if (!r || r.passed) return { key: `c${c.index}`, text: c.text, hint: r ? 'déjà réussi' : undefined, pick: () => choose(c.index) };
      return {
        key: `c${c.index}`,
        text: c.text,
        roll: `${r.skill} · ${rules.difficultyLabel(r.difficulty)} · ${r.chance} %${r.once ? ' · sans retour' : ''}`,
        hint: r.locked ? (r.once ? 'vous avez échoué' : `à retenter quand votre ${r.skill} aura grandi`) : undefined,
        disabled: r.locked,
        dim: r.locked,
        pick: () => setPending({ index: c.index, dice: [die(), die()], view: r }),
      };
    });
    if (!options.length) options = [{ key: 'end', text: 'Poursuivre', pick: () => choose(-1) }];
  } else {
    const person = player.talk!.person;
    options = rules.knownLore(world, player).map((t) => ({
      key: t.id,
      text: t.title,
      hint: t.contradiction ? 'ce que vous avez vu ne s’accorde pas' : undefined,
      dim: player.asked.includes(`${person}/${t.id}${t.contradiction ? '!' : ''}`),
      pick: () => ask(t.id),
    }));
    options.push({ key: 'bye', text: 'Prendre congé', pick: closeTalk });
  }

  const firstText = player.log.findIndex((e) => e.k === 'text');
  return (
    <section className="talk">
      <div className="thread">
        {player.log.map((e, i) => {
          const last = i === player.log.length - 1;
          if (e.k === 'title')
            return (
              <h2 key={i} className="rubric">
                {e.text}
              </h2>
            );
          if (e.k === 'notice')
            return (
              <p key={i} className="notice">
                {e.text}
              </p>
            );
          if (e.k === 'you')
            return (
              <p key={i} className="you">
                <span className="who">Vous</span> {e.text}
              </p>
            );
          if (e.k === 'roll')
            return (
              <p key={i} className={`rolled ${e.ok ? 'ok' : 'ko'}`}>
                <span className="who">{e.speaker}</span> {e.text}
              </p>
            );
          if (e.k === 'voice')
            return (
              <p key={i} className={`voice ${last ? 'fresh' : ''}`}>
                <span className="who">{e.speaker}</span> {e.text}
              </p>
            );
          return (
            <div key={i} className={`line ${last ? 'fresh' : ''} ${i === firstText && !e.speaker ? 'opening' : ''}`}>
              {e.text.split('\n\n').map((para, j) => (
                <p key={j}>
                  {j === 0 && e.speaker && <span className="who">{e.speaker}</span>} {para}
                </p>
              ))}
            </div>
          );
        })}
        <ol className="replies">
          {options.map((o) => (
            <li key={o.key}>
              <button className={o.dim ? 'dim' : ''} disabled={o.disabled} onClick={o.pick}>
                <span>
                  {o.roll && <small className="odds">{o.roll}</small>}
                  {o.text}
                  {o.hint && <em> — {o.hint}</em>}
                </span>
              </button>
            </li>
          ))}
        </ol>
        <div ref={end} />
      </div>
      {pending && (
        <DiceRoll
          pending={pending}
          onDone={() => {
            choose(pending.index, pending.dice);
            setPending(null);
          }}
        />
      )}
    </section>
  );
}

const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

function Die({ value }: { value: number }) {
  return (
    <span className="die" aria-label={`${value}`}>
      {Array.from({ length: 9 }, (_, i) => (
        <i key={i} className={PIPS[value].includes(i) ? 'on' : ''} />
      ))}
    </span>
  );
}

/** Le lancer : les dés roulent un instant, puis le résultat se lit avant de poursuivre. */
function DiceRoll({ pending, onDone }: { pending: Pending; onDone(): void }) {
  const { dice, view } = pending;
  const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [faces, setFaces] = useState<[number, number]>(still ? dice : [die(), die()]);
  const [settled, setSettled] = useState(still);
  useEffect(() => {
    if (still) return;
    const spin = setInterval(() => setFaces([die(), die()]), 90);
    const stop = setTimeout(() => {
      clearInterval(spin);
      setFaces(dice);
      setSettled(true);
    }, 900);
    return () => {
      clearInterval(spin);
      clearTimeout(stop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const ok = rules.rollSucceeds(dice, view.bonus, view.difficulty);
  const total = dice[0] + dice[1] + view.bonus;
  return (
    <div className="scrim dice" onClick={settled ? onDone : undefined}>
      <div className="slip" onClick={(e) => e.stopPropagation()}>
        <small className="eyebrow">
          {view.skill} · {rules.difficultyLabel(view.difficulty)}
        </small>
        <div className={`dice-row ${settled ? '' : 'rolling'}`}>
          <Die value={faces[0]} />
          <Die value={faces[1]} />
        </div>
        {settled ? (
          <>
            <h2 className={ok ? 'ok' : 'ko'}>{ok ? 'Réussite' : 'Échec'}</h2>
            <p>
              {dice[0]} + {dice[1]} aux dés, {view.bonus >= 0 ? '+' : '−'} {Math.abs(view.bonus)} : <b>{total}</b> contre{' '}
              <b>{view.difficulty}</b>.
              {dice[0] + dice[1] === 2 && ' Double un : rien n’y fait.'}
              {dice[0] + dice[1] === 12 && ' Double six : rien ne résiste.'}
            </p>
            {view.mods.map((m, i) => (
              <p key={i} className="muted">
                {m.value > 0 ? '+' : '−'}
                {Math.abs(m.value)} — {m.text}
              </p>
            ))}
            <button className="seal wide" onClick={onDone}>
              Poursuivre
            </button>
          </>
        ) : (
          <p className="muted">Les dés roulent…</p>
        )}
      </div>
    </div>
  );
}

export function NewsView() {
  const { player, dismissNews } = useGame();
  const event = world.events.find((e) => e.id === player.news[0])!;
  return (
    <section className="talk">
      <div className="thread" key={event.id}>
        {event.title && <h2 className="rubric">{event.title}</h2>}
        <div className="line fresh opening">
          <Prose text={event.text} />
        </div>
        <ol className="replies">
          <li>
            <button onClick={dismissNews}>Poursuivre</button>
          </li>
        </ol>
      </div>
    </section>
  );
}

export function ReportView() {
  const { player, submitReport } = useGame();
  const id = player.pendingReports[0];
  const report = world.reports[id];
  const options = rules.reportOptions(world, player, id);
  const [picks, setPicks] = useState<number[]>(() => report.points.map(() => -1));
  const complete = options.every((opts, i) => !opts.length || picks[i] >= 0);

  return (
    <section className="book report">
      <div className="leaf">
        <small className="eyebrow">{rules.dateLabel(world, player.day)}</small>
        <h2>{report.title}</h2>
        <hr className="rule" />
        <Prose text={report.intro} />
        {report.points.map((pt, i) =>
          options[i].length ? (
            <fieldset key={i}>
              <legend>{pt.title}</legend>
              {options[i].map((o) => (
                <button
                  key={o.index}
                  className={picks[i] === o.index ? 'picked' : ''}
                  aria-pressed={picks[i] === o.index}
                  onClick={() => setPicks(picks.map((p, j) => (j === i ? o.index : p)))}
                >
                  {o.text}
                </button>
              ))}
            </fieldset>
          ) : null,
        )}
        <button className="seal wide" disabled={!complete} onClick={() => submitReport(picks)}>
          Signer et remettre le rapport
        </button>
      </div>
    </section>
  );
}

/** Une note du joueur : on l'écrit ici, on la déplace en la faisant glisser sur la carte. */
export function NoteEditor({ id, onClose }: { id: string; onClose(): void }) {
  const { player, updateNote, deleteNote } = useGame();
  const note = player.notes.find((n) => n.id === id)!;
  const close = () => {
    if (!note.text.trim()) deleteNote(id);
    onClose();
  };
  return (
    <div className="scrim" onClick={close}>
      <div className="slip" onClick={(e) => e.stopPropagation()}>
        <small className="eyebrow">Note — {world.maps[note.map]?.name}</small>
        <textarea
          id="note-text"
          autoFocus
          rows={5}
          value={note.text}
          placeholder="Ce que vous voulez retenir…"
          onChange={(e) => updateNote(id, { text: e.target.value })}
        />
        <p className="muted">Faites glisser l'étiquette sur la carte pour la placer.</p>
        <div className="actions">
          <button className="seal" onClick={close}>
            Garder
          </button>
          <button
            className="ghost"
            onClick={() => {
              deleteNote(id);
              onClose();
            }}
          >
            Jeter
          </button>
        </div>
      </div>
    </div>
  );
}

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
  pick(): void;
}

/**
 * Scènes et conversations se lisent comme un fil continu : ce qui a été dit reste
 * au-dessus, les réponses possibles viennent en dessous, numérotées.
 */
export function Conversation() {
  const { player, choose, ask, closeTalk } = useGame();
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [player.log.length]);

  let options: Option[];
  if (player.dialogue) {
    options = rules.visibleChoices(world, player).map((c) => ({ key: `c${c.index}`, text: c.text, pick: () => choose(c.index) }));
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
              <button className={o.dim ? 'dim' : ''} onClick={o.pick}>
                {o.text}
                {o.hint && <em> — {o.hint}</em>}
              </button>
            </li>
          ))}
        </ol>
        <div ref={end} />
      </div>
    </section>
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

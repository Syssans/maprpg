import { useState } from 'react';
import { world } from '../content';
import * as rules from '../engine/rules';
import { useGame } from '../engine/store';
import type { ReportTag } from '../engine/types';

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

export function DialogueView() {
  const { player, choose } = useGame();
  const d = player.dialogue!;
  const node = world.scenes[d.scene].nodes[d.node];
  const choices = rules.visibleChoices(world, player);
  return (
    <section className="page dialogue">
      <div className="scroll" key={d.node}>
        {node.speaker && <h3>{node.speaker}</h3>}
        <Prose text={node.text} className="said" />
      </div>
      <div className="choices">
        {choices.map((c) => (
          <button key={c.index} onClick={() => choose(c.index)}>
            {c.text}
          </button>
        ))}
        {choices.length === 0 && (
          <button className="primary" onClick={() => choose(-1)}>
            Poursuivre
          </button>
        )}
      </div>
    </section>
  );
}

export function NewsView() {
  const { player, dismissNews } = useGame();
  const event = world.events.find((e) => e.id === player.news[0])!;
  return (
    <section className="page dialogue">
      <div className="scroll" key={event.id}>
        {event.title && <h3>{event.title}</h3>}
        <Prose text={event.text} className="said" />
      </div>
      <div className="choices">
        <button className="primary" onClick={dismissNews}>
          Poursuivre
        </button>
      </div>
    </section>
  );
}

export function TalkView() {
  const { player, ask, backToTopics, closeTalk } = useGame();
  const talk = player.talk!;
  const person = world.people[talk.person];
  const topics = rules.knownLore(world, player);

  if (talk.reply !== undefined) {
    const topic = topics.find((t) => t.id === talk.topic);
    return (
      <section className="page dialogue">
        <div className="scroll" key={talk.topic}>
          <h3>{person.name}</h3>
          {topic && <small className="region">À propos de : {topic.title}</small>}
          <Prose text={talk.reply} className="said" />
        </div>
        <div className="choices">
          <button className="primary" onClick={backToTopics}>
            Aborder autre chose
          </button>
          <button onClick={closeTalk}>Prendre congé</button>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="scroll">
        <h2>{person.name}</h2>
        <Prose text={person.intro} />
        <small className="region">Aborder un sujet</small>
        <div className="topics">
          {topics.map((t) => {
            const asked = player.asked.some((k) => k === `${person.id}/${t.id}` || k === `${person.id}/${t.id}!`);
            const fresh = t.contradiction && !player.asked.includes(`${person.id}/${t.id}!`);
            return (
              <button key={t.id} className={asked && !fresh ? 'asked' : ''} onClick={() => ask(t.id)}>
                {t.title}
                {t.contradiction && <em> · ce que vous avez vu ne s'accorde pas</em>}
              </button>
            );
          })}
        </div>
      </div>
      <div className="choices">
        <button className="primary" onClick={closeTalk}>
          Prendre congé
        </button>
      </div>
    </section>
  );
}

const TAGS: Record<ReportTag, string> = { vrai: 'Vrai', faux: 'Faux', omis: 'Passé sous silence' };

export function ReportView() {
  const { player, submitReport } = useGame();
  const id = player.pendingReports[0];
  const report = world.reports[id];
  const options = rules.reportOptions(world, player, id);
  const [picks, setPicks] = useState<number[]>(() => report.points.map(() => -1));
  const complete = options.every((opts, i) => !opts.length || picks[i] >= 0);

  return (
    <section className="page report">
      <div className="scroll">
        <small className="region">{rules.dateLabel(world, player.day)}</small>
        <h2>{report.title}</h2>
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
      </div>
      <div className="choices">
        <button className="primary" disabled={!complete} onClick={() => submitReport(picks)}>
          Signer et remettre le rapport
        </button>
      </div>
    </section>
  );
}

export function Journal() {
  const { player } = useGame();
  const quests = Object.entries(player.quests);
  const reports = Object.entries(player.reports);
  return (
    <section className="page">
      <div className="scroll">
        <h2>Journal</h2>
        {quests.length === 0 && <p className="muted">Rien encore qui mérite d'être écrit.</p>}
        {quests.map(([id, q]) => {
          const quest = world.quests[id];
          return (
            <article key={id} className={q.done ? 'done' : ''}>
              <h3>{quest.title}</h3>
              <Prose text={q.done ? (quest.epilogue ?? quest.stages[q.stage]) : quest.stages[q.stage]} />
            </article>
          );
        })}

        {reports.length > 0 && <h2 className="section">Rapports remis</h2>}
        {reports.map(([id, r]) => {
          const report = world.reports[id];
          return (
            <article key={id}>
              <h3>{report.title}</h3>
              <small className="region">{rules.dateLabel(world, r.day)}</small>
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
      </div>
    </section>
  );
}

export function Knowledge() {
  const { player } = useGame();
  return (
    <section className="page">
      <div className="scroll">
        <h2>Savoir</h2>
        {rules.knownLore(world, player).map((l) => (
          <article key={l.id}>
            <h3>{l.title}</h3>
            {l.contradiction && <p className="clash">Ces versions ne s'accordent pas.</p>}
            {l.versions.map((v, i) => (
              <div key={i} className="version">
                <small className="region">{v.source}</small>
                <Prose text={v.text} />
              </div>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}

export function Bag() {
  const { player } = useGame();
  const entries = Object.entries(player.inventory);
  return (
    <section className="page">
      <div className="scroll">
        <h2>Sac</h2>
        {entries.length === 0 && <p className="muted">Vous voyagez les mains vides.</p>}
        {entries.map(([id, n]) => (
          <article key={id}>
            <h3>
              {world.items[id].name}
              {n > 1 && ` ×${n}`}
            </h3>
            <Prose text={world.items[id].description} />
          </article>
        ))}
      </div>
    </section>
  );
}

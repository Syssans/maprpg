import { useEffect, useMemo, useState } from 'react';
import { world } from '../content';
import { canLeave, check, key, knownPlaces, neighbours, visibleChoices } from '../engine/rules';
import { useGame } from '../engine/store';
import { MapView } from './MapView';

type Tab = 'carte' | 'journal' | 'sac';

export function App() {
  const game = useGame();
  const { player } = game;
  const [tab, setTab] = useState<Tab>('carte');
  const [selected, setSelected] = useState<string | null>(null);

  const map = world.maps[player.mapId];
  const current = player.positions[map.id];
  const known = useMemo(() => knownPlaces(map, player), [map, player]);
  const reachable = useMemo(() => neighbours(map, current), [map, current]);

  useEffect(() => setSelected(null), [map.id]);

  useEffect(() => {
    if (!game.notices.length) return;
    const t = setTimeout(game.clearNotices, 3500);
    return () => clearTimeout(t);
  }, [game.notices, game.clearNotices]);

  const place = map.places.find((p) => p.id === (selected ?? current))!;
  const isHere = place.id === current;
  const seen = player.visited.includes(key(map.id, place.id));
  const hasTalk =
    isHere && place.dialogue && world.dialogues[place.dialogue].start.some((s) => check(player, s.if));

  return (
    <div className="app">
      <header className="bar">
        <div>
          <small>{map.parent ? world.maps[map.parent].name : 'Monde'}</small>
          <strong>{map.name}</strong>
        </div>
        {canLeave(world, player) && tab === 'carte' && (
          <button onClick={game.leave}>Quitter les lieux</button>
        )}
      </header>

      <main>
        <MapView
          key={map.id}
          map={map}
          known={known}
          current={current}
          reachable={reachable}
          selected={selected}
          onSelect={setSelected}
        />

        {tab === 'carte' && !player.dialogue && (
          <section className="sheet">
            <h2>{place.name}</h2>
            <p>{seen ? place.description : 'Vous ne connaissez de ce lieu que le nom.'}</p>
            <div className="actions">
              {!isHere && reachable.includes(place.id) && (
                <button
                  className="primary"
                  onClick={() => {
                    game.travel(place.id);
                    setSelected(null);
                  }}
                >
                  S'y rendre
                </button>
              )}
              {!isHere && !reachable.includes(place.id) && <em>Aucun chemin direct depuis votre position.</em>}
              {isHere && place.enters && (
                <button className="primary" onClick={game.enter}>
                  Entrer
                </button>
              )}
              {hasTalk && (
                <button className="primary" onClick={game.talk}>
                  {place.actionLabel ?? 'Parler'}
                </button>
              )}
            </div>
          </section>
        )}

        {player.dialogue && <DialogueView />}
        {tab === 'journal' && !player.dialogue && <Journal />}
        {tab === 'sac' && !player.dialogue && <Bag />}

        {game.notices.length > 0 && (
          <div className="toast" onClick={game.clearNotices}>
            {game.notices.map((n, i) => (
              <div key={i}>{n}</div>
            ))}
          </div>
        )}
      </main>

      <nav className="tabs">
        {(
          [
            ['carte', 'Carte'],
            ['journal', 'Journal'],
            ['sac', 'Sac'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function DialogueView() {
  const { player, choose } = useGame();
  const d = player.dialogue!;
  const node = world.dialogues[d.id].nodes[d.node];
  const choices = visibleChoices(world, player);
  return (
    <section className="page dialogue">
      <div className="scroll" key={d.node}>
        {node.speaker && <h3>{node.speaker}</h3>}
        <p className="said">{node.text}</p>
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

function Journal() {
  const { player, reset } = useGame();
  const entries = Object.entries(player.quests);
  return (
    <section className="page">
      <div className="scroll">
        <h2>Journal</h2>
        {entries.length === 0 && <p className="muted">Rien encore qui mérite d'être écrit.</p>}
        {entries.map(([id, q]) => {
          const quest = world.quests[id];
          return (
            <article key={id} className={q.done ? 'done' : ''}>
              <h3>{quest.title}</h3>
              <p>{q.done ? (quest.epilogue ?? quest.stages[q.stage]) : quest.stages[q.stage]}</p>
            </article>
          );
        })}
        <button
          className="quiet"
          onClick={() => confirm('Effacer la sauvegarde et tout recommencer ?') && reset()}
        >
          Recommencer depuis le début
        </button>
      </div>
    </section>
  );
}

function Bag() {
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
            <p>{world.items[id].description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

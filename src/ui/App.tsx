import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { authorMode, world } from '../content';
import * as rules from '../engine/rules';
import { useGame } from '../engine/store';
import { MapView } from './MapView';
import { Bag, DialogueView, Journal, Knowledge, NewsView, ReportView, TalkView } from './pages';
import { You } from './You';

type Tab = 'carte' | 'journal' | 'savoir' | 'sac' | 'vous';
const TABS: [Tab, string][] = [
  ['carte', 'Carte'],
  ['journal', 'Journal'],
  ['savoir', 'Savoir'],
  ['sac', 'Sac'],
  ['vous', 'Vous'],
];

export function App() {
  const game = useGame();
  const { player } = game;
  const [tab, setTab] = useState<Tab>('carte');
  const [selected, setSelected] = useState<string | null>(null);
  const [layerId, setLayerId] = useState<string | null>(null);

  const map = world.maps[player.mapId];
  const current = player.positions[map.id];
  const known = useMemo(() => rules.knownPlaces(map, player), [map, player]);
  const routes = useMemo(() => rules.neighbours(map, current), [map, current]);
  const reachable = useMemo(() => routes.map((r) => r.id), [routes]);
  const noted = useMemo(
    () => new Set(map.places.filter((p) => rules.describe(world, player, p).notes.length).map((p) => p.id)),
    [map, player],
  );
  const layer = layerId ? world.layers[layerId] : null;
  const tint = useMemo(() => {
    const out: Record<string, string> = {};
    if (layer)
      for (const p of map.places) {
        const v = rules.layerValue(world, player, p, layer.id);
        if (v) out[p.id] = v.color;
      }
    return out;
  }, [map, player, layer]);

  useEffect(() => setSelected(null), [map.id]);

  // La carte se cadre au-dessus du panneau : elle doit en connaître la hauteur avant de bouger.
  const sheet = useRef<HTMLElement>(null);
  const inset = useRef(0);
  useLayoutEffect(() => {
    inset.current = sheet.current?.offsetHeight ?? 0;
  });

  useEffect(() => {
    if (!game.notices.length) return;
    const t = setTimeout(game.clearNotices, 3500);
    return () => clearTimeout(t);
  }, [game.notices, game.clearNotices]);

  const place = map.places.find((p) => p.id === (selected ?? current)) ?? map.places[0];
  const isHere = place.id === current;
  const route = routes.find((r) => r.id === place.id);
  const { text, notes } = rules.describe(world, player, place);
  const layerHere = layer && rules.layerValue(world, player, place, layer.id);
  const layerIds = Object.keys(world.layers);

  // Ce qui doit être lu ou réglé avant de reprendre la main, par ordre de priorité.
  const overlay = player.news.length ? (
    <NewsView />
  ) : player.dialogue ? (
    <DialogueView />
  ) : player.pendingReports.length ? (
    <ReportView key={player.pendingReports[0]} />
  ) : player.talk ? (
    <TalkView />
  ) : null;

  return (
    <div className="app">
      <header className="bar">
        <div>
          <small>{rules.dateLabel(world, player.day)}</small>
          <strong>{map.name}</strong>
        </div>
        {rules.canLeave(world, player) && tab === 'carte' && !overlay && (
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
          tint={tint}
          noted={noted}
          inset={inset}
          onSelect={setSelected}
        />

        {tab === 'carte' && !overlay && layerIds.length > 0 && (
          <div className="layers">
            <button onClick={() => setLayerId(layerIds[layerIds.indexOf(layerId ?? '') + 1] ?? null)}>
              {layer ? layer.name : 'Calques'}
            </button>
            {layer && (
              <ul>
                {Object.values(layer.values).map((v) => (
                  <li key={v.label}>
                    <i style={{ background: v.color }} />
                    {v.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 'carte' && !overlay && (
          <section className="sheet" ref={sheet}>
            {place.region && <small className="region">{place.region}</small>}
            <h2>{place.name}</h2>
            <p>{text}</p>
            {layerHere && (
              <p className="layer-value">
                <i style={{ background: layerHere.color }} />
                {layer!.name} : {layerHere.label.toLowerCase()}
              </p>
            )}
            {notes.map((n, i) => (
              <p key={i} className="note">
                {n}
              </p>
            ))}
            <div className="actions">
              {!isHere && route && (
                <button
                  className="primary"
                  onClick={() => {
                    game.travel(place.id);
                    setSelected(null);
                  }}
                >
                  S'y rendre · {route.days} {route.days > 1 ? 'jours' : 'jour'}
                </button>
              )}
              {!isHere && !route && <em>Aucun chemin direct depuis votre position.</em>}
              {isHere && place.enters && (
                <button className="primary" onClick={game.enter}>
                  Entrer
                </button>
              )}
              {isHere &&
                rules.scenesHere(world, player).map((s) => (
                  <button key={s.id} className="primary" onClick={() => game.startScene(s.id)}>
                    {s.label}
                  </button>
                ))}
              {isHere &&
                rules.peopleHere(world, player).map((p) => (
                  <button key={p.id} onClick={() => game.openTalk(p.id)}>
                    Parler à : {p.name}
                  </button>
                ))}
            </div>
          </section>
        )}

        {overlay}
        {!overlay && tab === 'journal' && <Journal />}
        {!overlay && tab === 'savoir' && <Knowledge />}
        {!overlay && tab === 'sac' && <Bag />}
        {!overlay && tab === 'vous' && <You author={authorMode} />}

        {game.notices.length > 0 && (
          <div className="toast" onClick={game.clearNotices}>
            {game.notices.map((n, i) => (
              <div key={i}>{n}</div>
            ))}
          </div>
        )}
      </main>

      <nav className="tabs">
        {TABS.map(([id, label]) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

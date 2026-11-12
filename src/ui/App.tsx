import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { authorMode, world } from '../content';
import * as rules from '../engine/rules';
import { useGame } from '../engine/store';
import { Book, type BookTab } from './Book';
import { IconBook, IconFold, IconLayers, IconQuill } from './icons';
import { MapView, type MapHandle } from './MapView';
import { Conversation, NewsView, NoteEditor, ReportView } from './pages';

export function App() {
  const game = useGame();
  const { player } = game;
  const [selected, setSelected] = useState<string | null>(null);
  const [layerId, setLayerId] = useState<string | null>(null);
  const [book, setBook] = useState<BookTab | null>(null);
  const [folded, setFolded] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const mapRef = useRef<MapHandle>(null);

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

  useEffect(() => {
    setSelected(null);
  }, [map.id]);
  useEffect(() => {
    setFolded(false);
  }, [selected, current]);

  // La carte se cadre au-dessus du panneau : elle doit en connaître la hauteur avant de bouger.
  const hud = useRef<HTMLDivElement>(null);
  const inset = useRef(0);
  useLayoutEffect(() => {
    inset.current = hud.current?.offsetHeight ?? 0;
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
  ) : player.dialogue || player.talk ? (
    <Conversation />
  ) : player.pendingReports.length ? (
    <ReportView key={player.pendingReports[0]} />
  ) : null;
  const free = !overlay && !book;

  return (
    <div className="app">
      <MapView
        key={map.id}
        ref={mapRef}
        map={map}
        known={known}
        current={current}
        reachable={reachable}
        selected={selected}
        tint={tint}
        noted={noted}
        inset={inset}
        notes={player.notes}
        onMoveNote={(id, x, y) => game.updateNote(id, { x, y })}
        onOpenNote={setEditing}
        onSelect={setSelected}
      />

      <header className="crest">
        <div>
          <small>{rules.dateLabel(world, player.day)}</small>
          <strong>{map.name}</strong>
        </div>
        {rules.canLeave(world, player) && free && <button onClick={game.leave}>Quitter les lieux</button>}
      </header>

      {free && layer && (
        <ul className="legend">
          <li className="legend-title">{layer.name}</li>
          {Object.values(layer.values).map((v) => (
            <li key={v.label}>
              <i style={{ background: v.color }} />
              {v.label}
            </li>
          ))}
        </ul>
      )}

      {free && (
        <div className="hud" ref={hud}>
          <div className="tools">
            {layerIds.length > 0 && (
              <button
                className={layer ? 'on' : ''}
                onClick={() => setLayerId(layerIds[layerIds.indexOf(layerId ?? '') + 1] ?? null)}
              >
                <IconLayers />
                <span>Calques</span>
              </button>
            )}
            <button
              onClick={() => {
                const c = mapRef.current?.center() ?? { x: map.width / 2, y: map.height / 2 };
                setEditing(game.addNote(c.x, c.y));
              }}
            >
              <IconQuill />
              <span>Noter</span>
            </button>
            <button onClick={() => setBook('journal')}>
              <IconBook />
              <span>Codex</span>
            </button>
          </div>

          <section className={`card ${folded ? 'folded' : ''}`}>
            <button className="fold" onClick={() => setFolded(!folded)} aria-label={folded ? 'Déplier' : 'Replier'}>
              <IconFold up={folded} />
            </button>
            {place.region && <small className="eyebrow">{place.region}</small>}
            <h2>{place.name}</h2>
            {!folded && (
              <>
                <p>{text}</p>
                {layerHere && (
                  <p className="layer-value">
                    <i style={{ background: layerHere.color }} />
                    {layer!.name} : {layerHere.label.toLowerCase()}
                  </p>
                )}
                {notes.map((n, i) => (
                  <p key={i} className="margin-note">
                    {n}
                  </p>
                ))}
                <div className="actions">
                  {!isHere && route && (
                    <button
                      className="seal"
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
                    <button className="seal" onClick={game.enter}>
                      Entrer
                    </button>
                  )}
                  {isHere &&
                    rules.scenesHere(world, player).map((s) => (
                      <button key={s.id} className="seal" onClick={() => game.startScene(s.id)}>
                        {s.label}
                      </button>
                    ))}
                  {isHere &&
                    rules.peopleHere(world, player).map((p) => (
                      <button key={p.id} className="ghost" onClick={() => game.openTalk(p.id)}>
                        Parler à : {p.name}
                      </button>
                    ))}
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {overlay}
      {book && !overlay && (
        <Book
          tab={book}
          onTab={setBook}
          onClose={() => setBook(null)}
          author={authorMode}
          onOpenNote={(id) => {
            setBook(null);
            setEditing(id);
          }}
        />
      )}
      {editing && player.notes.some((n) => n.id === editing) && (
        <NoteEditor id={editing} onClose={() => setEditing(null)} />
      )}

      {game.notices.length > 0 && (
        <div className="toast" onClick={game.clearNotices}>
          {game.notices.map((n, i) => (
            <div key={i}>{n}</div>
          ))}
        </div>
      )}
    </div>
  );
}

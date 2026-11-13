import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { authorMode, world } from '../content';
import * as rules from '../engine/rules';
import { useGame } from '../engine/store';
import { Book, signature, type BookTab } from './Book';
import { IconBag, IconBook, IconFold, IconQuest, IconQuill, IconSeal } from './icons';
import { MapView, type MapHandle } from './MapView';
import { Conversation, NewsView, NoteEditor, ReportView } from './pages';

export function App() {
  const game = useGame();
  const { player } = game;
  const [selected, setSelected] = useState<string | null>(null);
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

  // La quête en cours la plus récente reste affichée sur la carte.
  const active = Object.entries(player.quests)
    .reverse()
    .find(([, q]) => !q.done);
  const dock: [BookTab, string, ReactNode][] = [
    ['quetes', 'Quêtes', <IconQuest />],
    ['savoir', 'Savoir', <IconBook />],
    ['besace', 'Besace', <IconBag />],
    ['carnet', 'Carnet', <IconQuill />],
  ];
  const fresh = (tab: BookTab) => {
    const sig = signature(tab, player);
    return sig !== '' && sig !== '[[],[]]' && game.seen[tab] !== sig;
  };

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
        {free && (
          <button className="self" onClick={() => setBook('vous')} aria-label="Votre personnage">
            <IconSeal />
          </button>
        )}
      </header>

      {free && active && (
        <button className="tracker" onClick={() => setBook('quetes')}>
          <small>Quête en cours</small>
          <span>{world.quests[active[0]].title}</span>
        </button>
      )}

      {free && (
        <div className="hud" ref={hud}>
          <div className="tools">
            {rules.canLeave(world, player) && <button onClick={game.leave}>Quitter les lieux</button>}
            <button
              onClick={() => {
                const c = mapRef.current?.center() ?? { x: map.width / 2, y: map.height / 2 };
                setEditing(game.addNote(c.x, c.y));
              }}
            >
              <IconQuill />
              <span>Noter sur la carte</span>
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
                <div className="card-text">
                  <p>{text}</p>
                  {notes.map((n, i) => (
                    <p key={i} className="margin-note">
                      {n}
                    </p>
                  ))}
                </div>
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

          <nav className="dock">
            {dock.map(([id, label, icon]) => (
              <button key={id} onClick={() => setBook(id)}>
                {icon}
                <span>{label}</span>
                {fresh(id) && <i aria-label="Du nouveau" />}
              </button>
            ))}
          </nav>
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

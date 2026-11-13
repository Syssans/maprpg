import { useRef, useState } from 'react';
import { problems, world } from '../content';
import * as rules from '../engine/rules';
import { useGame } from '../engine/store';
import { allFlags } from '../engine/validate';

/** Le personnage, sa sauvegarde et, pour l'auteur, les outils d'essai. */
export function You({ onAtelier }: { onAtelier(): void }) {
  const { player, toggleUniform, reset, load, author, setAuthor } = useGame();
  const file = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [confirming, setConfirming] = useState(false);

  const exportSave = () => {
    const blob = new Blob([JSON.stringify({ jeu: 'sanctuaire', player }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sanctuaire-jour-${player.day}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importSave = async (f: File | undefined) => {
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (data?.jeu !== 'sanctuaire' || !data.player) throw new Error();
      load(data.player);
      setMessage('Sauvegarde chargée.');
    } catch {
      setMessage("Ce fichier n'est pas une sauvegarde du jeu.");
    }
  };

  return (
    <>
        <small className="eyebrow">Originaire de {world.game.origin}</small>
        <h2>{world.game.title}</h2>
        <hr className="rule" />
        <p>{rules.dateLabel(world, player.day)}.</p>

        <article>
          <h3>L'uniforme</h3>
          <p>
            {player.uniform
              ? "Vous portez l'uniforme de l'Inquisition. On vous parle comme à un officier."
              : "Vous avez ôté l'uniforme. On vous parle comme à n'importe qui."}
          </p>
          <button className="ghost" onClick={toggleUniform}>
            {player.uniform ? "Ôter l'uniforme" : "Remettre l'uniforme"}
          </button>
        </article>

        <article>
          <h3>Votre dossier</h3>
          <p>{rules.dossierHint(player)}</p>
        </article>

        <article>
          <h3>Sauvegarde</h3>
          <p className="muted">La partie s'enregistre seule sur cet appareil. Un fichier permet de la garder ou de la déplacer.</p>
          <div className="actions">
            <button className="ghost" onClick={exportSave}>
              Enregistrer dans un fichier
            </button>
            <button className="ghost" onClick={() => file.current?.click()}>
              Charger un fichier
            </button>
            <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => importSave(e.target.files?.[0])} />
          </div>
          {message && <p className="muted">{message}</p>}
          {confirming ? (
            <div className="actions">
              <button
                className="ghost"
                onClick={() => {
                  reset();
                  setConfirming(false);
                }}
              >
                Oui, effacer la partie
              </button>
              <button className="ghost" onClick={() => setConfirming(false)}>
                Annuler
              </button>
            </div>
          ) : (
            <button className="quiet" onClick={() => setConfirming(true)}>
              Recommencer depuis le début
            </button>
          )}
        </article>

        <article>
          <h3>Écrire le jeu</h3>
          <p className="muted">Les outils d'auteur : l'atelier d'écriture, et de quoi se placer n'importe où dans l'histoire.</p>
          <div className="actions">
            <button className="ghost" onClick={() => setAuthor(!author)}>
              {author ? 'Quitter le mode auteur' : 'Passer en mode auteur'}
            </button>
            {author && (
              <button className="seal" onClick={onAtelier}>
                Ouvrir l'atelier
              </button>
            )}
          </div>
        </article>

        {author && <Author />}
    </>
  );
}

/** Outils d'auteur : vérifier le contenu et se placer n'importe où dans l'histoire. */
function Author() {
  const { player, load } = useGame();
  const set = (patch: Partial<typeof player>) => load({ ...player, ...patch });
  const errors = problems.filter((p) => p.level === 'erreur');
  const places = Object.values(world.maps).flatMap((m) => m.places.map((p) => ({ k: `${m.id}/${p.id}`, m, p })));
  const nodes = Object.values(world.scenes).flatMap((s) => Object.keys(s.nodes).map((n) => `${s.id} → ${n}`));

  return (
    <article className="author">
      <h3>Mode auteur</h3>
      <p className={errors.length ? 'clash' : 'muted'}>
        {problems.length === 0
          ? 'Le vérificateur ne signale rien.'
          : `${errors.length} erreur(s), ${problems.length - errors.length} avertissement(s).`}
      </p>
      {problems.map((p, i) => (
        <p key={i} className="problem">
          <b>{p.level === 'erreur' ? 'Erreur' : 'Attention'}</b> · {p.file}
          {p.line ? `:${p.line}` : ''}
          <br />
          {p.message}
        </p>
      ))}

      <label>
        Aller à
        <select
          value={rules.here(player)}
          onChange={(e) => {
            const t = places.find((x) => x.k === e.target.value)!;
            set({
              mapId: t.m.id,
              positions: { ...player.positions, [t.m.id]: t.p.id },
              visited: [...new Set([...player.visited, t.k])],
              dialogue: null,
              talk: null,
            });
          }}
        >
          {places.map((x) => (
            <option key={x.k} value={x.k}>
              {x.m.name} — {x.p.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Ouvrir un passage
        <select
          value=""
          onChange={(e) => {
            const [scene, node] = e.target.value.split(' → ');
            if (node) set({ dialogue: { scene, node }, talk: null, news: [], pendingReports: [] });
          }}
        >
          <option value="">Choisir…</option>
          {nodes.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>

      <label>
        Jour de la partie
        <input type="number" min={1} value={player.day} onChange={(e) => set({ day: Math.max(1, +e.target.value || 1) })} />
      </label>

      {Object.values(world.quests).map((q) => (
        <label key={q.id}>
          Quête : {q.title}
          <select
            value={player.quests[q.id] ? (player.quests[q.id].done ? '#close' : player.quests[q.id].stage) : ''}
            onChange={(e) => {
              const quests = { ...player.quests };
              const v = e.target.value;
              if (!v) delete quests[q.id];
              else if (v === '#close') quests[q.id] = { stage: quests[q.id]?.stage ?? Object.keys(q.stages)[0], done: true };
              else quests[q.id] = { stage: v, done: false };
              set({ quests });
            }}
          >
            <option value="">non commencée</option>
            {Object.keys(q.stages).map((s) => (
              <option key={s}>{s}</option>
            ))}
            <option value="#close">close</option>
          </select>
        </label>
      ))}

      <small className="eyebrow">Faits</small>
      <div className="flags">
        {allFlags(world).map((f) => (
          <label key={f}>
            <input
              type="checkbox"
              checked={player.flags.includes(f)}
              onChange={(e) =>
                set({ flags: e.target.checked ? [...player.flags, f] : player.flags.filter((x) => x !== f) })
              }
            />
            {f}
          </label>
        ))}
      </div>

      <small className="eyebrow">Savoir découvert</small>
      <div className="flags">
        {world.lore.map((l) => (
          <label key={l.id}>
            <input
              type="checkbox"
              checked={player.learned.includes(l.id)}
              onChange={(e) =>
                set({ learned: e.target.checked ? [...player.learned, l.id] : player.learned.filter((x) => x !== l.id) })
              }
            />
            {l.id}
          </label>
        ))}
      </div>

      <small className="eyebrow">Dossier tenu par l'Inquisition ({player.dossier.length})</small>
      {player.dossier.map((d, i) => (
        <p key={i} className="problem">
          <b>{d.word}</b> · jour {d.day}
          {d.note && (
            <>
              <br />
              {d.note}
            </>
          )}
        </p>
      ))}
      <label>
        Points de talent
        <input type="number" min={0} value={player.points} onChange={(e) => set({ points: Math.max(0, +e.target.value || 0) })} />
      </label>
      <button className="ghost" onClick={() => set({ fired: [], news: [] })}>
        Rejouer les événements
      </button>
    </article>
  );
}

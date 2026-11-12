import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import { playable, problems } from './content';
import { App } from './ui/App';

/** Affiché quand le contenu est trop abîmé pour lancer le jeu : l'auteur voit quoi corriger. */
function Broken() {
  return (
    <div className="broken">
      <h2>Le contenu ne peut pas être joué</h2>
      <p>Corrigez les erreurs ci-dessous dans le dossier content/, puis rechargez.</p>
      {problems.map((p, i) => (
        <p key={i}>
          <b>{p.level === 'erreur' ? 'Erreur' : 'Attention'}</b> · {p.file}
          {p.line ? `:${p.line}` : ''}
          <br />
          {p.message}
        </p>
      ))}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode>{playable ? <App /> : <Broken />}</StrictMode>);

// Hors connexion : une fois le jeu ouvert une première fois, il se rouvre sans réseau.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('./sw.js');
      // Les fichiers chargés avant l'installation du service sont mis de côté à la main.
      const urls = [location.href, ...performance.getEntriesByType('resource').map((e) => e.name)].filter((u) =>
        u.startsWith(location.origin),
      );
      const cache = await caches.open('sanctuaire');
      await Promise.all(urls.map((u) => cache.add(u).catch(() => undefined)));
    } catch {
      // Sans service worker, le jeu fonctionne simplement en ligne.
    }
  });
}

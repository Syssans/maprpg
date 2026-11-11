# Le Sanctuaire et la Tempête

RPG d'exploration et de dialogue, joué sur une carte. Webapp pensée d'abord pour
le mobile, utilisable aussi sur ordinateur. Les personnages et les lieux ne sont
pas représentés : la carte et le texte suffisent, le reste appartient au joueur.

## État du contenu

- **Carte du monde** : version première, dix-neuf villes placées, An 666.
  Estarec n'est pas accessible.
- **Descriptions** : tirées du dossier de présentation. Celles marquées
  `// d'après la carte` dans `src/content/index.ts` attendent le texte de l'auteur.
- **Chemins** : hypothèse de travail, à corriger.
- **Assise** (plan et scène du Conseil) : ébauche à réécrire.

## Lancer

```bash
npm install
```

```bash
npm run dev
```

`npm run build` produit le site statique dans `dist/`.

## Ce que fait le moteur

- **Cartes à plusieurs niveaux** : une image, des lieux posés dessus, des chemins
  entre eux. Un lieu peut ouvrir une carte de niveau inférieur (monde → ville → …).
- **Exploration** : on ne voit que les lieux visités et ceux qu'un chemin y relie.
- **Dialogues à embranchements**, avec conditions et conséquences.
- **Quêtes** (journal), **objets** (sac), sauvegarde locale automatique.

## Organisation

| Dossier | Rôle |
| --- | --- |
| `src/content/` | L'univers : cartes, lieux, dialogues, quêtes, objets. Rien que des données. |
| `src/engine/types.ts` | Le format de ces données. |
| `src/engine/rules.ts` | Les règles, en fonctions pures `(état, action) → état`. |
| `src/engine/store.ts` | État du joueur et sauvegarde. |
| `src/ui/` | Interface (carte Leaflet, panneaux, dialogues). |
| `public/maps/` | Images des cartes. |

Écrire le jeu, c'est remplir `src/content/` : le moteur ne contient aucune narration.
Les coordonnées d'un lieu sont en pixels sur l'image de sa carte.

## Multijoueur

Pas encore. Les règles sont volontairement pures et l'état du joueur sérialisable,
pour pouvoir les exécuter plus tard sur un serveur faisant autorité.

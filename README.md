# Le Sanctuaire et la Tempête

RPG d'exploration et de dialogue, joué sur une carte. Webapp pensée d'abord pour
le mobile, utilisable aussi sur ordinateur. Les personnages et les lieux ne sont
pas représentés : la carte et le texte suffisent, le reste appartient au joueur.

## Règle d'écriture

Le joueur ne sait que ce que le personnage sait. Il incarne un inquisiteur de
troisième classe, natif de Courveil, qui ne connaît que la version d'Huma.
Ce que l'auteur sait de son monde n'entre dans le jeu qu'au moment où le
personnage l'apprend : l'onglet « Savoir » garde alors l'ancienne version à côté
de la nouvelle.

## Écrire

Tout le contenu est dans `content/`, en fichiers texte. Le format est décrit dans
[`content/LISEZ-MOI.md`](content/LISEZ-MOI.md).

```bash
npm run verifier
```

relit le contenu et signale ce qui casserait en jeu.

## Lancer

```bash
npm install
```

```bash
npm run dev
```

`npm run build` vérifie le contenu puis produit le site statique dans `dist/`.

## Ce que fait le moteur

- **Cartes à plusieurs niveaux** : une image, des lieux, des chemins dont la durée se compte en jours.
- **Exploration** : on ne voit que les lieux visités et ceux qu'un chemin y relie.
- **Scènes** à embranchements, avec conditions et conséquences.
- **Savoir** : ce que le personnage croit, puis ce qu'il apprend ; les contradictions sont signalées.
- **Personnes** : tout sujet connu peut être abordé avec elles, et une contradiction leur être opposée.
- **Temps** : calendrier de 225 jours à une ou deux lunes ; des événements datés surviennent sans attendre le joueur.
- **Rapports** : après une opération, le joueur choisit ce qu'il déclare ; le journal garde l'écart.
- **Dossier** : l'Inquisition note ce que fait le joueur, qui n'en devine que le poids. L'uniforme se porte ou s'ôte.
- **Carte annotée** : notes du personnage sur les lieux, calques colorés (par exemple les châtiments).
- **Carnet** : le joueur écrit ses propres notes et les épingle sur la carte en les faisant glisser.
- **Codex** : journal, savoir, besace, carnet et personnage réunis en un livre à signets.
- **Fil des scènes** : ce qui s'est dit reste lisible au-dessus des réponses possibles.
- **Socle** : sauvegarde automatique, export et import en fichier, reprise des anciennes sauvegardes, jeu hors connexion.
- **Mode auteur** (onglet Vous, en développement ou avec `?auteur`) : aller partout, ouvrir tout passage, régler le jour et les faits.

## État du contenu

- **Source** : la bible de l'univers (novembre 2026) et les indications de l'auteur.
- **Carte du monde** : version première, dix-neuf villes placées. Le jeu commence en l'An 538. Estarec n'est pas accessible.
- **Chemins et durées** : hypothèse de travail, à corriger.
- **Quêtes** (`content/quetes/`) : ébauches à réécrire.
- **`content/exemples.txt`** : exemples de personne et d'événement, à supprimer ou réécrire.

## Organisation du code

| Dossier | Rôle |
| --- | --- |
| `content/` | L'univers, en fichiers texte. |
| `src/engine/parser.ts` | Lit ces fichiers. |
| `src/engine/validate.ts` | Les vérifie. |
| `src/engine/rules.ts` | Les règles, en fonctions pures `(monde, état, action) → état`. |
| `src/engine/store.ts` | État du joueur et sauvegarde. |
| `src/ui/` | Interface. |
| `public/maps/` | Images des cartes. |

## Multijoueur

Pas encore. Les règles sont pures et l'état du joueur sérialisable, pour pouvoir
les exécuter plus tard sur un serveur. La forme envisagée est asynchrone (notes en
marge de la carte, rapports qui s'additionnent), pas le temps réel.

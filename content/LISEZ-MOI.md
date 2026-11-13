# Écrire le jeu

Tout ce que le joueur lit se trouve dans ce dossier, en fichiers texte (`.txt`).
Le moteur ne contient aucune narration. Vous pouvez créer autant de fichiers et de
sous-dossiers que vous voulez : ils sont tous lus, dans l'ordre alphabétique.

## Vérifier ce que vous avez écrit

```bash
npm run verifier
```

Le vérificateur relit tout et signale, avec le fichier et la ligne : un choix qui ne
mène nulle part, un passage inatteignable, un objet mal nommé, un lieu sans chemin…
Une **erreur** empêche de publier le jeu ; un **avertissement** mérite un coup d'œil.

Pour essayer en jouant, ouvrez la page du personnage (le sceau en haut à droite) et
passez en **mode auteur** : aller à n'importe quel lieu, ouvrir n'importe quel passage, changer
le jour, cocher des faits et des sujets du Savoir, voir le dossier que l'Inquisition tient sur le joueur.

### L'atelier, pour écrire depuis le jeu

En mode auteur, « Ouvrir l'atelier » donne un éditeur dans le jeu lui-même, utilisable
sur téléphone. Des boutons y insèrent des modèles (quête, scène, choix, jet de dés,
personne…), « Vérifier et essayer » relit le texte et le met aussitôt en jeu, et un
aide-mémoire liste les noms existants. Ces documents restent sur l'appareil : pour les
faire entrer dans le jeu de tous, copiez leur texte dans un fichier de ce dossier.

## Les règles communes

- Un fichier est une suite de **blocs**. Un bloc commence par `== TYPE nom : Titre`.
- Une ligne qui commence par `//` est une note pour vous : le jeu l'ignore.
- Une ligne vide sépare deux paragraphes.
- Les **noms** (de lieu, de quête, de fait…) s'écrivent sans espace : `rue-basse`,
  `puits_su`. Les accents et les majuscules n'y comptent pas.
- Un lieu se désigne par `carte/lieu` : `monde/courveil`.

### Les conditions : `[si …]`

Une condition se place entre crochets, en fin de ligne. Plusieurs conditions se
séparent par une virgule ou par « et » : elles doivent toutes être vraies.

| Condition | Vraie quand… |
| --- | --- |
| `fait puits_su` / `pas fait puits_su` | ce fait a été posé / ne l'a pas été |
| `a ordre` / `sans ordre` | l'objet est dans le sac / n'y est pas |
| `quête operation non commencée` | la quête n'a jamais commencé |
| `quête operation commencée` | elle a commencé (close ou non) |
| `quête operation en cours` | elle a commencé et n'est pas close |
| `quête operation = rue` | elle est en cours, à cette étape |
| `quête operation close` | elle est close |
| `sait elfes` / `ignore elfes` | le personnage connaît une version de ce sujet / aucune |
| `contradiction elfes` | il connaît deux versions du sujet qui ne s'accordent pas |
| `jour >= 30` | on est au moins au 30ᵉ jour de la partie (aussi `>`, `<`, `<=`, `=`) |
| `depuis convocation > 14` | plus de 14 jours ont passé depuis le repère `convocation` |
| `dossier >= 3` | l'Inquisition a noté au moins trois choses sur le joueur |
| `dossier bavard >= 2` | dont au moins deux sous le mot « bavard » |
| `en uniforme` / `sans uniforme` | le joueur porte l'uniforme / l'a ôté |
| `compétence doute >= 3` | ce talent a atteint ce niveau |
| `visité monde/assise` | il est déjà passé par ce lieu |
| `ici monde/lastille` | il s'y trouve en ce moment |

### Les effets : `+ …`

Un effet est une ligne qui commence par `+`. Il change l'état de la partie.

| Effet | Ce qu'il fait |
| --- | --- |
| `+ fait puits_su` | pose un fait (`- fait puits_su` le retire) |
| `+ objet ordre` | donne un objet (`- objet ordre` le reprend) |
| `+ quête operation = rue` | commence la quête, ou la fait passer à cette étape |
| `+ quête operation close` | clôt la quête |
| `+ jours 3` | fait passer trois jours |
| `+ repère convocation` | retient le jour présent sous ce nom |
| `+ dossier bavard : A parlé du puits.` | l'Inquisition note quelque chose (le joueur ne le voit pas) |
| `+ rapport rue-basse` | le joueur devra rédiger ce rapport dès la fin de la scène |
| `+ va monde/assise` | transporte le joueur dans ce lieu |
| `+ savoir elfes` | inscrit ce sujet au Savoir du joueur |
| `+ points 1` | donne un point de talent à répartir |
| `+ compétence doute 1` | augmente directement un talent |
| `+ scène interrogatoire` | lance une autre scène (depuis un choix, une réponse ou un événement) |

## Les blocs

### Une scène

```
== SCÈNE operation @ monde/courveil : Passer au bureau de l'Inquisition
début ordre [si quête operation non commencée]
début rue [si quête operation = rue]

--- ordre
Au bureau, votre premier ordre de mission vous attend.
+ objet ordre
> Se rendre rue Basse. -> rue
> Plus tard.

--- voisine
@ La voisine
L'eau a tourné, Inquisiteur.
> Repartir sans lui. -> classe [si fait puits_su]
  + fait elfe_epargne
```

- `@ monde/courveil` : le lieu où la scène se joue. Le titre devient le bouton.
  Sans `@`, la scène ne se lance que par un effet `+ scène`.
- `début passage [si …]` : par où la scène commence. La première ligne dont la
  condition est remplie l'emporte ; si aucune ne l'est, le bouton n'apparaît pas.
  Sans ligne `début`, la scène commence à son premier passage.
- `--- nom` ouvre un passage. `@ Nom` indique qui parle (facultatif).
- `> texte -> passage` est un choix. Sans `->`, le choix termine la scène.
  Un passage sans aucun choix se termine par « Poursuivre ».
- Un `+` placé **avant** les choix vaut dès qu'on arrive au passage ; placé
  **après** un choix, il ne vaut que si l'on prend ce choix.

### Un jet de dés

```
> Examiner d'abord le puits. [jet vigilance 9] -> margelle / eau
  bonus +2 [si sans uniforme] : Personne ne s'écarte : vous prenez votre temps.
  + fait puits_su
```

- `[jet talent difficulté]` : le joueur lance deux dés, ajoute son talent, et doit
  atteindre la difficulté. Double un rate toujours, double six réussit toujours.
- `-> reussite / echec` : les deux passages où mène le jet.
- Difficultés : 6 aisé · 8 ordinaire · 10 malaisé · 12 ardu · 14 redoutable · 16 presque impossible.
  Le joueur voit sa chance en pourcentage avant de choisir.
- `bonus +2 [si …] : raison` et `malus -1 [si …] : raison` modifient le jet.
- Les effets `+` placés sous le choix ne valent qu'en cas de **réussite**.
- Un jet raté se retente quand le talent a progressé. `[jet doute 10 sans retour]`
  n'autorise qu'une tentative. Un jet réussi ne se relance plus.

### Une remarque soufflée par un talent

```
--- depuis
@ La voisine
Lui ? Il est arrivé l'an passé.
~ doute 2 : Elle sait que les dates ne tombent pas juste.
```

La ligne `~ talent niveau : texte` s'ajoute au passage, sans jet, si le talent du
joueur atteint ce niveau.

### Un talent

```
== COMPÉTENCE doute : Doute
groupe : Le Regard
Entendre ce qui ne s'accorde pas dans ce qu'on vous affirme.
```

Les talents commencent à 1 et montent jusqu'à 6. `groupe` les range par famille sur
la page des talents. `points de départ : 3`, dans le bloc `== JEU`, fixe ce que le
joueur répartit en commençant.

### Une quête

```
== QUÊTE operation : Première opération
étape rue : Une dénonciation, rue Basse.
étape arrete : Vous avez arrêté l'Elfe.
épilogue : Ce que le journal garde une fois la quête close (facultatif).
```

### Un sujet du Savoir

```
== SAVOIR elfes : Les Elfes
[Ce qu'on vous a enseigné] On ne s'approche pas des Elfes.
[Ce que vous avez constaté | si fait puits_su | contredit] Le puits était gâté avant lui.
```

Le codex est **vide au départ**. Un sujet n'y entre que lorsque le joueur le découvre :
par un effet `+ savoir elfes` (dans une scène, une réponse, un événement), ou parce
qu'une de ses versions conditionnelles devient vraie. Le vérificateur signale les
sujets que rien ne fait découvrir.

Chaque version commence par sa **source** entre crochets. On peut y ajouter une
condition (`si …`) et le mot `contredit`, qui signale qu'elle ne s'accorde pas avec
les autres. Une version acquise s'ajoute sous les précédentes sans les effacer.
Tout sujet découvert peut être abordé avec les personnes rencontrées.

### Une personne

```
== PERSONNE collegue @ monde/courveil : Un collègue du bureau [si quête operation commencée]
Il classe des feuilles sans lever les yeux.

? elfes : On ne t'a pas fait entrer ici pour te poser la question.
! elfes : Le puits ? Garde ça pour toi.
  + dossier bavard : A parlé du puits à un collègue.
? loi-pourpre [si en uniforme] : Pas ici.
? * : Il hausse les épaules.
```

- Le texte du début est ce que l'on voit de la personne en l'abordant.
- `? sujet : réponse` — ce qu'elle dit de ce sujet du Savoir.
- `! sujet : réponse` — ce qu'elle dit si le joueur tient une **contradiction** sur ce sujet.
- `? * : réponse` — ce qu'elle dit de tout le reste.
- Les effets d'une réponse ne valent que la première fois.

### Un lieu

```
== LIEU monde/courveil : Courveil
position : 718, 546
région : Hautes Plaines
chemins : terner (3), noctem (3)
entre dans : courveil-ville
Votre ville natale, sur le fleuve.
[si quête convocation close] Votre ville natale. Vous n'y êtes plus chez vous.
note [si fait puits_su] : Rue Basse : le puits était gâté avant lui.
```

- `position` : en pixels sur la grille de la carte, depuis le coin haut gauche.
- `chemins` : les lieux voisins et la durée du trajet en jours. Un chemin ne s'écrit
  qu'une fois, d'un seul côté ; il se parcourt dans les deux sens.
- Le texte libre est la description. Une ligne `[si …] texte` la **remplace** quand
  sa condition est remplie.
- `note [si …] : texte` **ajoute** une annotation de la main du personnage ; le lieu
  est alors marqué sur la carte.
- `entre dans` : la carte de niveau inférieur que ce lieu ouvre (un plan de ville).

### Une carte

```
== CARTE courveil-ville : Courveil
image : maps/courveil.jpg
taille : 1200 x 900
entrée : porte
parent : monde
noms imprimés : non
```

L'image se dépose dans `public/maps/`. `entrée` est le lieu où l'on arrive, et le
seul d'où l'on peut ressortir vers la carte `parent`. `noms imprimés : oui` évite
d'écrire deux fois les noms déjà dessinés sur l'image.

### Un rapport

```
== RAPPORT rue-basse : Rapport — affaire de la rue Basse
On vous tend une feuille.

* Le puits
= vrai : « Le puits était gâté avant son arrivée. » [si fait puits_su]
  + dossier fougueux : A contredit une dénonciation.
= faux : « L'Elfe a gâté le puits. »
= omis : Ne rien écrire sur le puits.
```

Chaque point `*` propose ce que le joueur peut déclarer : `vrai`, `faux` ou `omis`.
Le journal garde ce qu'il a écrit. Prévoyez toujours une réponse sans condition.

### Un événement

```
== ÉVÉNEMENT barques-allen : Des nouvelles de la côte [si jour >= 6]
Des barques ont touché la côte d'Allen.
+ fait barques_allen
```

Un événement survient **une seule fois**, dès que sa condition est remplie, où que
soit le joueur. S'il a un texte, le joueur le lit ; sinon il passe inaperçu et ne
fait que produire ses effets. C'est ainsi que le monde avance sans attendre le joueur.

### Les réglages du jeu

```
== JEU
personnage : Inquisiteur de troisième classe
origine : Courveil
départ : monde
an : 538
jour : 1
jours par an : 225
lunes : 2
```

`lunes` est le nombre de lunes l'année du départ ; il alterne ensuite chaque année.

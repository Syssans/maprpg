// « Le Sanctuaire et la Tempête », An 666.
//
// RÈGLE D'ÉCRITURE : le joueur ne sait que ce que le personnage sait.
// Le personnage est un inquisiteur de troisième classe, originaire de Courveil,
// qui ne connaît que la version d'Huma. Rien de ce que le dossier de présentation
// révèle au lecteur (l'origine d'Huma, les mères exilées, les Astromanciens…)
// ne doit apparaître ici avant qu'il ne l'ait appris en jeu.
//
// - Les descriptions marquées « d'après la carte » ne s'appuient que sur le dessin.
// - Les chemins sont une hypothèse de travail.
// - La doctrine d'Huma (rubrique `lore`) reste à écrire par l'auteur.
import type { World } from '../engine/types';

const base = import.meta.env.BASE_URL;

export const world: World = {
  character: { title: 'Inquisiteur de troisième classe', origin: 'Courveil' },

  // Le savoir de départ est la version d'Huma, dite avec ses mots à elle.
  lore: [
    {
      id: 'huma',
      title: 'Huma',
      versions: [
        {
          source: "Ce qu'on vous a enseigné",
          text: "Huma est la déesse protectrice du genre humain. Vous dites son nom chaque matin.",
        },
      ],
    },
    {
      // PROPOSITION — l'auteur n'a pas tranché le récit des origines.
      id: 'hommes',
      title: 'Les Hommes',
      versions: [
        {
          source: "Ce qu'on vous a enseigné",
          text: "Nous sommes les enfants d'Huma. Elle nous a mis au monde, et quand les Elfes ont voulu notre perte, elle nous a cachés, nourris et conduits en lieu sûr.",
        },
      ],
    },
    {
      id: 'elfes',
      title: 'Les Elfes',
      versions: [
        {
          source: "Ce qu'on vous a enseigné",
          text: "On ne s'approche pas des Elfes. Il n'est pas de mal dont ils ne soient la cause : on vous l'a répété, comme on l'avait répété à vos parents. Ils n'ont pas les droits des Hommes, et c'est justice.",
        },
        {
          if: { flags: ['puits_su'] },
          source: 'Ce que vous avez constaté',
          text: "Rue Basse, on a dénoncé un Elfe pour un puits gâté. Le puits l'était avant qu'il n'habite la rue. Personne, sauf vous, n'a trouvé que cela changeait quelque chose.",
        },
      ],
    },
    {
      id: 'inquisition',
      title: "L'Inquisition",
      versions: [
        {
          source: "Ce qu'on vous a enseigné",
          text: "Le bras d'Huma. Un inquisiteur est un officier : il reçoit les dénonciations, conduit les arrestations et les rafles, et fait respecter la doctrine dans l'espace public. Vous venez d'y entrer, à la troisième classe, la dernière.",
        },
      ],
    },
    {
      id: 'loi-pourpre',
      title: 'La Loi Pourpre',
      versions: [
        {
          source: "Ce qu'on vous a enseigné",
          text: "Elle est interdite à Courveil. Là où elle a cours, son application revient à des officiers d'un rang supérieur au vôtre.",
        },
      ],
    },
    {
      id: 'lampes',
      title: 'Les Hautes Lampes',
      versions: [
        {
          source: 'Ce que chacun sait',
          text: "Elles sont gardées par l'ordre des mages.",
        },
      ],
    },
  ],

  startMap: 'monde',

  maps: {
    monde: {
      id: 'monde',
      name: 'Le continent',
      image: `${base}maps/monde.jpg`,
      width: 2000,
      height: 1564,
      printedLabels: true,
      entry: 'courveil',
      places: [
        // ——— Nord de l'Aînée ———
        {
          id: 'col-carnem',
          name: 'Col Carnem',
          x: 245,
          y: 252,
          region: 'Blanche Sévérie',
          description:
            "Capitale de la République du Nord, sur des terres glacées. Sa puissance militaire est sans égale. C'est la seule ville où les Elfes se pavanent dans les rues sans être inquiétés. Au-delà s'arrête le monde praticable.",
        },
        {
          id: 'vilpiere',
          name: 'Vilpière',
          x: 433,
          y: 355,
          region: 'Verte Sévérie',
          // d'après la carte
          description:
            "Là où la neige cède aux plaines forestières. Un peuple cosmopolite y vit sous l'autorité de Col Carnem.",
        },
        {
          id: 'bordemer',
          name: 'Bordemer',
          x: 314,
          y: 685,
          region: 'Les Lacs',
          // d'après la carte — en attente de ce que la doctrine dit de Bordemer
          description: "Une ville des Lacs, là où l'Aînée rejoint la mer de l'ouest.",
        },
        {
          id: 'rive-claire',
          name: 'Rive Claire',
          x: 488,
          y: 680,
          region: 'Les Lacs',
          description:
            "Le grenier du continent s'arrête ici, au bord de la crevasse. Ses ponts sont le seul passage entre le Nord et le Sud.",
        },
        {
          id: 'courveil',
          name: 'Courveil',
          x: 718,
          y: 546,
          region: 'Hautes Plaines',
          // d'après la carte
          description:
            "Votre ville natale, sur le fleuve, à la lisière des Lacs et des Hautes Plaines. La Loi Pourpre y est interdite ; les Elfes n'y sont pas pour autant les égaux des Hommes.",
          dialogue: 'operation',
          actionLabel: "Lire l'ordre de mission",
        },
        {
          id: 'terner',
          name: 'Terner',
          x: 906,
          y: 415,
          region: 'Hautes Plaines',
          description: "Capitale d'un royaume tranquille : on y vit d'élevage et de pêche en eaux froides.",
        },
        {
          id: 'mortneuve',
          name: 'Mortneuve',
          x: 988,
          y: 329,
          region: 'Hautes Plaines',
          // d'après la carte
          description: "Un port du nord-est, à l'embouchure d'un fleuve, face à la mer froide.",
        },
        {
          id: 'noctem',
          name: 'Noctem',
          x: 915,
          y: 645,
          region: 'Hautes Plaines',
          description:
            "La place forte des Elfes, la dernière. Vous n'y êtes jamais allé. On dit que sous ses montagnes s'étend une mer.",
        },

        // ——— Sud de l'Aînée ———
        {
          id: 'lastille',
          name: 'Lastille',
          x: 500,
          y: 718,
          region: 'Valore',
          description: "La jumelle sud de Rive Claire, de l'autre côté des ponts. Ici commence le plateau de Valore.",
        },
        {
          id: 'assise',
          name: 'Assise',
          x: 155,
          y: 768,
          region: 'Valore',
          description: "La ville du Conseil Continental, où le Nord et le Sud se parlent. On y débat de tout, et d'abord de la question elfique.",
        },
        {
          id: 'freteaux',
          name: 'Fréteaux',
          x: 186,
          y: 955,
          region: 'Valore',
          // d'après la carte
          description: "Un port de la côte ouest, à l'embouchure d'un fleuve descendu des montagnes.",
        },
        {
          id: 'dirgue',
          name: 'Dirgue',
          x: 331,
          y: 1066,
          region: 'Valore',
          // d'après la carte
          description: "La dernière ville de Valore avant l'Alyr.",
        },
        {
          id: 'tissin',
          name: 'Tissin',
          x: 312,
          y: 1148,
          region: 'Alyr occidental',
          description: "On la connaît pour son tunnel troglodyte, long de douze kilomètres sous la montagne.",
        },
        {
          id: 'rosebourg',
          name: 'Rosebourg',
          x: 708,
          y: 1075,
          region: 'Alyr septentrional',
          // d'après la carte
          description: "Une ville au confluent des fleuves de l'Alyr, sur la route de Calnire.",
        },
        {
          id: 'allen',
          name: 'Allen',
          x: 1000,
          y: 875,
          region: 'Alyr oriental',
          // d'après la carte
          description: "Un port de la côte est, tourné vers une mer que plus personne ne traverse.",
        },
        {
          id: 'calnire',
          name: 'Calnire',
          x: 886,
          y: 1127,
          region: 'Alyr',
          description:
            "La cité blanche des rois, fermée et méfiante. De ses murailles, dit-on, on voit désormais les difformités de la Tempête.",
        },
        {
          id: 'selene',
          name: 'Sélène',
          x: 830,
          y: 1322,
          region: 'Alyr',
          // d'après la carte
          description: "Une ville entre le lac et la forêt, au sud de Calnire.",
        },
        {
          id: 'sevirin',
          name: 'Sévirin',
          x: 670,
          y: 1370,
          region: 'Alyr central',
          // d'après la carte
          description: "Un port de la côte sud, au débouché du désert.",
        },
        {
          id: 'portvilla',
          name: 'Portvilla',
          x: 460,
          y: 1375,
          region: 'Alyr méridional',
          // d'après la carte
          description: "Un port à l'extrémité sud du continent.",
        },
      ],
      routes: [
        // Nord
        ['col-carnem', 'vilpiere'],
        ['vilpiere', 'rive-claire'],
        ['bordemer', 'rive-claire'],
        ['rive-claire', 'courveil'],
        ['courveil', 'terner'],
        ['courveil', 'noctem'],
        ['terner', 'mortneuve'],
        ['terner', 'noctem'],
        // Les ponts : seul passage au-dessus de l'Aînée
        ['rive-claire', 'lastille'],
        // Sud
        ['lastille', 'assise'],
        ['assise', 'freteaux'],
        ['freteaux', 'dirgue'],
        ['dirgue', 'tissin'],
        ['tissin', 'portvilla'],
        ['dirgue', 'rosebourg'],
        ['lastille', 'rosebourg'],
        ['rosebourg', 'calnire'],
        ['calnire', 'allen'],
        ['calnire', 'selene'],
        ['selene', 'sevirin'],
        ['sevirin', 'portvilla'],
      ],
    },
  },

  items: {
    ordre: {
      id: 'ordre',
      name: 'Ordre de mission',
      description: "Votre premier. Une dénonciation, rue Basse, à Courveil : un Elfe y aurait gâté le puits.",
    },
  },

  quests: {
    operation: {
      id: 'operation',
      title: 'Première opération',
      stages: {
        rue: "Une dénonciation, rue Basse, à Courveil : un Elfe y aurait gâté le puits. Vous avez quatre hommes et la journée.",
        arrete: "Vous avez arrêté l'Elfe de la rue Basse. La rue a applaudi.",
        classe: "Vous êtes reparti sans l'Elfe de la rue Basse. Il faudra en répondre.",
      },
    },
  },

  // ÉBAUCHE — ouverture proposée. La rue Basse, la voisine et les quatre hommes
  // sont des inventions de travail ; seul le cadre vient de l'auteur
  // (un officier qui reçoit des dénonciations, et « toutes les raisons sont bonnes »).
  dialogues: {
    operation: {
      id: 'operation',
      start: [
        { if: { questNotStarted: 'operation' }, node: 'ordre' },
        { if: { questStage: ['operation', 'rue'] }, node: 'rue' },
      ],
      nodes: {
        ordre: {
          text: "Votre premier ordre de mission vous attend, plié en quatre. Une dénonciation, rue Basse : un Elfe y aurait gâté le puits. On vous donne quatre hommes et la journée.",
          effects: [{ giveItem: 'ordre' }, { questStage: ['operation', 'rue'] }],
          choices: [{ text: 'Se rendre rue Basse.', next: 'rue' }, { text: 'Plus tard.' }],
        },
        rue: {
          text: "La rue s'est vidée à votre approche, puis remplie de nouveau, à distance. On vous regarde faire. C'est la première fois qu'on vous regarde ainsi.",
          choices: [
            { text: 'Faire venir celle qui a dénoncé.', next: 'voisine' },
            { text: "Frapper chez l'Elfe.", next: 'elfe' },
          ],
        },
        voisine: {
          speaker: 'La voisine',
          text: "L'eau a tourné, Inquisiteur. Elle sent la vase. Et lui, il en boit sans faire la grimace. Vous trouvez ça naturel, vous ?",
          choices: [
            { text: "Depuis quand l'eau a-t-elle tourné ?", next: 'depuis' },
            { text: "Cela suffit. Frapper chez l'Elfe.", next: 'elfe' },
          ],
        },
        depuis: {
          speaker: 'La voisine',
          text: "Oh, des années. Ma mère s'en plaignait déjà. Lui ? Il est arrivé l'an passé. Elle s'arrête, compte, hausse les épaules. Et qu'est-ce que ça change ? C'en est un.",
          effects: [{ setFlag: 'puits_su' }],
          choices: [{ text: "Frapper chez l'Elfe.", next: 'elfe' }],
        },
        elfe: {
          text: "Il ouvre avant le second coup. Il a déjà son manteau sur les épaules. « C'est pour le puits, dit-il. Je l'ai vu creuser, vous savez. Il n'a jamais été bon. »",
          choices: [
            {
              text: "L'arrêter. Une dénonciation est une dénonciation.",
              next: 'arrete',
              effects: [{ setFlag: 'elfe_arrete' }, { questStage: ['operation', 'arrete'] }, { completeQuest: 'operation' }],
            },
            {
              text: 'Repartir sans lui, et consigner que la dénonciation ne tient pas.',
              if: { flags: ['puits_su'] },
              next: 'classe',
              effects: [{ setFlag: 'elfe_epargne' }, { questStage: ['operation', 'classe'] }, { completeQuest: 'operation' }],
            },
          ],
        },
        arrete: {
          text: "Il vous suit sans que vos hommes aient à le toucher. Derrière vous, la rue applaudit. Vous êtes officier d'Huma, et la journée n'est pas finie.",
        },
        classe: {
          text: "Vos hommes se regardent. La voisine vous regarde. Vous écrivez trois lignes au dos de l'ordre, et vous savez déjà qu'on vous demandera pourquoi.",
        },
      },
    },
  },
};

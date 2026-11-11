// L'univers du « Sanctuaire et la Tempête », An 666.
//
// Sources : le dossier de présentation et la carte du monde (version première).
// - Les descriptions marquées « d'après la carte » ne s'appuient que sur le dessin :
//   elles attendent le texte de l'auteur.
// - Les chemins sont une hypothèse de travail, à corriger.
// - Le plan d'Assise et la scène du Conseil sont une ébauche à réécrire.
import type { World } from '../engine/types';

const base = import.meta.env.BASE_URL;

export const world: World = {
  startMap: 'monde',

  maps: {
    monde: {
      id: 'monde',
      name: 'Le continent',
      image: `${base}maps/monde.jpg`,
      width: 2000,
      height: 1564,
      printedLabels: true,
      entry: 'assise',
      places: [
        // ——— Nord de l'Aînée ———
        {
          id: 'col-carnem',
          name: 'Col Carnem',
          x: 245,
          y: 252,
          region: 'Blanche Sévérie',
          description:
            "Capitale de la République du Nord, sur des terres glacées. Sa puissance militaire est sans égale. Au-delà s'arrête le monde praticable.",
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
          description:
            "La ville que fondèrent les mères exilées. D'ici, les Hommes jetèrent le premier pont au-dessus de l'Aînée. Il n'en reste rien.",
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
          description: "Une ville de fleuve, à la lisière des Lacs et des Hautes Plaines.",
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
            "La dernière société elfique organisée, et son unique place forte. Sous ses montagnes s'étend la Mer Éternelle, grotte-cathédrale où pleut la neige fondue.",
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
          description:
            "La ville du Conseil Continental, née de la réconciliation du Nord et du Sud. On y débat de tout, et d'abord de la question elfique.",
          enters: 'assise',
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
            "La cité blanche des rois, fermée et méfiante. De ses murailles, on voit la mer là où aurait dû se dresser Salande — et, désormais, les difformités de la Tempête.",
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

    // ÉBAUCHE — plan provisoire, en attendant une carte d'Assise.
    assise: {
      id: 'assise',
      name: 'Assise',
      image: `${base}maps/assise.svg`,
      width: 1200,
      height: 900,
      entry: 'portes',
      parent: 'monde',
      places: [
        {
          id: 'portes',
          name: 'Les portes de la ville',
          x: 380,
          y: 560,
          description: "On entre à Assise comme on entre en séance : en déclinant d'abord qui l'on représente.",
        },
        {
          id: 'conseil',
          name: 'Le Conseil Continental',
          x: 800,
          y: 340,
          description:
            "Depuis la réconciliation, le Nord et le Sud s'y parlent au lieu de se battre. Personne n'y est d'accord, et c'est ce qui tient la paix.",
          dialogue: 'seance',
          actionLabel: 'Prendre place',
        },
      ],
      routes: [['portes', 'conseil']],
    },
  },

  items: {},

  quests: {
    seance: {
      id: 'seance',
      title: 'La séance',
      stages: {
        entendu:
          "Au Conseil, un délégué du Sud a parlé du Fléau comme d'une affaire classée. Le représentant de Noctem n'a rien répondu.",
        soeur:
          "Le représentant de Noctem a enterré sa sœur, devenue fléotique. Ce que la doctrine nomme un fait d'histoire, il l'appelle par un prénom qu'il ne vous a pas dit.",
      },
    },
  },

  // ÉBAUCHE — d'après la piste de scène du dossier : le vieux représentant de Noctem
  // entend les humains parler du Fléau comme d'un fait historique.
  // Le joueur est l'Inquisiteur ; aucun personnage n'est encore nommé.
  dialogues: {
    seance: {
      id: 'seance',
      start: [
        { if: { questNotStarted: 'seance' }, node: 'ouverture' },
        { if: { questStage: ['seance', 'entendu'] }, node: 'retour' },
        { node: 'vide' },
      ],
      nodes: {
        ouverture: {
          text: "Vous avez dit ce matin le nom d'Huma, comme chaque matin, et vous prenez votre place parmi les représentants. On débat de la Loi Pourpre. On en débat depuis si longtemps que les phrases sont usées aux coudes.",
          choices: [{ text: 'Écouter.', next: 'delegue' }],
        },
        delegue: {
          speaker: 'Un délégué du Sud',
          text: "Le Fléau appartient à l'histoire. Nous en parlons comme nos aïeux parlaient des grandes crues : avec respect, et avec la ferme intention de ne plus bâtir au bord de l'eau.",
          choices: [
            { text: 'Approuver de la tête. La doctrine ne dit pas autre chose.', next: 'regard' },
            { text: 'Regarder comment la salle reçoit ces mots.', next: 'regard' },
          ],
        },
        regard: {
          text: "Au banc de Noctem, un vieil Elfe écoute sans bouger. Il ne proteste pas. Il a l'air d'un homme à qui l'on décrit sa propre maison, et qui ne la reconnaît pas.",
          effects: [{ questStage: ['seance', 'entendu'] }],
          choices: [
            { text: "Aller le trouver quand la séance s'interrompt.", next: 'approche' },
            { text: 'Rester à votre place.' },
          ],
        },
        retour: {
          text: "La séance est suspendue. Le représentant de Noctem est resté assis à son banc, seul, les mains à plat sur le bois.",
          choices: [{ text: 'Aller le trouver.', next: 'approche' }, { text: 'Le laisser.' }],
        },
        approche: {
          speaker: 'Le représentant de Noctem',
          text: "Inquisiteur. Vous venez m'expliquer ce que j'ai entendu, ou me demander ce que j'en pense ?",
          choices: [
            { text: "Vous l'expliquer. La Loi ne tue personne.", next: 'doctrine' },
            { text: 'Vous le demander.', next: 'soeur' },
          ],
        },
        doctrine: {
          speaker: 'Le représentant de Noctem',
          text: "Non. Elle attend. C'est une loi patiente, je vous l'accorde. Vous croyez ce que vous dites, n'est-ce pas ? C'est ce qui me rend la chose difficile.",
          choices: [{ text: 'À quoi pensiez-vous, pendant qu’il parlait ?', next: 'soeur' }],
        },
        soeur: {
          speaker: 'Le représentant de Noctem',
          text: "À ma sœur. Elle a d'abord cessé de dormir. Puis elle s'est mise à compter les torts qu'on lui avait faits, et il y en avait de plus en plus. À la fin, elle ne savait plus mon nom. Je l'ai enterrée moi-même. Votre collègue appelle cela l'histoire.",
          effects: [{ questStage: ['seance', 'soeur'] }],
          choices: [
            { text: 'Huma veille sur elle.', next: 'huma' },
            { text: 'Ne rien dire.', next: 'silence' },
          ],
        },
        huma: {
          speaker: 'Le représentant de Noctem',
          text: "Je le souhaite. Savez-vous seulement pour qui votre déesse a veillé, la première fois ?",
        },
        silence: {
          text: "Il vous regarde un moment, puis incline la tête, comme on remercie quelqu'un de ne pas avoir parlé.",
        },
        vide: {
          text: "Les bancs se vident. Le représentant de Noctem est parti. La séance reprendra, et l'on y dira les mêmes phrases.",
        },
      },
    },
  },
};

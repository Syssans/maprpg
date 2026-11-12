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

  lore: [
    {
      id: 'huma',
      title: 'Huma',
      versions: [
        {
          source: "Ce qu'on vous a enseigné",
          text: "Huma est la déesse des Hommes. Vous dites son nom chaque matin.",
        },
      ],
    },
    {
      id: 'inquisition',
      title: "L'Inquisition",
      versions: [
        {
          source: "Ce qu'on vous a enseigné",
          text: "Le bras de la foi d'Huma, et la garde du genre humain. Vous venez d'y entrer, au dernier rang : la troisième classe.",
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
          description: "Votre ville natale. Une ville de fleuve, à la lisière des Lacs et des Hautes Plaines.",
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

  items: {},

  quests: {},

  dialogues: {},
};

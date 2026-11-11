// CONTENU DE DÉMONSTRATION — à remplacer par l'univers véritable.
// Il ne sert qu'à éprouver le moteur : deux niveaux de carte, une quête,
// un objet, des dialogues à embranchements.
import type { World } from '../engine/types';

const base = import.meta.env.BASE_URL;

export const world: World = {
  startMap: 'monde',

  maps: {
    monde: {
      id: 'monde',
      name: 'Le Pays',
      image: `${base}maps/world.svg`,
      width: 2000,
      height: 1400,
      entry: 'gue',
      places: [
        {
          id: 'gue',
          name: 'Le Gué',
          x: 620,
          y: 860,
          description:
            "La rivière s'étale ici sur des galets clairs. Une barque à fond plat attend, bien que l'eau ne monte pas au genou.",
          dialogue: 'passeur',
          actionLabel: 'Parler au passeur',
        },
        {
          id: 'bourg',
          name: 'Le Bourg',
          x: 1000,
          y: 620,
          description:
            "Une enceinte basse, plus ancienne que ceux qui l'habitent. On y entre par une seule porte, qu'on ne ferme plus.",
          enters: 'bourg',
        },
        {
          id: 'borne',
          name: 'La Borne',
          x: 1320,
          y: 880,
          description:
            "Une pierre dressée au milieu d'un pré. L'herbe est couchée d'un côté, comme si l'on avait traîné quelque chose de lourd.",
          dialogue: 'borne',
          actionLabel: 'Examiner la pierre',
        },
        {
          id: 'col',
          name: 'Le Col',
          x: 1500,
          y: 420,
          description:
            "Le chemin monte jusqu'ici, puis redescend vers des terres que la carte ne montre pas encore.",
        },
      ],
      routes: [
        ['gue', 'bourg'],
        ['bourg', 'borne'],
        ['bourg', 'col'],
      ],
    },

    bourg: {
      id: 'bourg',
      name: 'Le Bourg',
      image: `${base}maps/bourg.svg`,
      width: 1200,
      height: 900,
      entry: 'porte',
      parent: 'monde',
      places: [
        {
          id: 'porte',
          name: 'La Porte',
          x: 250,
          y: 700,
          description: "Deux battants de chêne, ouverts depuis si longtemps que le lierre les tient au mur.",
        },
        {
          id: 'marche',
          name: 'La Place',
          x: 560,
          y: 470,
          description:
            "On y vend peu, on y parle beaucoup. Chacun sait à qui appartient le pré de la borne, et personne ne dit la même chose.",
        },
        {
          id: 'archives',
          name: 'Les Archives',
          x: 880,
          y: 300,
          description: "Une salle voûtée qui sent la poussière et la cire. Les registres y sont plus nombreux que les lecteurs.",
          dialogue: 'archiviste',
          actionLabel: "Parler à l'archiviste",
        },
      ],
      routes: [
        ['porte', 'marche'],
        ['marche', 'archives'],
      ],
    },
  },

  items: {
    cadastre: {
      id: 'cadastre',
      name: 'Feuillet de cadastre',
      description:
        "Un relevé ancien du pré. La borne y figure, à trente pas de l'endroit où elle se dresse aujourd'hui. Le nom du commanditaire a été gratté.",
    },
  },

  quests: {
    borne: {
      id: 'borne',
      title: 'La borne déplacée',
      stages: {
        enquete:
          "Le passeur affirme que la borne du pré a changé de place. Les archives du Bourg conservent peut-être un relevé plus ancien.",
        decider:
          "Le cadastre place la borne ailleurs. Reste à savoir ce que vaut un tracé dont personne ne se souvient. La pierre attend dans le pré.",
      },
      epilogue: "La question du pré est tranchée, du moins pour cette génération.",
    },
  },

  dialogues: {
    passeur: {
      id: 'passeur',
      start: [
        { if: { questNotStarted: 'borne' }, node: 'accueil' },
        { if: { questDone: 'borne' }, node: 'apres' },
        { node: 'attente' },
      ],
      nodes: {
        accueil: {
          speaker: 'Le passeur',
          text: "Vous allez au Bourg ? Alors vous entendrez parler du pré. La borne a bougé cet hiver. Ceux d'amont disent qu'on l'a remise à sa place, ceux d'aval qu'on la leur a volée.",
          choices: [
            { text: 'Et qui dit vrai ?', next: 'vrai' },
            { text: "Pourquoi une barque, si l'on passe à pied ?", next: 'barque' },
            { text: "J'irai voir.", next: 'mission' },
          ],
        },
        vrai: {
          speaker: 'Le passeur',
          text: "Les deux, sans doute. Une frontière n'est vraie que tant que tout le monde la croit au même endroit. Depuis cet hiver, plus personne ne croit la même chose.",
          choices: [
            { text: "Pourquoi une barque, si l'on passe à pied ?", next: 'barque' },
            { text: "J'irai voir.", next: 'mission' },
          ],
        },
        barque: {
          speaker: 'Le passeur',
          text: "On ne me paie pas pour traverser. On me paie pour qu'il y ait quelqu'un qui sache qui a traversé.",
          choices: [
            { text: 'Et qui dit vrai, pour la borne ?', next: 'vrai' },
            { text: "J'irai voir.", next: 'mission' },
          ],
        },
        mission: {
          speaker: 'Le passeur',
          text: "Voyez d'abord les archives. La pierre, elle, ne vous dira rien : elle est là où on l'a mise.",
          effects: [{ questStage: ['borne', 'enquete'] }],
        },
        attente: {
          speaker: 'Le passeur',
          text: "Toujours ce pré ? Prenez votre temps. Il n'a pas bougé, lui.",
        },
        apres: {
          speaker: 'Le passeur',
          text: "On m'a raconté ce que vous avez fait. On me l'a raconté de trois façons, déjà.",
        },
      },
    },

    archiviste: {
      id: 'archiviste',
      start: [
        { if: { questStage: ['borne', 'enquete'] }, node: 'demande' },
        { node: 'silence' },
      ],
      nodes: {
        silence: {
          speaker: "L'archiviste",
          text: "Elle lève les yeux, constate que vous ne cherchez rien de précis, et retourne à son registre.",
        },
        demande: {
          speaker: "L'archiviste",
          text: "Le pré ? J'ai un feuillet. Mais comprenez ce que vous emportez : une carte ne dit pas où passe la limite. Elle dit qui a payé l'arpenteur.",
          choices: [
            { text: "Alors à quoi bon la garder ?", next: 'garder' },
            { text: 'Je le prends.', next: 'don' },
          ],
        },
        garder: {
          speaker: "L'archiviste",
          text: "Pour que ceux qui mentent sachent au moins qu'ils mentent.",
          choices: [{ text: 'Je le prends.', next: 'don' }],
        },
        don: {
          speaker: "L'archiviste",
          text: "Elle détache le feuillet du registre sans un mot, et note quelque chose dans la marge, à la place qu'il occupait.",
          effects: [{ giveItem: 'cadastre' }, { questStage: ['borne', 'decider'] }],
        },
      },
    },

    borne: {
      id: 'borne',
      start: [
        { if: { questStage: ['borne', 'decider'] }, node: 'choix' },
        { if: { questDone: 'borne' }, node: 'apres' },
        { node: 'muette' },
      ],
      nodes: {
        muette: {
          text: "Une pierre grise, sans inscription. Rien ici ne permet de dire où elle devrait être.",
        },
        choix: {
          text: "Le feuillet à la main, vous comptez trente pas vers l'aval. L'herbe y est plus drue, intacte depuis longtemps. Personne ne vous regarde.",
          choices: [
            {
              text: 'Remettre la pierre où le cadastre la place.',
              next: 'remise',
              effects: [{ setFlag: 'borne_remise' }, { completeQuest: 'borne' }],
            },
            {
              text: 'La laisser où elle est, et enterrer le feuillet.',
              next: 'laissee',
              effects: [{ setFlag: 'borne_laissee' }, { takeItem: 'cadastre' }, { completeQuest: 'borne' }],
            },
            { text: "Ne rien décider pour l'instant." },
          ],
        },
        remise: {
          text: "La pierre est plus légère qu'elle n'en a l'air. Demain, ceux d'amont diront qu'on la leur a volée.",
        },
        laissee: {
          text: "La terre se referme sur le papier. Le pré n'a désormais plus d'autre mémoire que celle des gens qui se le disputent.",
        },
        apres: {
          text: "La pierre est là où vous l'avez laissée. Pour l'instant.",
        },
      },
    },
  },
};

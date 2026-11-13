// Petits pictogrammes au trait, dessinés pour le jeu.
const base = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const IconBook = () => (
  <svg {...base} aria-hidden="true">
    <path d="M12 6c-2-1.6-4.6-2-8-2v14c3.4 0 6 .4 8 2 2-1.6 4.6-2 8-2V4c-3.4 0-6 .4-8 2z" />
    <path d="M12 6v14" />
  </svg>
);

export const IconQuill = () => (
  <svg {...base} aria-hidden="true">
    <path d="M20 3c-7 1-12 6-13 14l-2 4" />
    <path d="M20 3c0 6-3 11-9 13H7" />
    <path d="M11 12h5" />
  </svg>
);

export const IconQuest = () => (
  <svg {...base} aria-hidden="true">
    <path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 0 2 2H8a2 2 0 0 1-2-2V4z" />
    <path d="M6 4a2 2 0 0 0-2 2v2h2" />
    <path d="M10 9h5M10 13h5" />
  </svg>
);

export const IconBag = () => (
  <svg {...base} aria-hidden="true">
    <path d="M6 9h12l1.5 9a2 2 0 0 1-2 2.3H6.5a2 2 0 0 1-2-2.3L6 9z" />
    <path d="M9 9V7a3 3 0 0 1 6 0v2" />
    <path d="M10 13h4" />
  </svg>
);

export const IconTree = () => (
  <svg {...base} aria-hidden="true">
    <circle cx="12" cy="5" r="2" />
    <circle cx="6" cy="18" r="2" />
    <circle cx="18" cy="18" r="2" />
    <path d="M12 7v4M12 11l-6 5M12 11l6 5" />
  </svg>
);

export const IconSeal = () => (
  <svg {...base} aria-hidden="true">
    <circle cx="12" cy="9" r="5" />
    <path d="m9 13.5-1.5 6.5 4.5-2.5 4.5 2.5-1.5-6.5" />
  </svg>
);

export const IconClose = () => (
  <svg {...base} aria-hidden="true">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const IconFold = ({ up }: { up: boolean }) => (
  <svg {...base} aria-hidden="true">
    <path d={up ? 'm6 14 6-6 6 6' : 'm6 10 6 6 6-6'} />
  </svg>
);

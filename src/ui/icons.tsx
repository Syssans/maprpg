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

export const IconLayers = () => (
  <svg {...base} aria-hidden="true">
    <path d="M12 3 3 8l9 5 9-5-9-5z" />
    <path d="m3 13 9 5 9-5" />
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

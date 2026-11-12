import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { asset } from '../content';
import type { MapDef } from '../engine/types';

interface Props {
  map: MapDef;
  known: Set<string>;
  current: string;
  reachable: string[];
  selected: string | null;
  /** Couleur du calque actif pour chaque lieu dont la valeur est connue. */
  tint: Record<string, string>;
  /** Lieux portant une annotation du personnage. */
  noted: Set<string>;
  /** Hauteur du panneau qui recouvre le bas de la carte, tenue à jour par l'appelant. */
  inset: { current: number };
  onSelect(placeId: string | null): void;
}

export function MapView({ map, known, current, reachable, selected, tint, noted, inset, onSelect }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const leaflet = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const select = useRef(onSelect);
  select.current = onSelect;

  // Leaflet compte les ordonnées vers le haut, les images vers le bas.
  const at = (x: number, y: number): L.LatLngTuple => [map.height - y, x];

  /** Cadre la position du joueur et les lieux qu'il peut atteindre, au-dessus du panneau. */
  const focus = (animate: boolean) => {
    const m = leaflet.current;
    if (!m) return;
    const points = map.places
      .filter((p) => p.id === current || reachable.includes(p.id))
      .map((p) => at(p.x, p.y));
    if (!points.length) return;
    m.fitBounds(L.latLngBounds(points), {
      paddingTopLeft: [50, 60],
      paddingBottomRight: [50, Math.max(inset.current, Math.round(m.getSize().y * 0.3)) + 40],
      maxZoom: m.getBoundsZoom([[0, 0], [map.height, map.width]], true) + 0.5,
      animate,
    });
  };

  useEffect(() => {
    const bounds = L.latLngBounds([0, 0], [map.height, map.width]);
    const m = L.map(el.current!, {
      crs: L.CRS.Simple,
      minZoom: -5,
      maxZoom: 2,
      zoomSnap: 0.25,
      zoomControl: false,
      attributionControl: false,
      maxBounds: bounds.pad(0.4),
      maxBoundsViscosity: 0.8,
    });
    L.imageOverlay(asset(map.image), bounds).addTo(m);
    m.setMinZoom(m.getBoundsZoom(bounds, false));
    leaflet.current = m;
    focus(false);
    m.on('click', () => select.current(null));
    layer.current = L.layerGroup().addTo(m);
    return () => {
      m.remove();
      leaflet.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map.id]);

  useEffect(() => {
    const group = layer.current;
    if (!group) return;
    group.clearLayers();
    const byId = Object.fromEntries(map.places.map((p) => [p.id, p]));

    for (const r of map.routes) {
      if (!known.has(r.a) || !known.has(r.b) || !byId[r.a] || !byId[r.b]) continue;
      L.polyline([at(byId[r.a].x, byId[r.a].y), at(byId[r.b].x, byId[r.b].y)], {
        className: 'route',
        interactive: false,
      }).addTo(group);
    }

    for (const p of map.places) {
      if (!known.has(p.id)) continue;
      const classes = [
        'place',
        p.id === current && 'is-current',
        p.id === selected && 'is-selected',
        reachable.includes(p.id) && 'is-reachable',
        p.enters && 'is-gate',
        tint[p.id] && 'is-tinted',
        noted.has(p.id) && 'is-noted',
      ]
        .filter(Boolean)
        .join(' ');
      const root = document.createElement('div');
      root.className = classes;
      const dot = document.createElement('i');
      if (tint[p.id]) dot.style.setProperty('--tint', tint[p.id]);
      const label = document.createElement('span');
      const labelled = !map.printedLabels || p.id === current || p.id === selected || reachable.includes(p.id);
      if (labelled) label.textContent = p.name;
      root.append(dot, label);
      L.marker(at(p.x, p.y), { icon: L.divIcon({ className: '', iconSize: [0, 0], html: root.outerHTML }) })
        .on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          select.current(p.id);
        })
        .addTo(group);
    }
  }, [map, known, current, reachable, selected, tint, noted]);

  useEffect(() => {
    focus(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  return <div ref={el} className="map" />;
}

import L from 'leaflet';
import { useEffect, useRef } from 'react';
import type { MapDef } from '../engine/types';

interface Props {
  map: MapDef;
  known: Set<string>;
  current: string;
  reachable: string[];
  selected: string | null;
  onSelect(placeId: string | null): void;
}

export function MapView({ map, known, current, reachable, selected, onSelect }: Props) {
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
    const h = m.getSize().y;
    m.fitBounds(L.latLngBounds(points), {
      paddingTopLeft: [50, 50],
      paddingBottomRight: [50, Math.round(h * 0.4)],
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
    L.imageOverlay(map.image, bounds).addTo(m);
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

    for (const [a, b] of map.routes) {
      if (!known.has(a) || !known.has(b)) continue;
      L.polyline([at(byId[a].x, byId[a].y), at(byId[b].x, byId[b].y)], {
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
      ]
        .filter(Boolean)
        .join(' ');
      const label = document.createElement('span');
      label.textContent = p.name;
      const icon = L.divIcon({
        className: '',
        iconSize: [0, 0],
        html: `<div class="${classes}"><i></i>${label.outerHTML}</div>`,
      });
      L.marker(at(p.x, p.y), { icon })
        .on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          select.current(p.id);
        })
        .addTo(group);
    }
  }, [map, known, current, reachable, selected]);

  useEffect(() => {
    focus(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  return <div ref={el} className="map" />;
}

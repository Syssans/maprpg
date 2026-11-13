import L from 'leaflet';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { asset } from '../content';
import type { MapDef, Note } from '../engine/types';

export interface MapHandle {
  /** Point de la carte au milieu de la partie visible, en coordonnées de l'image. */
  center(): { x: number; y: number };
}

interface Props {
  map: MapDef;
  known: Set<string>;
  current: string;
  reachable: string[];
  selected: string | null;
  /** Lieux portant une annotation du personnage. */
  noted: Set<string>;
  /** Hauteur du panneau qui recouvre le bas de la carte, tenue à jour par l'appelant. */
  inset: { current: number };
  notes: Note[];
  onMoveNote(id: string, x: number, y: number): void;
  onOpenNote(id: string): void;
  onSelect(placeId: string | null): void;
}

export const MapView = forwardRef<MapHandle, Props>(function MapView(
  { map, known, current, reachable, selected, noted, inset, notes, onMoveNote, onOpenNote, onSelect },
  handle,
) {
  const el = useRef<HTMLDivElement>(null);
  const leaflet = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const pins = useRef<L.LayerGroup | null>(null);
  const select = useRef(onSelect);
  select.current = onSelect;
  const note = useRef({ onMoveNote, onOpenNote });
  note.current = { onMoveNote, onOpenNote };

  useImperativeHandle(handle, () => ({
    center() {
      const m = leaflet.current;
      if (!m) return { x: map.width / 2, y: map.height / 2 };
      const size = m.getSize();
      const c = m.containerPointToLatLng([size.x / 2, (size.y - inset.current) / 2]);
      return {
        x: Math.round(Math.min(map.width, Math.max(0, c.lng))),
        y: Math.round(Math.min(map.height, Math.max(0, map.height - c.lat))),
      };
    },
  }));

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
    pins.current = L.layerGroup().addTo(m);
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
        noted.has(p.id) && 'is-noted',
      ]
        .filter(Boolean)
        .join(' ');
      const root = document.createElement('div');
      root.className = classes;
      const dot = document.createElement('i');
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
  }, [map, known, current, reachable, selected, noted]);

  // Notes du joueur : des étiquettes que l'on déplace en les faisant glisser.
  useEffect(() => {
    const group = pins.current;
    if (!group) return;
    group.clearLayers();
    for (const n of notes) {
      if (n.map !== map.id) continue;
      const tag = document.createElement('div');
      tag.className = 'pin';
      tag.textContent = n.text.trim() ? n.text.trim().slice(0, 28) + (n.text.trim().length > 28 ? '…' : '') : 'Note';
      L.marker(at(n.x, n.y), {
        icon: L.divIcon({ className: '', iconSize: [0, 0], html: tag.outerHTML }),
        draggable: true,
        zIndexOffset: 1000,
      })
        .on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          note.current.onOpenNote(n.id);
        })
        .on('dragend', (e) => {
          const p = (e.target as L.Marker).getLatLng();
          note.current.onMoveNote(
            n.id,
            Math.round(Math.min(map.width, Math.max(0, p.lng))),
            Math.round(Math.min(map.height, Math.max(0, map.height - p.lat))),
          );
        })
        .addTo(group);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, map.id]);

  useEffect(() => {
    focus(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  return <div ref={el} className="map" />;
});

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { TYPE_COLORS } from './WorldMap.jsx';

const MIN_KM = 40;
const MAX_KM = 130;

function renewableScore(pin) {
  const s = pin.sparklines?.renewable;
  return s && s.length ? s[s.length - 1] : 6.5;
}

function radiusKm(pin) {
  const score = renewableScore(pin);
  return MIN_KM + ((score / 10) * (MAX_KM - MIN_KM));
}

export default function BubbleLayer({ pins, visible }) {
  const map = useMap();
  const groupRef = useRef(null);

  useEffect(() => {
    if (groupRef.current) { groupRef.current.remove(); groupRef.current = null; }
    if (!pins || pins.length === 0) return;

    const layers = pins.map((pin) => {
      const color = TYPE_COLORS[pin.type] || TYPE_COLORS.general;
      const r = radiusKm(pin);
      return L.circle([pin.lat, pin.lon], {
        radius: r * 1000,
        fillColor: color,
        fillOpacity: 0.18,
        color,
        weight: 1.5,
        opacity: 0.55,
        interactive: false,
        pane: 'overlayPane',
      });
    });

    const group = L.layerGroup(layers);
    groupRef.current = group;
    if (visible) group.addTo(map);

    return () => { group.remove(); groupRef.current = null; };
  }, [map, pins]);

  useEffect(() => {
    if (!groupRef.current) return;
    if (visible) groupRef.current.addTo(map);
    else groupRef.current.remove();
  }, [visible, map]);

  return null;
}

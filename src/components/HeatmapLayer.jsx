import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

// Each pin gets concentric L.circle zones (radius in metres = zoom-stable)
const RINGS = [
  { radiusKm: 30,  fillColor: '#16a34a', opacity: 0.30 },
  { radiusKm: 75,  fillColor: '#86efac', opacity: 0.18 },
  { radiusKm: 140, fillColor: '#facc15', opacity: 0.11 },
  { radiusKm: 230, fillColor: '#f97316', opacity: 0.06 },
];

// Pins that mention a risk score slightly lower
function pinWeight(pin) {
  return pin.risk ? 0.80 : 1.0;
}

export default function GeoHeatLayer({ pins, visible, mode }) {
  const map = useMap();
  const groupRef = useRef(null);

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.remove();
      groupRef.current = null;
    }
    if (!pins || pins.length === 0) return;

    const layers = pins.flatMap((pin) => {
      const w = pinWeight(pin);
      return RINGS.map(({ radiusKm, fillColor, opacity }) => {
        // In risk mode flip the gradient (red inner, green outer)
        const color = mode === 'risk'
          ? ['#dc2626', '#f97316', '#facc15', '#86efac'][RINGS.indexOf(RINGS.find(r => r.radiusKm === radiusKm))]
          : fillColor;
        return L.circle([pin.lat, pin.lon], {
          radius: radiusKm * 1000,
          fillColor: color,
          fillOpacity: opacity * w,
          color: 'none',
          interactive: false,
          pane: 'overlayPane',
        });
      });
    });

    const group = L.layerGroup(layers);
    groupRef.current = group;
    if (visible) group.addTo(map);

    return () => {
      group.remove();
      groupRef.current = null;
    };
  }, [map, pins, mode]);

  // Show/hide without rebuilding layers
  useEffect(() => {
    if (!groupRef.current) return;
    if (visible) groupRef.current.addTo(map);
    else groupRef.current.remove();
  }, [visible, map]);

  return null;
}

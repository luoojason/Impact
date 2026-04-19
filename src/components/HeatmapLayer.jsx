import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { TYPE_COLORS } from './WorldMap.jsx';

const RINGS = [
  { radiusKm: 35,  opacityBase: 0.42 },
  { radiusKm: 85,  opacityBase: 0.20 },
  { radiusKm: 160, opacityBase: 0.09 },
];

function renewableIntensity(pin) {
  const sparks = pin.sparklines?.renewable;
  if (!sparks || sparks.length === 0) return 0.65;
  return Math.min(1, sparks[sparks.length - 1] / 10);
}

export default function GeoHeatLayer({ pins, visible }) {
  const map = useMap();
  const groupRef = useRef(null);

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.remove();
      groupRef.current = null;
    }
    if (!pins || pins.length === 0) return;

    const color = (pin) => TYPE_COLORS[pin.type] || TYPE_COLORS.general;

    const layers = pins.flatMap((pin) => {
      const intensity = renewableIntensity(pin);
      return RINGS.map(({ radiusKm, opacityBase }) =>
        L.circle([pin.lat, pin.lon], {
          radius: radiusKm * 1000 * (0.6 + 0.4 * intensity),
          fillColor: color(pin),
          fillOpacity: opacityBase * intensity,
          color: 'none',
          interactive: false,
          pane: 'overlayPane',
        })
      );
    });

    const group = L.layerGroup(layers);
    groupRef.current = group;
    if (visible) group.addTo(map);

    return () => {
      group.remove();
      groupRef.current = null;
    };
  }, [map, pins]);

  useEffect(() => {
    if (!groupRef.current) return;
    if (visible) groupRef.current.addTo(map);
    else groupRef.current.remove();
  }, [visible, map]);

  return null;
}

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import simpleheat from 'simpleheat';
import { TYPE_COLORS } from './WorldMap.jsx';

function renewableIntensity(pin) {
  const sparks = pin.sparklines?.renewable;
  if (!sparks || sparks.length === 0) return 0.65;
  return Math.min(1, sparks[sparks.length - 1] / 10);
}

// Build a gradient from transparent → type color
function typeGradient(hex) {
  return {
    0.0: 'rgba(0,0,0,0)',
    0.3: hex + '55',
    0.6: hex + 'aa',
    1.0: hex,
  };
}

export default function GeoHeatLayer({ pins, visible }) {
  const map = useMap();
  const layersRef = useRef([]); // [{ canvas, heat, typePins }]

  useEffect(() => {
    // Cleanup
    layersRef.current.forEach(({ canvas }) => canvas.remove());
    layersRef.current = [];

    if (!pins || pins.length === 0) return;

    // Group pins by energy type
    const byType = {};
    pins.forEach((pin) => {
      const t = pin.type || 'general';
      (byType[t] = byType[t] || []).push(pin);
    });

    const overlayPane = map.getPanes().overlayPane;
    const size = map.getSize();

    layersRef.current = Object.entries(byType).map(([type, typePins]) => {
      const canvas = document.createElement('canvas');
      canvas.width = size.x;
      canvas.height = size.y;
      canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;';
      overlayPane.appendChild(canvas);

      const heat = simpleheat(canvas);
      const color = TYPE_COLORS[type] || TYPE_COLORS.general;
      heat.gradient(typeGradient(color));
      heat.radius(80, 50);

      return { canvas, heat, typePins };
    });

    function redraw() {
      const s = map.getSize();
      const pos = map.containerPointToLayerPoint([0, 0]);

      layersRef.current.forEach(({ canvas, heat, typePins }) => {
        if (canvas.width !== s.x) canvas.width = s.x;
        if (canvas.height !== s.y) canvas.height = s.y;
        canvas.style.transform = `translate(${pos.x}px,${pos.y}px)`;

        const points = typePins.map((pin) => {
          const pt = map.latLngToContainerPoint([pin.lat, pin.lon]);
          return [pt.x, pt.y, renewableIntensity(pin)];
        });

        heat.data(points).max(1).draw(0.06);
      });
    }

    redraw();
    map.on('moveend zoomend resize', redraw);

    return () => {
      map.off('moveend zoomend resize', redraw);
      layersRef.current.forEach(({ canvas }) => canvas.remove());
      layersRef.current = [];
    };
  }, [map, pins]);

  // Toggle visibility without rebuilding
  useEffect(() => {
    layersRef.current.forEach(({ canvas }) => {
      canvas.style.display = visible ? '' : 'none';
    });
  }, [visible]);

  return null;
}

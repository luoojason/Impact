import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const PALETTES = {
  solar: [
    [0.00, [15,  23,  42,   0]],
    [0.15, [139, 92,  43,  90]],
    [0.35, [234, 88,  12, 140]],
    [0.60, [249, 168, 37, 170]],
    [0.85, [250, 204, 21, 190]],
    [1.00, [254, 240,138, 210]],
  ],
  wind: [
    [0.00, [15,  23,  42,   0]],
    [0.20, [30,  58, 138, 100]],
    [0.45, [37, 99,  235, 150]],
    [0.70, [14, 165, 233, 180]],
    [0.90, [165,243, 252, 200]],
    [1.00, [236,254, 255, 220]],
  ],
};

function sampleColor(palette, t) {
  for (let i = 1; i < palette.length; i++) {
    const [tEnd, c1] = palette[i];
    if (t <= tEnd) {
      const [tStart, c0] = palette[i - 1];
      const k = (t - tStart) / (tEnd - tStart || 1);
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * k),
        Math.round(c0[1] + (c1[1] - c0[1]) * k),
        Math.round(c0[2] + (c1[2] - c0[2]) * k),
        Math.round(c0[3] + (c1[3] - c0[3]) * k),
      ];
    }
  }
  return palette[palette.length - 1][1];
}

// Custom canvas tile layer that paints from a fixed lat/lon grid.
// Each source cell is 0.5° × 0.5° (W × H). We paint directly onto each tile
// in EPSG:3857, so zooming stays crisp (Leaflet retiles at every zoom level).
function buildGridTileLayer({ grid, palette }) {
  const { width: W, height: H, resolution: RES, cells, min, max, p1, p99 } = grid;
  const range = max - min || 1;
  // Stretch the palette across [p1, p99] so outliers don't crush the midtones dark.
  const displayLo = Number.isFinite(p1) ? p1 : min;
  const displayHi = Number.isFinite(p99) ? p99 : max;
  const displayRange = displayHi - displayLo || 1;

  // Reconstruct a dense Float32 buffer from sparse [x, y, q] (q is 0..1000).
  const values = new Float32Array(W * H);
  values.fill(NaN);
  for (let i = 0; i < cells.length; i++) {
    const [x, y, q] = cells[i];
    values[y * W + x] = min + (q / 1000) * range;
  }

  const TileLayer = L.GridLayer.extend({
    createTile(coords, done) {
      const tile = document.createElement('canvas');
      const size = this.getTileSize();
      tile.width = size.x;
      tile.height = size.y;
      const ctx = tile.getContext('2d');
      const img = ctx.createImageData(size.x, size.y);
      const data = img.data;

      const z = coords.z;
      const nwPoint = coords.scaleBy(size);
      const nw = this._map.unproject(nwPoint, z);
      const se = this._map.unproject(nwPoint.add(size), z);
      const lonLeft = nw.lng;
      const lonRight = se.lng;

      // Lat is nonlinear in pixel-y under Web Mercator — unproject each row once.
      const rowLats = new Float32Array(size.y);
      for (let py = 0; py < size.y; py++) {
        rowLats[py] = this._map.unproject(L.point(nwPoint.x, nwPoint.y + py), z).lat;
      }

      for (let py = 0; py < size.y; py++) {
        const lat = rowLats[py];
        // Source row: y=0 at lat=+90
        const sy = Math.floor((90 - lat) / RES);
        if (sy < 0 || sy >= H) continue;

        for (let px = 0; px < size.x; px++) {
          const lon = lonLeft + (px / size.x) * (lonRight - lonLeft);
          // Wrap lon to [-180, 180)
          const normLon = ((lon + 180) % 360 + 360) % 360 - 180;
          const sx = Math.floor((normLon + 180) / RES);
          if (sx < 0 || sx >= W) continue;

          const v = values[sy * W + sx];
          if (!Number.isFinite(v)) continue;

          const t = (v - displayLo) / displayRange;
          const [r, g, b, a] = sampleColor(palette, Math.max(0, Math.min(1, t)));
          const idx = (py * size.x + px) * 4;
          data[idx]     = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = a;
        }
      }

      ctx.putImageData(img, 0, 0);
      setTimeout(() => done(null, tile), 0);
      return tile;
    },
  });

  return new TileLayer({ opacity: 1, tileSize: 256, pane: 'overlayPane', zIndex: 250 });
}

export default function DataGridLayer({ type, visible }) {
  const map = useMap();
  const layerRef = useRef(null);
  const [grid, setGrid] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setErr(null);
    setGrid(null);
    fetch(`/data/${type}-grid.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => { if (!cancelled) setGrid(j); })
      .catch((e) => { if (!cancelled) setErr(e.message); });
    return () => { cancelled = true; };
  }, [type]);

  useEffect(() => {
    if (layerRef.current) { layerRef.current.remove(); layerRef.current = null; }
    if (!grid) return;
    const palette = PALETTES[type] || PALETTES.solar;
    const layer = buildGridTileLayer({ grid, palette });
    layerRef.current = layer;
    if (visible) layer.addTo(map);
    return () => { layer.remove(); layerRef.current = null; };
  }, [map, grid, type]);

  useEffect(() => {
    if (!layerRef.current) return;
    if (visible) layerRef.current.addTo(map);
    else layerRef.current.remove();
  }, [visible, map]);

  if (err) console.warn(`[DataGridLayer] ${type}:`, err);
  return null;
}

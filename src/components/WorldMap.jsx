import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { useMap } from 'react-leaflet';
import { findFeature, bboxOfFeature } from '../lib/countryUtils.js';
import styles from './WorldMap.module.css';
import 'leaflet/dist/leaflet.css';

function FitBoundsLayer({ geojson, targetIso3 }) {
  const map = useMap();

  useEffect(() => {
    if (!geojson || !targetIso3 || targetIso3.size === 0) return;
    const allCoords = [];
    for (const iso3 of targetIso3) {
      const feature = findFeature(geojson, iso3);
      if (!feature) continue;
      const bbox = bboxOfFeature(feature);
      if (bbox) {
        allCoords.push(bbox[0], bbox[1]);
      }
    }
    if (allCoords.length < 2) return;
    const lats = allCoords.map((c) => c[0]);
    const lngs = allCoords.map((c) => c[1]);
    const bounds = [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ];
    map.fitBounds(bounds, { padding: [20, 20] });
  }, [geojson, targetIso3]);

  return null;
}

export default function WorldMap({ targetIso3 }) {
  const [geojson, setGeojson] = useState(null);

  useEffect(() => {
    fetch('/countries.geo.json')
      .then((r) => r.json())
      .then(setGeojson)
      .catch(() => {});
  }, []);

  function styleFeature(feature) {
    const p = feature.properties || {};
    const iso = p.ISO_A3 || p.ISO_A3_EH || p.ADM0_A3;
    const isTarget = targetIso3 && iso && targetIso3.has(iso);
    return {
      fillColor: isTarget ? '#39ff14' : '#1a1a1a',
      fillOpacity: 0.6,
      color: '#333',
      weight: 0.5,
    };
  }

  return (
    <div className={styles.mapWrapper}>
      <MapContainer
        className={styles.map}
        center={[20, 0]}
        zoom={2}
        worldCopyJump
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        {geojson && (
          <>
            <GeoJSON data={geojson} style={styleFeature} />
            <FitBoundsLayer geojson={geojson} targetIso3={targetIso3} />
          </>
        )}
      </MapContainer>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from 'react-leaflet';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { findFeature, bboxOfFeature } from '../lib/countryUtils.js';
import styles from './WorldMap.module.css';
import 'leaflet/dist/leaflet.css';

const TYPE_COLORS = {
  solar: '#ffcc00',
  wind: '#60cfff',
  hydro: '#4af',
  geothermal: '#ff6b35',
  storage: '#b57bee',
  transmission: '#aaa',
  general: '#39ff14',
};

const TYPE_ICONS = {
  solar: '☀',
  wind: '💨',
  hydro: '💧',
  geothermal: '🌋',
  storage: '🔋',
  transmission: '⚡',
  general: '📍',
};

function makePinIcon(type) {
  const color = TYPE_COLORS[type] || TYPE_COLORS.general;
  const icon = TYPE_ICONS[type] || '📍';
  return L.divIcon({
    className: '',
    html: `<div style="
      width:36px;height:36px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      background:${color};
      border:2px solid rgba(255,255,255,0.3);
      box-shadow:0 2px 12px rgba(0,0,0,0.5),0 0 0 3px rgba(255,255,255,0.1);
      display:flex;align-items:center;justify-content:center;
    "><span style="transform:rotate(45deg);font-size:15px;line-height:1">${icon}</span></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -38],
  });
}

function FitBoundsLayer({ geojson, targetIso3 }) {
  const map = useMap();
  useEffect(() => {
    if (!geojson || !targetIso3 || targetIso3.size === 0) return;
    const allCoords = [];
    for (const iso3 of targetIso3) {
      const feature = findFeature(geojson, iso3);
      if (!feature) continue;
      const bbox = bboxOfFeature(feature);
      if (bbox) allCoords.push(bbox[0], bbox[1]);
    }
    if (allCoords.length < 2) return;
    const lats = allCoords.map((c) => c[0]);
    const lngs = allCoords.map((c) => c[1]);
    map.fitBounds([
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ], { padding: [40, 40] });
  }, [geojson, targetIso3]);
  return null;
}

export default function WorldMap({ targetIso3, pins = [] }) {
  const [geojson, setGeojson] = useState(null);

  useEffect(() => {
    fetch('/countries.geo.json').then((r) => r.json()).then(setGeojson).catch(() => {});
  }, []);

  function styleFeature(feature) {
    const p = feature.properties || {};
    const iso = p.ISO_A3 || p.ISO_A3_EH || p.ADM0_A3;
    const isTarget = targetIso3 && iso && targetIso3.has(iso);
    return {
      fillColor: isTarget ? '#39ff14' : '#111711',
      fillOpacity: isTarget ? 0.25 : 0.6,
      color: isTarget ? '#39ff14' : '#1e2a1e',
      weight: isTarget ? 1.5 : 0.5,
    };
  }

  return (
    <div className={styles.mapWrapper}>
      <MapContainer
        className={styles.map}
        center={[15, 20]}
        zoom={3}
        worldCopyJump
        zoomControl={true}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        {geojson && (
          <>
            <GeoJSON data={geojson} style={styleFeature} />
            <FitBoundsLayer geojson={geojson} targetIso3={targetIso3} />
          </>
        )}
        {pins.map((pin, i) => (
          <Marker key={i} position={[pin.lat, pin.lon]} icon={makePinIcon(pin.type || 'general')}>
            <Popup minWidth={280} maxWidth={340}>
              <div style={{ padding: '14px 16px', fontFamily: "'DM Mono', monospace" }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '10px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    background: `${TYPE_COLORS[pin.type] || TYPE_COLORS.general}22`,
                    color: TYPE_COLORS[pin.type] || TYPE_COLORS.general,
                    border: `1px solid ${TYPE_COLORS[pin.type] || TYPE_COLORS.general}44`,
                  }}>{pin.type || 'general'}</span>
                </div>
                <div style={{ fontSize: '14px', fontFamily: "'Syne', sans-serif", fontWeight: '700', color: '#e2ece2', marginBottom: '8px', lineHeight: '1.3' }}>{pin.name}</div>
                <p style={{ fontSize: '11px', color: '#b8d0b8', lineHeight: '1.6', marginBottom: pin.risk ? '10px' : '0' }}>{pin.opportunity}</p>
                {pin.risk && (
                  <div style={{ fontSize: '10px', color: '#ff9955', lineHeight: '1.5', padding: '6px 8px', background: 'rgba(255,100,50,0.08)', borderRadius: '4px', borderLeft: '2px solid rgba(255,100,50,0.4)' }}>
                    ⚠ {pin.risk}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

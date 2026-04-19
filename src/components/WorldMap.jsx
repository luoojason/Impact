import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from 'react-leaflet';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { findFeature, bboxOfFeature } from '../lib/countryUtils.js';
import styles from './WorldMap.module.css';
import 'leaflet/dist/leaflet.css';

const TYPE_COLORS = {
  solar:        '#f59e0b',
  wind:         '#3b82f6',
  hydro:        '#0ea5e9',
  geothermal:   '#ef4444',
  storage:      '#8b5cf6',
  transmission: '#6b7280',
  general:      '#2563eb',
};

const TYPE_LABELS = {
  solar: 'Solar', wind: 'Wind', hydro: 'Hydro',
  geothermal: 'Geothermal', storage: 'Storage',
  transmission: 'Transmission', general: 'General',
};

function makePinIcon(type) {
  const color = TYPE_COLORS[type] || TYPE_COLORS.general;
  return L.divIcon({
    className: '',
    html: `<svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.37 0 0 5.37 0 12C0 21 12 32 12 32C12 32 24 21 24 12C24 5.37 18.63 0 12 0Z" fill="${color}"/>
      <circle cx="12" cy="12" r="5" fill="white"/>
    </svg>`,
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -34],
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
    map.fitBounds(
      [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]],
      { padding: [48, 48] }
    );
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
      fillColor: isTarget ? '#2563eb' : 'transparent',
      fillOpacity: isTarget ? 0.18 : 0,
      color: isTarget ? '#1d4ed8' : '#c8d0da',
      weight: isTarget ? 2 : 0.5,
    };
  }

  return (
    <div className={styles.mapWrapper}>
      <MapContainer
        className={styles.map}
        center={[20, 10]}
        zoom={3}
        worldCopyJump
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
        />
        {geojson && (
          <>
            <GeoJSON key={JSON.stringify([...targetIso3])} data={geojson} style={styleFeature} />
            <FitBoundsLayer geojson={geojson} targetIso3={targetIso3} />
          </>
        )}
        {pins.map((pin, i) => (
          <Marker key={i} position={[pin.lat, pin.lon]} icon={makePinIcon(pin.type || 'general')}>
            <Popup minWidth={260} maxWidth={320}>
              <div style={{ padding: '14px 16px', fontFamily: 'Inter, sans-serif' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '2px 8px',
                  borderRadius: '3px',
                  fontSize: '10px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '8px',
                  background: `${TYPE_COLORS[pin.type] || TYPE_COLORS.general}15`,
                  color: TYPE_COLORS[pin.type] || TYPE_COLORS.general,
                  border: `1px solid ${TYPE_COLORS[pin.type] || TYPE_COLORS.general}30`,
                }}>
                  {TYPE_LABELS[pin.type] || pin.type || 'General'}
                </div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '6px',
                  lineHeight: '1.35',
                }}>{pin.name}</div>
                <p style={{
                  fontSize: '12px',
                  color: '#4b5563',
                  lineHeight: '1.6',
                  marginBottom: pin.risk ? '10px' : 0,
                }}>{pin.opportunity}</p>
                {pin.risk && (
                  <div style={{
                    fontSize: '11px',
                    color: '#92400e',
                    lineHeight: '1.5',
                    padding: '6px 10px',
                    background: '#fef3c7',
                    border: '1px solid #fde68a',
                    borderRadius: '4px',
                  }}>
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

export { TYPE_COLORS, TYPE_LABELS };

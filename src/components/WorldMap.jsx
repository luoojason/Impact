import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from 'react-leaflet';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { findFeature, bboxOfFeature } from '../lib/countryUtils.js';
import styles from './WorldMap.module.css';
import 'leaflet/dist/leaflet.css';

const TYPE_COLORS = {
  solar:        '#d97706',
  wind:         '#2563eb',
  hydro:        '#0284c7',
  geothermal:   '#dc2626',
  storage:      '#7c3aed',
  transmission: '#64748b',
  general:      '#0a7a6a',
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
    html: `<svg width="26" height="34" viewBox="0 0 26 34" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 0C5.82 0 0 5.82 0 13C0 22.75 13 34 13 34C13 34 26 22.75 26 13C26 5.82 20.18 0 13 0Z" fill="${color}" fill-opacity="0.92"/>
      <circle cx="13" cy="13" r="5.5" fill="white" fill-opacity="0.95"/>
    </svg>`,
    iconSize: [26, 34],
    iconAnchor: [13, 34],
    popupAnchor: [0, -36],
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
      fillColor: isTarget ? '#0a7a6a' : '#0d1520',
      fillOpacity: isTarget ? 0.32 : 0.55,
      color: isTarget ? '#0a7a6a' : '#1a2840',
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
            <Popup minWidth={240} maxWidth={320}>
              <div style={{
                padding: '16px 18px',
                fontFamily: "'Albert Sans', sans-serif",
              }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '10px',
                  background: `${TYPE_COLORS[pin.type] || TYPE_COLORS.general}18`,
                  color: TYPE_COLORS[pin.type] || TYPE_COLORS.general,
                }}>
                  <span style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: TYPE_COLORS[pin.type] || TYPE_COLORS.general,
                    flexShrink: 0,
                  }} />
                  {TYPE_LABELS[pin.type] || pin.type || 'General'}
                </div>
                <div style={{
                  fontFamily: "'Spectral', serif",
                  fontSize: '15px',
                  fontWeight: '600',
                  color: '#191e2d',
                  marginBottom: '8px',
                  lineHeight: '1.3',
                }}>{pin.name}</div>
                <p style={{
                  fontSize: '12.5px',
                  color: '#58627a',
                  lineHeight: '1.65',
                  marginBottom: pin.risk ? '10px' : '0',
                }}>{pin.opportunity}</p>
                {pin.risk && (
                  <div style={{
                    fontSize: '11px',
                    color: '#a85510',
                    lineHeight: '1.55',
                    padding: '7px 10px',
                    background: '#fff8ed',
                    borderRadius: '5px',
                    marginTop: '2px',
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

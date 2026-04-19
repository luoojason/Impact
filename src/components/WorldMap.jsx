import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { findFeature, bboxOfFeature } from '../lib/countryUtils.js';
import GeoHeatLayer from './HeatmapLayer.jsx';
import SparkLine from './SparkLine.jsx';
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

const OPPORTUNITY_LEGEND = [
  { label: 'High suitability', color: '#16a34a' },
  { label: 'Moderate',         color: '#facc15' },
  { label: 'Lower suitability',color: '#f97316' },
];

const RISK_LEGEND = [
  { label: 'Higher risk',  color: '#dc2626' },
  { label: 'Moderate',     color: '#facc15' },
  { label: 'Lower risk',   color: '#86efac' },
];

function makePinIcon(type, dimmed) {
  const color = TYPE_COLORS[type] || TYPE_COLORS.general;
  const opacity = dimmed ? 0.25 : 1;
  return L.divIcon({
    className: '',
    html: `<svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity:${opacity}">
      <path d="M12 0C5.37 0 0 5.37 0 12C0 21 12 32 12 32C12 32 24 21 24 12C24 5.37 18.63 0 12 0Z" fill="${color}"/>
      <circle cx="12" cy="12" r="5" fill="white"/>
    </svg>`,
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -34],
  });
}

function MapController({ pins, markerRefs, mapControlRef }) {
  const map = useMap();
  useEffect(() => {
    if (!mapControlRef) return;
    mapControlRef.current = {
      flyToPin: (pin) => {
        map.flyTo([pin.lat, pin.lon], 9, { duration: 1.2 });
        const idx = pins.findIndex(p => p.name === pin.name);
        setTimeout(() => markerRefs.current[idx]?.openPopup(), 1350);
      },
    };
  }, [map, pins]);
  return null;
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

export default function WorldMap({
  targetIso3,
  pins = [],
  showHeatmap: initialHeatmap = false,
  onPinClick,        // (pin) => void — called when a pin is clicked
  onCompareToggle,   // (idx) => void — called when compare checkbox toggled
  compareSet = new Set(), // Set of pin indices currently being compared
  mapControlRef,     // ref to expose flyToPin
}) {
  const [geojson, setGeojson]           = useState(null);
  const [heatVisible, setHeatVisible]   = useState(initialHeatmap);
  const [heatMode, setHeatMode]         = useState('opportunity'); // 'opportunity' | 'risk'
  const [panelOpen, setPanelOpen]       = useState(false);
  const [activeTypes, setActiveTypes]   = useState(() => new Set(Object.keys(TYPE_COLORS)));
  const markerRefs                      = useRef({});

  useEffect(() => {
    fetch('/countries.geo.json').then((r) => r.json()).then(setGeojson).catch(() => {});
  }, []);

  useEffect(() => {
    if (pins.length > 0) setHeatVisible(true);
  }, [pins.length]);

  // Update activeTypes when new pin types appear
  useEffect(() => {
    const incoming = pins.map((p) => p.type || 'general');
    setActiveTypes((prev) => {
      const next = new Set(prev);
      incoming.forEach((t) => next.add(t));
      return next;
    });
  }, [pins]);

  function styleFeature(feature) {
    const p = feature.properties || {};
    const iso = p.ISO_A3 || p.ISO_A3_EH || p.ADM0_A3;
    const isTarget = targetIso3 && iso && targetIso3.has(iso);
    return {
      fillColor:   isTarget ? '#2563eb' : 'transparent',
      fillOpacity: isTarget ? 0.10 : 0,
      color:       isTarget ? '#1d4ed8' : '#c8d0da',
      weight:      isTarget ? 2 : 0.5,
    };
  }

  function toggleType(type) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) { if (next.size > 1) next.delete(type); }
      else next.add(type);
      return next;
    });
  }

  const pinTypes = [...new Set(pins.map((p) => p.type || 'general'))];
  const visiblePins = pins.filter((p) => activeTypes.has(p.type || 'general'));
  const legend = heatMode === 'risk' ? RISK_LEGEND : OPPORTUNITY_LEGEND;

  return (
    <div className={styles.mapWrapper}>
      <MapContainer className={styles.map} center={[20, 10]} zoom={3} worldCopyJump zoomControl={true}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
        />
        {geojson && (
          <>
            <GeoJSON key={JSON.stringify([...targetIso3])} data={geojson} style={styleFeature} />
            <FitBoundsLayer geojson={geojson} targetIso3={targetIso3} />
          </>
        )}
        {heatVisible && visiblePins.length > 0 && (
          <GeoHeatLayer pins={visiblePins} visible={heatVisible} mode={heatMode} />
        )}
        <MapController pins={pins} markerRefs={markerRefs} mapControlRef={mapControlRef} />
        {pins.map((pin, i) => {
          const type = pin.type || 'general';
          const dimmed = !activeTypes.has(type);
          return (
            <Marker
              key={i}
              position={[pin.lat, pin.lon]}
              icon={makePinIcon(type, dimmed)}
              eventHandlers={{ click: () => onPinClick?.(pin) }}
              ref={(el) => { if (el) markerRefs.current[i] = el; }}
            >
              <Popup minWidth={260} maxWidth={320}>
                <div style={{ padding: '14px 16px', fontFamily: 'Inter, sans-serif' }}>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    padding: '2px 8px', borderRadius: '3px', fontSize: '10px',
                    fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em',
                    marginBottom: '8px',
                    background: `${TYPE_COLORS[type] || TYPE_COLORS.general}15`,
                    color: TYPE_COLORS[type] || TYPE_COLORS.general,
                    border: `1px solid ${TYPE_COLORS[type] || TYPE_COLORS.general}30`,
                  }}>
                    {TYPE_LABELS[type] || type}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '6px', lineHeight: '1.35' }}>
                    {pin.name}
                  </div>
                  <p style={{ fontSize: '12px', color: '#4b5563', lineHeight: '1.6', marginBottom: pin.risk ? '10px' : 0 }}>
                    {pin.opportunity}
                  </p>
                  {pin.risk && (
                    <div style={{ fontSize: '11px', color: '#92400e', lineHeight: '1.5', padding: '6px 10px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '4px' }}>
                      ⚠ {pin.risk}
                    </div>
                  )}
                  {pin.sparklines && (
                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {pin.sparklines.conflict && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'Inter,sans-serif', fontSize: '10px', color: '#9ca3af', width: '72px' }}>Conflict</span>
                          <SparkLine data={pin.sparklines.conflict} color="#ef4444" />
                        </div>
                      )}
                      {pin.sparklines.deforestation && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'Inter,sans-serif', fontSize: '10px', color: '#9ca3af', width: '72px' }}>Deforestation</span>
                          <SparkLine data={pin.sparklines.deforestation} color="#f97316" />
                        </div>
                      )}
                      {pin.sparklines.renewable && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'Inter,sans-serif', fontSize: '10px', color: '#9ca3af', width: '72px' }}>Renewable</span>
                          <SparkLine data={pin.sparklines.renewable} color="#16a34a" />
                        </div>
                      )}
                    </div>
                  )}
                  {onPinClick && (
                    <button
                      onClick={() => onPinClick(pin)}
                      style={{
                        marginTop: '10px', width: '100%', padding: '5px',
                        background: '#f0f4ff', border: '1px solid #bfdbfe',
                        borderRadius: '4px', fontSize: '11px', color: '#1d4ed8',
                        cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 500,
                      }}
                    >
                      View in analysis →
                    </button>
                  )}
                  {onCompareToggle && (
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px',
                      fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#6b7280', cursor: 'pointer',
                    }}>
                      <input
                        type="checkbox"
                        checked={compareSet.has(i)}
                        onChange={() => onCompareToggle(i)}
                        style={{ accentColor: TYPE_COLORS[type] || TYPE_COLORS.general }}
                      />
                      Compare this site
                    </label>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* ── Layer control panel (top-right) ── */}
      {pins.length > 0 && (
        <div className={styles.layerPanel}>
          <button
            className={`${styles.panelToggle} ${panelOpen ? styles.panelToggleOpen : ''}`}
            onClick={() => setPanelOpen((v) => !v)}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect y="0" width="14" height="2" rx="1" fill="currentColor"/>
              <rect y="6" width="14" height="2" rx="1" fill="currentColor"/>
              <rect y="12" width="14" height="2" rx="1" fill="currentColor"/>
            </svg>
            Layers
          </button>

          {panelOpen && (
            <div className={styles.panelBody}>

              {/* Heatmap toggle */}
              <div className={styles.panelSection}>
                <div className={styles.panelSectionLabel}>Overlay</div>
                <label className={styles.switchRow}>
                  <span>Suitability heatmap</span>
                  <button
                    className={`${styles.toggle} ${heatVisible ? styles.toggleOn : ''}`}
                    onClick={() => setHeatVisible((v) => !v)}
                  />
                </label>
              </div>

              {/* Heatmap mode */}
              {heatVisible && (
                <div className={styles.panelSection}>
                  <div className={styles.panelSectionLabel}>Heatmap mode</div>
                  <div className={styles.modeRow}>
                    <button
                      className={`${styles.modeBtn} ${heatMode === 'opportunity' ? styles.modeBtnActive : ''}`}
                      onClick={() => setHeatMode('opportunity')}
                    >Opportunity</button>
                    <button
                      className={`${styles.modeBtn} ${heatMode === 'risk' ? styles.modeBtnActive : ''}`}
                      onClick={() => setHeatMode('risk')}
                    >Risk</button>
                  </div>
                </div>
              )}

              {/* Investment type filter */}
              {pinTypes.length > 1 && (
                <div className={styles.panelSection}>
                  <div className={styles.panelSectionLabel}>Investment type</div>
                  {pinTypes.map((type) => (
                    <label key={type} className={styles.checkRow} onClick={() => toggleType(type)}>
                      <span
                        className={`${styles.checkbox} ${activeTypes.has(type) ? styles.checkboxOn : ''}`}
                        style={{ '--chk-color': TYPE_COLORS[type] || TYPE_COLORS.general }}
                      />
                      <span className={styles.typeIcon} style={{ background: TYPE_COLORS[type] || TYPE_COLORS.general }} />
                      {TYPE_LABELS[type] || type}
                    </label>
                  ))}
                </div>
              )}

              {/* Legend */}
              {heatVisible && (
                <div className={styles.panelSection}>
                  <div className={styles.panelSectionLabel}>Legend</div>
                  <div className={styles.gradientBar} style={{
                    background: heatMode === 'opportunity'
                      ? 'linear-gradient(to right, #f97316, #facc15, #16a34a)'
                      : 'linear-gradient(to right, #dc2626, #facc15, #86efac)',
                  }} />
                  <div className={styles.legendRows}>
                    {legend.map(({ label, color }) => (
                      <div key={label} className={styles.legendRow}>
                        <span className={styles.legendDot} style={{ background: color }} />
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { TYPE_COLORS, TYPE_LABELS };

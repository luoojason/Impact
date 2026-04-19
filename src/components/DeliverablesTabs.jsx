import { useState, useRef } from 'react';
import WorldMap from './WorldMap.jsx';
import LinkedText from './LinkedText.jsx';
import ComparisonDrawer from './ComparisonDrawer.jsx';
import { nameToIso3 } from '../lib/countryUtils.js';
import { exportPDF } from '../lib/exportPDF.js';
import styles from './DeliverablesTabs.module.css';

const TAB_KEYS = ['brief', 'risks', 'roadmap', 'regulatory', 'financial', 'funders'];
const TAB_LABELS = {
  brief: 'Brief', risks: 'Risks', roadmap: 'Roadmap',
  regulatory: 'Regulatory', financial: 'Financial', funders: 'Funders',
};

function tabForPin(pin) {
  const t = pin?.type;
  if (t === 'solar' || t === 'wind' || t === 'hydro' || t === 'geothermal') return 'financial';
  if (t === 'transmission' || t === 'storage') return 'roadmap';
  return 'brief';
}

export default function DeliverablesTabs({ sections, companyName, pins = [], intake }) {
  const [activeTab, setActiveTab]     = useState('brief');
  const [highlight, setHighlight]     = useState(null);
  const [compareSet, setCompareSet]   = useState(new Set());
  const [exporting, setExporting]     = useState(false);
  const bodyRef                       = useRef(null);
  const mapControlRef                 = useRef(null);
  const mapAreaRef                    = useRef(null);

  const targetIso3 = new Set(
    (intake?.geoFocus || '')
      .split(',').map(s => s.trim()).filter(Boolean)
      .map(nameToIso3).filter(Boolean)
  );

  // Pin click from map → jump to document tab
  function handleMapPinClick(pin) {
    setActiveTab(tabForPin(pin));
    setHighlight(pin.name);
    bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Pin name click from document text → fly map to pin
  function handleNarrativePinClick(pin) {
    mapControlRef.current?.flyToPin(pin);
    setHighlight(pin.name);
  }

  // Comparison drawer
  function toggleCompare(idx) {
    setCompareSet(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else if (next.size < 3) next.add(idx);
      return next;
    });
  }

  function handleExportMD() {
    const date = new Date().toISOString().slice(0, 10);
    const slug = (companyName || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const content = TAB_KEYS.map(key => `## ${TAB_LABELS[key]}\n${sections?.[key] || ''}\n`).join('\n')
      + `\n_Exported: ${new Date().toISOString()}_\n`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `impactgrid-${slug}-${date}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleExportPDF() {
    setExporting(true);
    try {
      await exportPDF({ mapEl: mapAreaRef.current, sections, pins, companyName });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className={styles.layout}>
      {/* ── Map ── */}
      <div className={styles.mapArea} ref={mapAreaRef}>
        <WorldMap
          targetIso3={targetIso3}
          pins={pins}
          showHeatmap={true}
          onPinClick={handleMapPinClick}
          onCompareToggle={toggleCompare}
          compareSet={compareSet}
          mapControlRef={mapControlRef}
        />
      </div>

      {/* ── Document panel ── */}
      <aside className={styles.panel}>
        <div className={styles.tabBar}>
          <div className={styles.tabs}>
            {TAB_KEYS.map(key => (
              <button
                key={key}
                className={`${styles.tab} ${activeTab === key ? styles.active : ''}`}
                onClick={() => { setActiveTab(key); setHighlight(null); }}
              >
                {TAB_LABELS[key]}
              </button>
            ))}
          </div>
          <div className={styles.exportGroup}>
            <button className={styles.exportBtn} onClick={handleExportMD}>MD</button>
            <button className={`${styles.exportBtn} ${styles.exportBtnPdf}`} onClick={handleExportPDF} disabled={exporting}>
              {exporting ? '…' : 'PDF'}
            </button>
          </div>
        </div>

        {highlight && (
          <div className={styles.pinBanner}>
            <span className={styles.pinBannerDot} />
            Viewing analysis for <strong>{highlight}</strong>
            <button className={styles.pinBannerClose} onClick={() => setHighlight(null)}>×</button>
          </div>
        )}

        <div className={styles.body} ref={bodyRef}>
          <LinkedText
            text={sections?.[activeTab] || ''}
            pins={pins}
            onPinClick={handleNarrativePinClick}
          />
        </div>
      </aside>

      {/* ── Comparison drawer ── */}
      {compareSet.size > 0 && (
        <ComparisonDrawer
          pins={pins}
          compareSet={compareSet}
          onClose={() => setCompareSet(new Set())}
          onFlyTo={(pin) => mapControlRef.current?.flyToPin(pin)}
        />
      )}
    </div>
  );
}

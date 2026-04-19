import SparkLine from './SparkLine.jsx';
import styles from './ComparisonDrawer.module.css';

const TYPE_COLORS = {
  solar: '#f59e0b', wind: '#3b82f6', hydro: '#0ea5e9',
  geothermal: '#ef4444', storage: '#8b5cf6', transmission: '#6b7280', general: '#2563eb',
};
const TYPE_LABELS = {
  solar: 'Solar', wind: 'Wind', hydro: 'Hydro',
  geothermal: 'Geothermal', storage: 'Storage', transmission: 'Transmission', general: 'General',
};

function riskLevel(pin) {
  if (!pin.risk) return { label: 'Low', color: '#16a34a' };
  const text = pin.risk.toLowerCase();
  if (text.includes('high') || text.includes('severe') || text.includes('critical')) return { label: 'High', color: '#dc2626' };
  if (text.includes('medium') || text.includes('moderate')) return { label: 'Medium', color: '#d97706' };
  return { label: 'Low–Med', color: '#ca8a04' };
}

function trendArrow(data) {
  if (!data || data.length < 2) return null;
  const delta = data[data.length - 1] - data[0];
  return delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
}

function lastVal(data) {
  if (!data || data.length === 0) return null;
  const v = data[data.length - 1];
  return typeof v === 'number' ? v.toFixed(1) : null;
}

function Row({ label, children }) {
  return (
    <>
      <div className={styles.rowLabel}>{label}</div>
      {children}
    </>
  );
}

export default function ComparisonDrawer({ pins, compareSet, onClose, onFlyTo }) {
  const compared = [...compareSet].map(idx => pins[idx]).filter(Boolean);
  if (compared.length === 0) return null;

  const cols = compared.length;

  return (
    <div className={styles.drawer}>
      <div className={styles.drawerHeader}>
        <span className={styles.drawerTitle}>Site comparison — {compared.length} site{compared.length > 1 ? 's' : ''}</span>
        <button className={styles.closeBtn} onClick={onClose}>Clear all ×</button>
      </div>

      <div className={styles.scrollArea}>
        <div className={styles.grid} style={{ gridTemplateColumns: `148px repeat(${cols}, 1fr)` }}>

          {/* ── Site headers ── */}
          <div className={styles.rowLabel} />
          {compared.map((pin, i) => (
            <div key={i} className={styles.siteHeader}>
              <button className={styles.siteNameBtn} onClick={() => onFlyTo?.(pin)}>
                <span className={styles.siteDot} style={{ background: TYPE_COLORS[pin.type] || TYPE_COLORS.general }} />
                {pin.name}
              </button>
              <span className={styles.siteType}>{TYPE_LABELS[pin.type] || pin.type}</span>
              <span className={styles.siteCoords}>{pin.lat?.toFixed(2)}°, {pin.lon?.toFixed(2)}°</span>
            </div>
          ))}

          {/* ── Technology ── */}
          <Row label="Technology">
            {compared.map((pin, i) => (
              <div key={i} className={styles.cell}>
                <span className={styles.typeTag} style={{
                  background: `${TYPE_COLORS[pin.type] || TYPE_COLORS.general}18`,
                  color: TYPE_COLORS[pin.type] || TYPE_COLORS.general,
                  border: `1px solid ${TYPE_COLORS[pin.type] || TYPE_COLORS.general}35`,
                }}>
                  {TYPE_LABELS[pin.type] || pin.type || 'General'}
                </span>
              </div>
            ))}
          </Row>

          {/* ── Risk level ── */}
          <Row label="Risk level">
            {compared.map((pin, i) => {
              const { label, color } = riskLevel(pin);
              return (
                <div key={i} className={styles.cell}>
                  <span className={styles.riskBadge} style={{ color, borderColor: color, background: `${color}12` }}>
                    {label}
                  </span>
                </div>
              );
            })}
          </Row>

          {/* ── Opportunity ── */}
          <Row label="Opportunity">
            {compared.map((pin, i) => (
              <div key={i} className={`${styles.cell} ${styles.cellText}`}>
                {pin.opportunity || '—'}
              </div>
            ))}
          </Row>

          {/* ── Key risk ── */}
          <Row label="Key risk">
            {compared.map((pin, i) => (
              <div key={i} className={`${styles.cell} ${styles.cellText} ${styles.cellRisk}`}>
                {pin.risk || '—'}
              </div>
            ))}
          </Row>

          {/* ── Conflict trend ── */}
          <Row label="Conflict trend">
            {compared.map((pin, i) => {
              const d = pin.sparklines?.conflict;
              return (
                <div key={i} className={styles.cell}>
                  {d?.length > 1 ? (
                    <div className={styles.sparkCell}>
                      <SparkLine data={d} color="#ef4444" width={72} height={24} />
                      <span className={styles.sparkMeta} style={{ color: '#ef4444' }}>
                        {trendArrow(d)} {lastVal(d)}/100k
                      </span>
                    </div>
                  ) : <span className={styles.noData}>No data</span>}
                </div>
              );
            })}
          </Row>

          {/* ── Deforestation trend ── */}
          <Row label="Deforestation">
            {compared.map((pin, i) => {
              const d = pin.sparklines?.deforestation;
              return (
                <div key={i} className={styles.cell}>
                  {d?.length > 1 ? (
                    <div className={styles.sparkCell}>
                      <SparkLine data={d} color="#f97316" width={72} height={24} />
                      <span className={styles.sparkMeta} style={{ color: '#f97316' }}>
                        {trendArrow(d)} {lastVal(d)}%/yr
                      </span>
                    </div>
                  ) : <span className={styles.noData}>No data</span>}
                </div>
              );
            })}
          </Row>

          {/* ── Renewable resource ── */}
          <Row label="Renewable resource">
            {compared.map((pin, i) => {
              const d = pin.sparklines?.renewable;
              return (
                <div key={i} className={styles.cell}>
                  {d?.length > 1 ? (
                    <div className={styles.sparkCell}>
                      <SparkLine data={d} color="#16a34a" width={72} height={24} />
                      <span className={styles.sparkMeta} style={{ color: '#16a34a' }}>
                        {trendArrow(d)} {lastVal(d)} kWh/m²/d
                      </span>
                    </div>
                  ) : <span className={styles.noData}>No data</span>}
                </div>
              );
            })}
          </Row>

        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import WorldMap from './WorldMap.jsx';
import styles from './IntakeForm.module.css';

const FOCUS_OPTIONS = [
  { value: 'solar',      label: 'Solar' },
  { value: 'wind',       label: 'Wind' },
  { value: 'hydro',      label: 'Hydro' },
  { value: 'geothermal', label: 'Geothermal' },
  { value: 'storage',    label: 'Storage' },
];

const RISK_OPTIONS = [
  { value: 'low',    label: 'Low',    cls: styles.riskLow  },
  { value: 'medium', label: 'Medium', cls: styles.riskMed  },
  { value: 'high',   label: 'High',   cls: styles.riskHigh },
];

function GlobeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className={styles.emblemIcon}>
      <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="1.2"/>
      <ellipse cx="11" cy="11" rx="3.8" ry="9" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="2" y1="11" x2="20" y2="11" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M3.5 7Q11 5.5 18.5 7" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round"/>
      <path d="M3.5 15Q11 16.5 18.5 15" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round"/>
    </svg>
  );
}

export default function IntakeForm({ onSubmit, onDemo, error, submitting }) {
  const [form, setForm] = useState({
    companyName: '',
    companyDesc: '',
    investmentFocus: [],
    geoFocus: '',
    projectSizeMin: '',
    projectSizeMax: '',
    horizonYears: 10,
    existingPortfolio: '',
    riskTolerance: 'medium',
    specificRegions: '',
  });

  function toggle(value) {
    setForm((f) => ({
      ...f,
      investmentFocus: f.investmentFocus.includes(value)
        ? f.investmentFocus.filter((v) => v !== value)
        : [...f.investmentFocus, value],
    }));
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      ...form,
      projectSizeMin: Number(form.projectSizeMin) || 0,
      projectSizeMax: Number(form.projectSizeMax) || 0,
      horizonYears: Number(form.horizonYears) || 10,
    });
  }

  const emptySet = new Set();

  return (
    <div className={styles.shell}>

      {/* ════════════════════════════════
          LEFT — Control Panel
      ════════════════════════════════ */}
      <div className={styles.panel}>

        {/* Identity block */}
        <div className={styles.panelHead}>
          <div className={styles.headTop}>
            <div className={styles.emblem}><GlobeIcon /></div>
            <div className={styles.headMeta}>
              <span className={styles.metaBadge}>Unrestricted</span>
              <span className={styles.metaRef}>REF · IG-{new Date().getFullYear()}-GIS</span>
            </div>
          </div>

          <div className={styles.headTitle}>
            <div className={styles.platformLabel}>ImpactGrid Platform</div>
            <div className={styles.platformName}>Renewable Energy<br />Site Intelligence</div>
            <div className={styles.platformSub}>
              AI-powered geo-spatial analysis across emerging &amp; frontier markets
            </div>
          </div>

          <div className={styles.accentStrip} />

          <div className={styles.headStats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>195</span>
              <span className={styles.statLabel}>Countries</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>11</span>
              <span className={styles.statLabel}>Data Layers</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>Real-time</span>
              <span className={styles.statLabel}>Analysis</span>
            </div>
          </div>
        </div>

        {/* Form sections */}
        <form className={styles.formScroll} onSubmit={handleSubmit} id="intake-form">

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>1</span>
              <span className={styles.sectionLabel}>Organisation</span>
            </div>
            <div className={styles.sectionBody}>
              <div className={styles.field}>
                <label className={styles.label}>Name *</label>
                <input className={styles.input} name="companyName" value={form.companyName}
                  onChange={handleChange} required placeholder="Acme Energy Partners" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Description</label>
                <textarea className={styles.textarea} name="companyDesc" value={form.companyDesc}
                  onChange={handleChange} rows={2} placeholder="Fund or company overview" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Existing Portfolio</label>
                <textarea className={styles.textarea} name="existingPortfolio" value={form.existingPortfolio}
                  onChange={handleChange} rows={2} placeholder="Current investments or assets" />
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>2</span>
              <span className={styles.sectionLabel}>Energy Focus</span>
            </div>
            <div className={styles.sectionBody}>
              <div className={styles.chips}>
                {FOCUS_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button"
                    className={`${styles.chip} ${form.investmentFocus.includes(opt.value) ? styles.chipActive : ''}`}
                    onClick={() => toggle(opt.value)}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>3</span>
              <span className={styles.sectionLabel}>Geography</span>
            </div>
            <div className={styles.sectionBody}>
              <div className={styles.field}>
                <label className={styles.label}>Countries / Regions *</label>
                <input className={styles.input} name="geoFocus" value={form.geoFocus}
                  onChange={handleChange} placeholder="Kenya, Nigeria, Brazil" required />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Sub-regions</label>
                <input className={styles.input} name="specificRegions" value={form.specificRegions}
                  onChange={handleChange} placeholder="Sub-Saharan Africa, Coastal Vietnam" />
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>4</span>
              <span className={styles.sectionLabel}>Project Size (USD)</span>
            </div>
            <div className={styles.sectionBody}>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label}>Minimum</label>
                  <input className={styles.input} type="number" name="projectSizeMin"
                    value={form.projectSizeMin} onChange={handleChange} min={0} placeholder="5,000,000" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Maximum</label>
                  <input className={styles.input} type="number" name="projectSizeMax"
                    value={form.projectSizeMax} onChange={handleChange} min={0} placeholder="50,000,000" />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>5</span>
              <span className={styles.sectionLabel}>Risk &amp; Horizon</span>
            </div>
            <div className={styles.sectionBody}>
              <div className={styles.field}>
                <label className={styles.label}>Risk Tolerance</label>
                <div className={styles.riskGroup}>
                  {RISK_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button"
                      className={`${styles.riskOption} ${opt.cls} ${form.riskTolerance === opt.value ? styles.riskActive : ''}`}
                      onClick={() => setForm((f) => ({ ...f, riskTolerance: opt.value }))}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Investment Horizon</label>
                <div className={styles.horizonRow}>
                  <input className={styles.slider} type="range" min={1} max={30}
                    name="horizonYears" value={form.horizonYears} onChange={handleChange} />
                  <span className={styles.horizonValue}>{form.horizonYears} yr</span>
                </div>
              </div>
            </div>
          </div>

        </form>

        {/* Submit footer */}
        <div className={styles.actions}>
          <button className={styles.submit} type="submit" form="intake-form" disabled={submitting}>
            {submitting ? (
              <span className={styles.submitStatus}>
                <span className={styles.dot} />
                Initializing analysis…
              </span>
            ) : (
              <span>Initiate Analysis</span>
            )}
            {!submitting && <span className={styles.submitArrow}>→</span>}
          </button>
          <button
            type="button"
            className={styles.demoBtn}
            onClick={onDemo}
            disabled={submitting}
          >
            Try Demo
          </button>
          {error && <p className={styles.error}>{error}</p>}
        </div>
      </div>

      {/* ════════════════════════════════
          RIGHT — Map
      ════════════════════════════════ */}
      <div className={styles.mapPanel}>
        <WorldMap targetIso3={emptySet} pins={[]} />
        <div className={styles.mapOverlay}>
          <div className={styles.mapLabel}>WGS 84 · EPSG:4326 · 195 sovereign states</div>
          <div className={styles.mapLabel}>Configure parameters and initiate analysis</div>
        </div>
      </div>

    </div>
  );
}

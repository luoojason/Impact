import { useState } from 'react';
import styles from './IntakeForm.module.css';

const FOCUS_OPTIONS = [
  { value: 'solar', label: 'Solar', icon: '☀' },
  { value: 'wind', label: 'Wind', icon: '💨' },
  { value: 'hydro', label: 'Hydro', icon: '💧' },
  { value: 'geothermal', label: 'Geothermal', icon: '🌋' },
  { value: 'storage', label: 'Storage', icon: '🔋' },
];

export default function IntakeForm({ onSubmit, error, submitting }) {
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

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setForm((f) => ({
        ...f,
        investmentFocus: checked
          ? [...f.investmentFocus, value]
          : f.investmentFocus.filter((v) => v !== value),
      }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
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

  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>Renewable Energy<br />Investment Intelligence</h1>
        <p className={styles.heroSub}>AI-powered analysis of emerging market opportunities — climate risk, conflict data, regulatory landscape, and comparable projects in seconds.</p>
      </div>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          <div className={styles.section}>
            <div className={styles.sectionLabel}>Company</div>
            <div className={styles.field}>
              <label className={styles.label}>Name *</label>
              <input className={styles.input} name="companyName" value={form.companyName} onChange={handleChange} required placeholder="Acme Energy Partners" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Description</label>
              <textarea className={styles.textarea} name="companyDesc" value={form.companyDesc} onChange={handleChange} rows={2} placeholder="Brief description of your fund or company" />
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionLabel}>Investment</div>
            <div className={styles.field}>
              <label className={styles.label}>Focus Areas</label>
              <div className={styles.chips}>
                {FOCUS_OPTIONS.map((opt) => (
                  <label key={opt.value} className={`${styles.chip} ${form.investmentFocus.includes(opt.value) ? styles.chipActive : ''}`}>
                    <input type="checkbox" name="investmentFocus" value={opt.value} checked={form.investmentFocus.includes(opt.value)} onChange={handleChange} className={styles.hiddenInput} />
                    <span>{opt.icon}</span> {opt.label}
                  </label>
                ))}
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Geographic Focus *</label>
              <input className={styles.input} name="geoFocus" value={form.geoFocus} onChange={handleChange} placeholder="Kenya, Nigeria, Brazil" required />
            </div>
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>Min Size (USD)</label>
                <input className={styles.input} type="number" name="projectSizeMin" value={form.projectSizeMin} onChange={handleChange} min={0} placeholder="5,000,000" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Max Size (USD)</label>
                <input className={styles.input} type="number" name="projectSizeMax" value={form.projectSizeMax} onChange={handleChange} min={0} placeholder="50,000,000" />
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionLabel}>Parameters</div>
            <div className={styles.field}>
              <label className={styles.label}>Risk Tolerance</label>
              <div className={styles.riskGroup}>
                {['low', 'medium', 'high'].map((r) => (
                  <label key={r} className={`${styles.riskOption} ${form.riskTolerance === r ? styles.riskActive : ''}`}>
                    <input type="radio" name="riskTolerance" value={r} checked={form.riskTolerance === r} onChange={handleChange} className={styles.hiddenInput} />
                    {r}
                  </label>
                ))}
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Horizon (years)</label>
              <input className={styles.input} type="number" name="horizonYears" value={form.horizonYears} onChange={handleChange} min={1} max={50} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Specific Regions</label>
              <input className={styles.input} name="specificRegions" value={form.specificRegions} onChange={handleChange} placeholder="Sub-Saharan Africa, Southeast Asia" />
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.submit} type="submit" disabled={submitting}>
            {submitting ? (
              <><span className={styles.dot} />Initializing analysis…</>
            ) : (
              <>Run Analysis →</>
            )}
          </button>
          {error && <p className={styles.error}>{error}</p>}
        </div>
      </form>
    </main>
  );
}

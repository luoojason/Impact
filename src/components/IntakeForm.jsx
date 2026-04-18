import { useState } from 'react';
import styles from './IntakeForm.module.css';

const INVESTMENT_FOCUS_OPTIONS = ['solar', 'wind', 'hydro', 'geothermal', 'storage'];

export default function IntakeForm({ onSubmit }) {
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
    <main className={styles.container}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h2 className={styles.title}>New Investment Analysis</h2>

        <div className={styles.field}>
          <label className={styles.label}>Company Name</label>
          <input
            className={styles.input}
            name="companyName"
            value={form.companyName}
            onChange={handleChange}
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Company Description</label>
          <textarea
            className={styles.textarea}
            name="companyDesc"
            value={form.companyDesc}
            onChange={handleChange}
            rows={3}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Investment Focus</label>
          <div className={styles.checkboxGroup}>
            {INVESTMENT_FOCUS_OPTIONS.map((opt) => (
              <label key={opt} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="investmentFocus"
                  value={opt}
                  checked={form.investmentFocus.includes(opt)}
                  onChange={handleChange}
                  className={styles.checkbox}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Geographic Focus (comma-separated country names)</label>
          <input
            className={styles.input}
            name="geoFocus"
            value={form.geoFocus}
            onChange={handleChange}
            placeholder="e.g. Kenya, Nigeria, Brazil"
          />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Min Project Size (USD)</label>
            <input
              className={styles.input}
              type="number"
              name="projectSizeMin"
              value={form.projectSizeMin}
              onChange={handleChange}
              min={0}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Max Project Size (USD)</label>
            <input
              className={styles.input}
              type="number"
              name="projectSizeMax"
              value={form.projectSizeMax}
              onChange={handleChange}
              min={0}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Investment Horizon (years)</label>
          <input
            className={styles.input}
            type="number"
            name="horizonYears"
            value={form.horizonYears}
            onChange={handleChange}
            min={1}
            max={50}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Existing Portfolio (optional)</label>
          <textarea
            className={styles.textarea}
            name="existingPortfolio"
            value={form.existingPortfolio}
            onChange={handleChange}
            rows={2}
            placeholder="One project per line"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Risk Tolerance</label>
          <div className={styles.radioGroup}>
            {['low', 'medium', 'high'].map((r) => (
              <label key={r} className={styles.radioLabel}>
                <input
                  type="radio"
                  name="riskTolerance"
                  value={r}
                  checked={form.riskTolerance === r}
                  onChange={handleChange}
                  className={styles.radio}
                />
                {r}
              </label>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Specific Regions</label>
          <input
            className={styles.input}
            name="specificRegions"
            value={form.specificRegions}
            onChange={handleChange}
            placeholder="e.g. Sub-Saharan Africa, Southeast Asia"
          />
        </div>

        <button className={styles.submit} type="submit">
          Run analysis →
        </button>
      </form>
    </main>
  );
}

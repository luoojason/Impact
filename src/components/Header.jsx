import styles from './Header.module.css';

function LayersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M9 2L16 6L9 10L2 6L9 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M2 10L9 14L16 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <span className={styles.logoIcon}><LayersIcon /></span>
        <span className={styles.wordmark}>ImpactGrid</span>
        <span className={styles.divider} />
        <span className={styles.tagline}>Renewable Energy Site Intelligence</span>
      </div>
      <div className={styles.right} />
    </header>
  );
}

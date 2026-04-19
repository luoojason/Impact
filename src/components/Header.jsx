import styles from './Header.module.css';

function GlobeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.3"/>
      <ellipse cx="10" cy="10" rx="3.5" ry="8.5" stroke="currentColor" strokeWidth="1.3"/>
      <line x1="1.5" y1="10" x2="18.5" y2="10" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M3.5 6.5Q10 5 16.5 6.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
      <path d="M3.5 13.5Q10 15 16.5 13.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
}

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <span className={styles.logoIcon}><GlobeIcon /></span>
        <span className={styles.wordmark}>ImpactGrid</span>
        <span className={styles.divider} />
        <span className={styles.tagline}>Renewable Energy Intelligence</span>
      </div>
      <div className={styles.right}>
        <span className={styles.badge}>AI-Powered</span>
      </div>
    </header>
  );
}

import styles from './Header.module.css';

export default function Header() {
  return (
    <header className={styles.header}>
      <span className={styles.wordmark}>IMPACTGRID</span>
      <span className={styles.tagline}>AI-powered climate investment intelligence</span>
    </header>
  );
}

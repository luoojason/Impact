import styles from './Header.module.css';

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <span className={styles.logo}>⬡</span>
        <span className={styles.wordmark}>IMPACTGRID</span>
      </div>
      <span className={styles.tagline}>AI-powered renewable energy investment intelligence</span>
    </header>
  );
}

import styles from './LinkedText.module.css';

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default function LinkedText({ text, pins, onPinClick }) {
  if (!pins || pins.length === 0) {
    return <pre className={styles.pre}>{text}</pre>;
  }

  // Sort longest name first to avoid partial matches
  const sorted = [...pins].sort((a, b) => b.name.length - a.name.length);
  const pattern = new RegExp(`(${sorted.map(p => escapeRegex(p.name)).join('|')})`, 'g');
  const parts = text.split(pattern);

  return (
    <pre className={styles.pre}>
      {parts.map((part, i) => {
        const pin = sorted.find(p => p.name === part);
        if (pin) {
          return (
            <button key={i} className={styles.pinLink} onClick={() => onPinClick(pin)}>
              {part}
            </button>
          );
        }
        return part;
      })}
    </pre>
  );
}

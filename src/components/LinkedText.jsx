import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './LinkedText.module.css';

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function splitByPins(text, sortedPins, onPinClick) {
  if (!sortedPins.length) return [text];
  const pattern = new RegExp(`(${sortedPins.map((p) => escapeRegex(p.name)).join('|')})`, 'g');
  return text.split(pattern).map((part, i) => {
    const pin = sortedPins.find((p) => p.name === part);
    if (pin) {
      return (
        <button key={i} className={styles.pinLink} onClick={() => onPinClick?.(pin)}>
          {part}
        </button>
      );
    }
    return part;
  });
}

function processChildren(children, sortedPins, onPinClick) {
  if (!sortedPins.length) return children;
  const arr = Array.isArray(children) ? children : [children];
  return arr.flatMap((child) =>
    typeof child === 'string' ? splitByPins(child, sortedPins, onPinClick) : child
  );
}

export default function LinkedText({ text, pins, onPinClick }) {
  const sortedPins =
    pins && pins.length ? [...pins].sort((a, b) => b.name.length - a.name.length) : [];

  const process = (children) => processChildren(children, sortedPins, onPinClick);

  const components = {
    p:    ({ children }) => <p className={styles.p}>{process(children)}</p>,
    li:   ({ children }) => <li>{process(children)}</li>,
    td:   ({ children }) => <td className={styles.td}>{process(children)}</td>,
    th:   ({ children }) => <th className={styles.th}>{process(children)}</th>,
    h1:   ({ children }) => <h1 className={styles.h1}>{process(children)}</h1>,
    h2:   ({ children }) => <h2 className={styles.h2}>{process(children)}</h2>,
    h3:   ({ children }) => <h3 className={styles.h3}>{process(children)}</h3>,
    table: ({ children }) => (
      <div className={styles.tableWrap}>
        <table className={styles.table}>{children}</table>
      </div>
    ),
  };

  return (
    <div className={styles.markdown}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}

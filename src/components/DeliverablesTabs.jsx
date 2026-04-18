import { useState } from 'react';
import styles from './DeliverablesTabs.module.css';

const TAB_KEYS = ['brief', 'risks', 'roadmap', 'regulatory', 'financial', 'funders'];
const TAB_LABELS = {
  brief: 'Brief',
  risks: 'Risks',
  roadmap: 'Roadmap',
  regulatory: 'Regulatory',
  financial: 'Financial',
  funders: 'Funders',
};

export default function DeliverablesTabs({ sections, companyName }) {
  const [activeTab, setActiveTab] = useState('brief');

  function handleExport() {
    const date = new Date().toISOString().slice(0, 10);
    const slug = (companyName || 'unknown')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const content = TAB_KEYS.map((key) => {
      const text = sections?.[key] || '';
      return `## ${TAB_LABELS[key]}\n${text}\n`;
    }).join('\n') + `\n_Exported: ${new Date().toISOString()}_\n`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `impactgrid-${slug}-${date}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className={styles.container}>
      <div className={styles.header}>
        <div className={styles.tabs}>
          {TAB_KEYS.map((key) => (
            <button
              key={key}
              className={`${styles.tab} ${activeTab === key ? styles.active : ''}`}
              onClick={() => setActiveTab(key)}
            >
              {TAB_LABELS[key]}
            </button>
          ))}
        </div>
        <button className={styles.exportBtn} onClick={handleExport}>
          Export all
        </button>
      </div>
      <div className={styles.body}>
        <pre className={styles.content}>
          {sections?.[activeTab] || ''}
        </pre>
      </div>
    </main>
  );
}

import { useState, useCallback } from 'react';
import WorldMap from './WorldMap.jsx';
import LiveFeed from './LiveFeed.jsx';
import useSSE from '../hooks/useSSE.js';
import { nameToIso3 } from '../lib/countryUtils.js';
import styles from './AnalysisView.module.css';

export default function AnalysisView({ streamId, intake, onDone, onReplayDetected }) {
  const [toolEvents, setToolEvents] = useState([]);
  const [sections, setSections] = useState([]);
  const [replayFlagSeen, setReplayFlagSeen] = useState(false);

  const targetIso3 = new Set(
    (intake?.geoFocus || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map(nameToIso3)
      .filter(Boolean)
  );

  const handlers = {
    tool_call_start: ({ data }) => {
      setToolEvents((prev) => [...prev, { id: data.id, name: data.name, ok: undefined }]);
    },
    tool_call_end: ({ data }) => {
      setToolEvents((prev) =>
        prev.map((ev) => (ev.id === data.id ? { ...ev, ok: data.ok } : ev))
      );
    },
    section_end: ({ data }) => {
      setSections((prev) => [...prev, { section: data.section, text: data.text }]);
    },
    iter: ({ data }) => {
      if (data.replay && !replayFlagSeen) {
        setReplayFlagSeen(true);
        onReplayDetected?.();
      }
    },
    done: ({ data }) => {
      if (data.replay && !replayFlagSeen) {
        setReplayFlagSeen(true);
        onReplayDetected?.();
      }
      onDone(data.sections);
    },
  };

  useSSE(streamId, handlers);

  return (
    <main className={styles.container}>
      <div className={styles.grid}>
        <div className={styles.mapCol}>
          <WorldMap targetIso3={targetIso3} />
        </div>
        <div className={styles.feedCol}>
          <LiveFeed events={toolEvents} />
        </div>
      </div>
      {sections.length > 0 && (
        <div className={styles.sections}>
          {sections.map((s) => (
            <div key={s.section} className={styles.sectionBlock}>
              <div className={styles.sectionLabel}>{s.section}</div>
              <pre className={styles.sectionText}>{s.text}</pre>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

import { useState } from 'react';
import WorldMap from './WorldMap.jsx';
import useSSE from '../hooks/useSSE.js';
import { nameToIso3 } from '../lib/countryUtils.js';
import styles from './AnalysisView.module.css';

const TOOL_LABELS = {
  get_climate_projections: 'Climate projections',
  get_permafrost_data: 'Permafrost data',
  get_seismic_hazard: 'Seismic hazard',
  get_renewable_resource_potential: 'Renewable potential',
  get_political_risk: 'Political risk',
  get_energy_access_gap: 'Energy access',
  get_conflict_data: 'Conflict events',
  get_deforestation_data: 'Deforestation',
  get_food_insecurity_data: 'Food insecurity',
  get_sea_level_projections: 'Sea level risk',
  get_comparable_projects: 'Comparable projects',
  generate_document: 'Document generation',
};

export default function AnalysisView({ streamId, intake, onDone, onReplayDetected }) {
  const [toolEvents, setToolEvents] = useState([]);
  const [brief, setBrief] = useState('');
  const [pins, setPins] = useState([]);
  const [done, setDone] = useState(false);
  const [agentError, setAgentError] = useState(null);
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
      if (data.section === 'brief') setBrief(data.text);
    },
    iter: ({ data }) => {
      if (data.replay && !replayFlagSeen) { setReplayFlagSeen(true); onReplayDetected?.(); }
    },
    done: ({ data }) => {
      if (data.replay && !replayFlagSeen) { setReplayFlagSeen(true); onReplayDetected?.(); }
      setPins(data.pins ?? []);
      setDone(true);
      onDone(data.sections);
    },
    error: ({ data }) => {
      setAgentError(data.message || 'Unknown error');
    },
  };

  useSSE(streamId, handlers);

  const completedTools = toolEvents.filter((e) => e.ok !== undefined);
  const passedTools = completedTools.filter((e) => e.ok === true);
  const failedTools = completedTools.filter((e) => e.ok === false);
  const pendingTools = toolEvents.filter((e) => e.ok === undefined);

  return (
    <div className={styles.layout}>
      <div className={styles.mapArea}>
        <WorldMap targetIso3={targetIso3} pins={pins} />
        {!done && (
          <div className={styles.mapOverlay}>
            <div className={styles.analyzing}>
              <span className={styles.pulse} />
              Analyzing {intake?.geoFocus || 'region'}…
            </div>
          </div>
        )}
        {done && pins.length > 0 && (
          <div className={styles.pinLegend}>
            <span className={styles.legendLabel}>{pins.length} opportunity sites identified</span>
            <span className={styles.legendHint}>Click pins to explore</span>
          </div>
        )}
      </div>

      <aside className={styles.sidebar}>
        <div className={styles.sidebarInner}>
          {/* Header */}
          <div className={styles.sidebarHeader}>
            <div className={styles.sidebarTitle}>
              {done ? 'Analysis Complete' : 'Live Analysis'}
            </div>
            {!done && (
              <div className={styles.progress}>
                <div className={styles.progressBar} style={{ width: `${Math.min(100, (completedTools.length / 11) * 100)}%` }} />
              </div>
            )}
          </div>

          {/* Brief summary */}
          {brief && (
            <div className={styles.briefCard}>
              <div className={styles.cardLabel}>Investment Brief</div>
              <p className={styles.briefText}>{brief.slice(0, 420)}{brief.length > 420 ? '…' : ''}</p>
            </div>
          )}

          {/* Live tool feed */}
          {!done && pendingTools.length > 0 && (
            <div className={styles.activeTool}>
              <span className={styles.spinner} />
              <span className={styles.activeToolName}>{TOOL_LABELS[pendingTools[0].name] || pendingTools[0].name}</span>
            </div>
          )}

          {/* Tool status grid */}
          {toolEvents.length > 0 && (
            <div className={styles.toolGrid}>
              <div className={styles.toolGridLabel}>Data Sources</div>
              <div className={styles.toolList}>
                {toolEvents.filter(e => e.name !== 'generate_document').map((ev) => (
                  <div key={ev.id} className={styles.toolRow}>
                    <span className={`${styles.toolDot} ${ev.ok === undefined ? styles.dotPending : ev.ok ? styles.dotOk : styles.dotFail}`} />
                    <span className={styles.toolRowName}>{TOOL_LABELS[ev.name] || ev.name}</span>
                    {ev.ok === undefined && <span className={styles.miniSpinner} />}
                    {ev.ok === true && <span className={styles.toolCheck}>✓</span>}
                    {ev.ok === false && <span className={styles.toolFail}>✗</span>}
                  </div>
                ))}
              </div>
              {done && (
                <div className={styles.toolSummary}>
                  <span className={styles.summaryOk}>{passedTools.length} passed</span>
                  <span className={styles.summarySep}>/</span>
                  <span className={styles.summaryFail}>{failedTools.length} failed</span>
                </div>
              )}
            </div>
          )}

          {agentError && (
            <div className={styles.errorBox}>
              <strong>Error:</strong> {agentError}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

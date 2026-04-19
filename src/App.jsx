import { useState } from 'react';
import Header from './components/Header.jsx';
import IntakeForm from './components/IntakeForm.jsx';
import AnalysisView from './components/AnalysisView.jsx';
import DeliverablesTabs from './components/DeliverablesTabs.jsx';
import ReplayBanner from './components/ReplayBanner.jsx';
import { DEMO_INTAKE } from './demo/demoData.js';

export default function App() {
  const [phase, setPhase] = useState('intake');
  const [streamId, setStreamId] = useState(null);
  const [intake, setIntake] = useState(null);
  const [deliverables, setDeliverables] = useState(null);
  const [pins, setPins] = useState([]);
  const [isReplay, setIsReplay] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  async function handleSubmit(intakeData) {
    setIntake(intakeData);
    setError(null);
    setSubmitting(true);

    try {
      let res;
      try {
        res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(intakeData),
        });
      } catch {
        throw new Error('Cannot reach API server. Is `npm run server` running on :3001?');
      }

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 429 && json.streamId) {
          setStreamId(json.streamId);
          setPhase('analyzing');
          return;
        }
        if (!json.error && [500, 502, 503, 504].includes(res.status)) {
          throw new Error('API server not reachable. Is `npm run server` running on :3001?');
        }
        throw new Error(json.error || `Server error (${res.status})`);
      }

      if (!json.streamId) {
        throw new Error('No streamId returned from server');
      }

      setStreamId(json.streamId);
      setPhase('analyzing');
    } catch (err) {
      console.error('Submit failed:', err);
      setError(err.message || 'Failed to start analysis.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleDemo() {
    setIntake(DEMO_INTAKE);
    setError(null);
    setDemoMode(true);
    setPhase('analyzing');
  }

  function handleDone(sections, deliveredPins) {
    setDeliverables(sections);
    setPins(deliveredPins ?? []);
    setPhase('deliverables');
  }

  function handleReplayDetected() {
    setIsReplay(true);
  }

  return (
    <>
      {isReplay && <ReplayBanner />}
      <Header />
      {phase === 'intake' && (
        <IntakeForm onSubmit={handleSubmit} onDemo={handleDemo} error={error} submitting={submitting} />
      )}
      {phase === 'analyzing' && (
        <AnalysisView
          streamId={streamId}
          intake={intake}
          onDone={handleDone}
          onReplayDetected={handleReplayDetected}
          demoMode={demoMode}
        />
      )}
      {phase === 'deliverables' && (
        <DeliverablesTabs sections={deliverables} companyName={intake?.companyName} pins={pins} intake={intake} />
      )}
    </>
  );
}

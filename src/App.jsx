import { useState } from 'react';
import Header from './components/Header.jsx';
import IntakeForm from './components/IntakeForm.jsx';
import AnalysisView from './components/AnalysisView.jsx';
import DeliverablesTabs from './components/DeliverablesTabs.jsx';
import ReplayBanner from './components/ReplayBanner.jsx';

export default function App() {
  const [phase, setPhase] = useState('intake');
  const [streamId, setStreamId] = useState(null);
  const [intake, setIntake] = useState(null);
  const [deliverables, setDeliverables] = useState(null);
  const [isReplay, setIsReplay] = useState(false);

  function handleSubmit(intakeData) {
    setIntake(intakeData);
    fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(intakeData),
    })
      .then((r) => r.json())
      .then((json) => {
        setStreamId(json.streamId);
        setPhase('analyzing');
      })
      .catch(() => {});
  }

  function handleDone(sections) {
    setDeliverables(sections);
    setPhase('deliverables');
  }

  function handleReplayDetected() {
    setIsReplay(true);
  }

  return (
    <>
      {isReplay && <ReplayBanner />}
      <Header />
      {phase === 'intake' && <IntakeForm onSubmit={handleSubmit} />}
      {phase === 'analyzing' && (
        <AnalysisView
          streamId={streamId}
          intake={intake}
          onDone={handleDone}
          onReplayDetected={handleReplayDetected}
        />
      )}
      {phase === 'deliverables' && (
        <DeliverablesTabs sections={deliverables} companyName={intake?.companyName} />
      )}
    </>
  );
}

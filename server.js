import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { createSession, getSession, appendEvent, endSession } from './server/sessions.js';
import { writeEvent, heartbeat, replayFrom } from './server/sse.js';
import { runAgent } from './server/agent.js';
import { startReplay } from './server/demoReplay.js';

const app = express();

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

const debounceMap = new Map();
const DEBOUNCE_MS = parseInt(process.env.ANALYZE_DEBOUNCE_MS ?? '30000', 10);

app.post('/api/analyze', (req, res) => {
  const { companyName, geoFocus } = req.body ?? {};
  if (!companyName || !geoFocus) {
    return res.status(400).json({ error: 'companyName and geoFocus are required' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() ?? req.socket.remoteAddress ?? 'unknown';
  const now = Date.now();
  const last = debounceMap.get(ip);

  if (DEBOUNCE_MS > 0 && last && now - last.ts < DEBOUNCE_MS) {
    return res.status(429).json({ streamId: last.streamId });
  }

  const streamId = randomUUID();
  debounceMap.set(ip, { ts: now, streamId });

  createSession(streamId);
  res.status(202).json({ streamId });

  const intake = req.body;
  if (process.env.DEMO_MODE === 'replay') {
    startReplay(streamId, intake).catch(e =>
      appendEvent(streamId, { type: 'error', data: { where: 'demoReplay', message: e.message } })
    );
  } else {
    runAgent(streamId, intake).catch(e =>
      appendEvent(streamId, { type: 'error', data: { where: 'runAgent', message: e.message } })
    );
  }
});

app.get('/api/stream/:id', (req, res) => {
  const session = getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'session not found' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const lastEventIdHeader = req.headers['last-event-id'];
  const lastEventId = lastEventIdHeader ? parseInt(lastEventIdHeader, 10) : 0;
  if (lastEventId > 0) {
    replayFrom(res, session.log, lastEventId);
  }

  const onEvent = (entry) => writeEvent(res, entry);
  session.emitter.on('event', onEvent);

  const hb = heartbeat(res);

  req.on('close', () => {
    session.emitter.off('event', onEvent);
    clearInterval(hb);
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`ImpactGrid server listening on port ${PORT}`);
});

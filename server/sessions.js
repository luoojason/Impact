import { EventEmitter } from 'events';

const sessions = new Map();

export function createSession(streamId) {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(20);
  const session = {
    emitter,
    log: [],
    lastEventId: 0,
    lastActivity: new Date(),
    toolResults: new Map(),
    lastDocumentSections: null,
    replay: false
  };
  sessions.set(streamId, session);
  return session;
}

export function getSession(streamId) {
  return sessions.get(streamId) || null;
}

export function appendEvent(streamId, evt) {
  const session = sessions.get(streamId);
  if (!session) return;
  session.lastEventId++;
  const entry = { ...evt, id: session.lastEventId };
  session.log.push(entry);
  session.lastActivity = new Date();
  session.emitter.emit('event', entry);
  return entry;
}

export function recordToolResult(streamId, toolUseId, result) {
  const session = sessions.get(streamId);
  if (!session) return;
  session.toolResults.set(toolUseId, result);
}

export function endSession(streamId) {
  setTimeout(() => {
    sessions.delete(streamId);
  }, 5 * 60 * 1000);
}

function sweepIdle() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastActivity.getTime() > 60 * 1000) {
      sessions.delete(id);
    }
  }
}

setInterval(sweepIdle, 10000);

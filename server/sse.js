export function writeEvent(res, { id, type, data }) {
  res.write(`id: ${id}\nevent: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function heartbeat(res) {
  return setInterval(() => {
    res.write(': ping\n\n');
  }, 15000);
}

export function replayFrom(res, log, lastEventId) {
  const toReplay = log.filter(evt => evt.id > lastEventId);
  for (const evt of toReplay) {
    writeEvent(res, evt);
  }
}

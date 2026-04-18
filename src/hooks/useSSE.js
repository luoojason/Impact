import { useEffect, useRef } from 'react';

export default function useSSE(streamId, handlers) {
  const esRef = useRef(null);

  useEffect(() => {
    if (!streamId) return;

    const es = new EventSource('/api/stream/' + streamId);
    esRef.current = es;

    const eventTypes = [
      'tool_call_start',
      'tool_call_end',
      'section_start',
      'section_end',
      'iter',
      'done',
      'error',
    ];

    eventTypes.forEach((type) => {
      es.addEventListener(type, (event) => {
        const data = JSON.parse(event.data);
        if (handlers[type]) {
          handlers[type]({ id: event.lastEventId, data });
        }
      });
    });

    return () => {
      es.close();
    };
  }, [streamId]);
}

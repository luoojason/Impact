import { useEffect, useRef } from 'react';
import { DEMO_TOOL_SEQUENCE, DEMO_SECTIONS, DEMO_PINS } from '../demo/demoData.js';

const TOOL_DURATION = 800;
const TOOL_GAP = 120;
const SECTION_DELAY = 350;

export default function useDemoSSE({ enabled, handlers }) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled) return;

    const timeouts = [];
    let t = 0;
    let eventId = 1;

    function emit(type, data) {
      const id = eventId++;
      const h = handlersRef.current[type];
      if (h) h({ id, data });
    }

    DEMO_TOOL_SEQUENCE.forEach((name, i) => {
      const toolId = `demo-tool-${i}`;
      timeouts.push(setTimeout(() => emit('tool_call_start', { id: toolId, name, input: {} }), t));
      t += TOOL_DURATION;
      timeouts.push(setTimeout(() => emit('tool_call_end', { id: toolId, name, ok: true, summary: 'OK' }), t));
      t += TOOL_GAP;
    });

    ['brief', 'risks', 'roadmap', 'regulatory', 'financial', 'funders'].forEach((section) => {
      timeouts.push(setTimeout(() => emit('section_start', { section }), t));
      t += SECTION_DELAY;
      timeouts.push(setTimeout(() => emit('section_end', { section, text: DEMO_SECTIONS[section] }), t));
      t += SECTION_DELAY;
    });

    timeouts.push(setTimeout(() => emit('done', { sections: DEMO_SECTIONS, pins: DEMO_PINS }), t));

    return () => timeouts.forEach(clearTimeout);
  }, [enabled]);
}

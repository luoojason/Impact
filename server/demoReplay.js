import { createReadStream, existsSync } from 'fs';
import { createInterface } from 'readline';
import { appendEvent, getSession } from './sessions.js';

const SECTIONS = ['brief', 'risks', 'roadmap', 'regulatory', 'financial', 'funders'];

const STUB_TOOLS = [
  { id: 'toolu_demo_1', name: 'get_climate_projections', input: { country_iso3: 'KEN', variable: 'tas' } },
  { id: 'toolu_demo_2', name: 'get_political_risk', input: { country_iso2: 'KE' } },
  { id: 'toolu_demo_3', name: 'get_energy_access_gap', input: { country_iso2: 'KE' } },
  { id: 'toolu_demo_4', name: 'get_renewable_resource_potential', input: { latitude: 1.0, longitude: 38.0, country_iso3: 'KEN' } },
  { id: 'toolu_demo_5', name: 'get_conflict_data', input: { country_name: 'Kenya' } },
  { id: 'toolu_demo_6', name: 'get_comparable_projects', input: { country_iso2: 'KE' } },
];

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function playFixture(streamId, fixturePath) {
  const session = getSession(streamId);
  if (session) session.replay = true;

  const rl = createInterface({ input: createReadStream(fixturePath), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const evt = JSON.parse(line);
      appendEvent(streamId, evt);
      await delay(500);
    } catch {
      // skip malformed lines
    }
  }
}

async function playCanned(streamId) {
  const session = getSession(streamId);
  if (session) session.replay = true;

  // First event carries replay flag
  appendEvent(streamId, { type: 'iter', data: { iter: 0, stop_reason: 'tool_use', replay: true } });
  await delay(500);

  for (const tool of STUB_TOOLS) {
    appendEvent(streamId, { type: 'tool_call_start', data: { id: tool.id, name: tool.name, input: tool.input } });
    await delay(500);
    const result = { ok: true, data: { stub: true }, source: 'demo', url: 'demo' };
    if (session) {
      session.toolResults.set(tool.id, { name: tool.name, ...result });
    }
    appendEvent(streamId, { type: 'tool_call_end', data: { id: tool.id, name: tool.name, ok: true, summary: { ok: true, preview: 'demo stub data' } } });
    await delay(500);
  }

  const sections = {};
  for (const section of SECTIONS) {
    appendEvent(streamId, { type: 'section_start', data: { section } });
    await delay(300);
    const text = `[DEMO] ${section.charAt(0).toUpperCase() + section.slice(1)} section — canned replay data for demonstration purposes.`;
    appendEvent(streamId, { type: 'section_end', data: { section, text } });
    sections[section] = text;
    await delay(200);
  }

  if (session) session.lastDocumentSections = sections;
  appendEvent(streamId, { type: 'done', data: { sections } });
}

export async function startReplay(streamId, intake) {
  const fixturePath = '.sessions/demo-fixture.jsonl';
  if (existsSync(fixturePath)) {
    await playFixture(streamId, fixturePath);
  } else {
    await playCanned(streamId);
  }
}

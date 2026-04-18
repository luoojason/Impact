import { validate } from '../citationValidator.js';

const SECTIONS = ['brief', 'risks', 'roadmap', 'regulatory', 'financial', 'funders'];

const SECTION_HEADERS = {
  brief: 'Investment Brief',
  risks: 'Second-Order Risks',
  roadmap: 'Roadmap',
  regulatory: 'Regulatory Landscape',
  financial: 'Financial Analysis',
  funders: 'Potential Funders',
};

function assembleMarkdown(input, session) {
  const parts = SECTIONS.map(s => `## ${SECTION_HEADERS[s]}\n${input[s] ?? ''}`);

  const citations = input.citations ?? [];
  const sourceLines = citations.map(c => {
    const entry = session.toolResults?.get(c.tool_use_id);
    const name = entry?.name ?? c.tool_use_id;
    const url = entry?.url ?? entry?.data?.url ?? 'local';
    return `- **${c.claim}** — ${name} (${url}) [${c.tool_use_id}]`;
  });

  parts.push(`## Sources\n${sourceLines.join('\n')}`);
  return parts.join('\n\n');
}

export async function handler(input, context = {}) {
  const { session, emit } = context;

  const validation = validate(input, session);
  if (!validation.ok) {
    return validation;
  }

  for (const section of SECTIONS) {
    if (emit) {
      emit({ type: 'section_start', data: { section } });
      emit({ type: 'section_end', data: { section, text: input[section] ?? '' } });
    }
  }

  const sections = {};
  for (const s of SECTIONS) {
    sections[s] = input[s] ?? '';
  }

  if (session) {
    session.lastDocumentSections = sections;
  }

  const markdown = assembleMarkdown(input, session ?? {});

  return {
    ok: true,
    data: { markdown, sections_accepted: true },
    source: 'ImpactGrid citation-validated',
    url: 'local',
  };
}

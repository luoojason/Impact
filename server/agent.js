import Anthropic from '@anthropic-ai/sdk';
import { schemas } from './tools/index.js';
import { registry } from './tools/index.js';
import SYSTEM_PROMPT from './systemPrompt.js';
import { appendEvent, getSession } from './sessions.js';
import { globalLimit, hostLimiterFor } from './tools/pLimit.js';

const anthropic = new Anthropic();

const SYNTHESIS_SCHEMA = schemas.filter(s => s.name === 'generate_document');
const DATA_SCHEMAS     = schemas.filter(s => s.name !== 'generate_document');

// Switch to synthesis-only mode after this many data-tool calls
const SYNTHESIS_TRIGGER_CALLS = 10;

function formatIntake(intake) {
  return [
    `Company: ${intake.companyName || 'N/A'}`,
    intake.companyDesc         ? `Description: ${intake.companyDesc}`          : null,
    intake.investmentFocus?.length
      ? `Investment Focus: ${intake.investmentFocus.join(', ')}`                : null,
    intake.geoFocus            ? `Geographic Focus: ${intake.geoFocus}`        : null,
    (intake.projectSizeMin || intake.projectSizeMax)
      ? `Project Size: $${intake.projectSizeMin || '?'} – $${intake.projectSizeMax || '?'} USD` : null,
    intake.horizonYears        ? `Investment Horizon: ${intake.horizonYears} years` : null,
    intake.riskTolerance       ? `Risk Tolerance: ${intake.riskTolerance}`     : null,
    intake.specificRegions     ? `Specific Regions: ${intake.specificRegions}` : null,
    intake.existingPortfolio   ? `Existing Portfolio:\n${intake.existingPortfolio}` : null,
  ].filter(Boolean).join('\n');
}

function truncate(str, maxLen) {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + `...[truncated ${str.length - maxLen} chars]`;
}

function summarize(result) {
  if (!result.ok) return { ok: false, reason: result.reason };
  const data = result.data;
  if (!data) return { ok: true };
  const keys = Object.keys(data);
  const preview = keys.slice(0, 3).map(k => {
    const v = data[k];
    const s = typeof v === 'string' ? v : JSON.stringify(v);
    return `${k}: ${s.slice(0, 40)}`;
  }).join('; ');
  return { ok: true, preview: preview.slice(0, 120) };
}

function withTimeout(promise, ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ ok: false, reason: 'timeout' }), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); resolve({ ok: false, reason: 'exception', message: e.message }); }
    );
  });
}

export async function runAgent(streamId, intake) {
  const emit = (evt) => appendEvent(streamId, evt);

  try {
    const messages = [{ role: 'user', content: formatIntake(intake) }];
    let dataCallsUsed = 0;
    let totalIter = 0;
    const MAX_ITERS = 20;
    const gLimit = globalLimit(3);

    while (totalIter < MAX_ITERS) {
      const inSynthesisPhase = dataCallsUsed >= SYNTHESIS_TRIGGER_CALLS;
      const availableSchemas = inSynthesisPhase ? SYNTHESIS_SCHEMA : schemas;

      const resp = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        tools: availableSchemas,
        messages,
      });

      emit({ type: 'iter', data: { iter: totalIter, stop_reason: resp.stop_reason, phase: inSynthesisPhase ? 'synthesis' : 'data' } });

      // Handle max_tokens mid-stream
      if (resp.stop_reason === 'max_tokens') {
        messages.push({ role: 'assistant', content: resp.content });
        messages.push({ role: 'user', content: [{ type: 'text', text: 'Continue.' }] });
        totalIter++;
        continue;
      }

      const toolUses = resp.content.filter(b => b.type === 'tool_use');

      // Model finished without tool calls — check if document was already generated
      if (resp.stop_reason === 'end_turn' && toolUses.length === 0) {
        const session = getSession(streamId);
        if (session?.lastDocumentSections) {
          emit({ type: 'done', data: { sections: session.lastDocumentSections, pins: session.lastDocumentPins ?? [] } });
        } else {
          // Force one more synthesis call
          messages.push({ role: 'assistant', content: resp.content });
          messages.push({ role: 'user', content: [{ type: 'text', text: 'Call generate_document now with all six sections using the data you have collected.' }] });
          totalIter++;
          continue;
        }
        break;
      }

      // Execute tool calls
      const toolResults = await Promise.all(toolUses.map(tu => {
        const toolUrl = `https://${tu.name}.impactgrid`;
        const hLimit = hostLimiterFor(toolUrl);
        return gLimit.run(() => hLimit.run(async () => {
          emit({ type: 'tool_call_start', data: { id: tu.id, name: tu.name, input: tu.input } });

          const entry = registry[tu.name];
          let result;
          if (!entry) {
            result = { ok: false, reason: 'unknown_tool' };
          } else {
            const isGenerateDoc = tu.name === 'generate_document';
            const session = getSession(streamId);
            const ctx = isGenerateDoc ? { session, emit: (evt) => appendEvent(streamId, evt) } : undefined;
            const timeout = tu.name === 'get_conflict_data' ? 12000 : 10000;
            result = await withTimeout(entry.handler(tu.input, ctx), timeout);
          }

          if (tu.name !== 'generate_document') dataCallsUsed++;

          const session = getSession(streamId);
          if (session) session.toolResults.set(tu.id, { name: tu.name, ...result });

          emit({ type: 'tool_call_end', data: { id: tu.id, name: tu.name, ok: result.ok, summary: summarize(result) } });

          const contentStr = result.ok
            ? truncate(JSON.stringify(result), 2000)
            : `[TOOL ERROR: reason=${result.reason}]`;

          return { type: 'tool_result', tool_use_id: tu.id, content: contentStr };
        }));
      }));

      // Check if generate_document was just called successfully
      const session = getSession(streamId);
      if (session?.lastDocumentSections) {
        emit({ type: 'done', data: { sections: session.lastDocumentSections, pins: session.lastDocumentPins ?? [] } });
        break;
      }

      // Build next user message — include synthesis nudge when transitioning
      const nextContent = [...toolResults];
      const nowInSynthesis = dataCallsUsed >= SYNTHESIS_TRIGGER_CALLS;
      if (nowInSynthesis && !inSynthesisPhase) {
        nextContent.push({
          type: 'text',
          text: 'Data gathering complete. You must now call generate_document with all six sections. No further data tools are available.',
        });
      }

      messages.push({ role: 'assistant', content: resp.content });
      messages.push({ role: 'user', content: nextContent });

      totalIter++;
    }

    // Final safety check
    const session = getSession(streamId);
    if (session?.lastDocumentSections) {
      emit({ type: 'done', data: { sections: session.lastDocumentSections, pins: session.lastDocumentPins ?? [] } });
    } else {
      emit({ type: 'error', data: { where: 'budget', message: 'Analysis timed out. Please try again with a single country.' } });
    }
  } catch (e) {
    appendEvent(streamId, { type: 'error', data: { where: 'runAgent', message: e.message } });
  }
}

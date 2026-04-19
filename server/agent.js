import Anthropic from '@anthropic-ai/sdk';
import { schemas } from './tools/index.js';
import { registry } from './tools/index.js';
import SYSTEM_PROMPT from './systemPrompt.js';
import { appendEvent, getSession } from './sessions.js';
import { globalLimit, hostLimiterFor } from './tools/pLimit.js';

const anthropic = new Anthropic();

const ALL_SCHEMAS      = schemas;
const SYNTHESIS_SCHEMA = schemas.filter(s => s.name === 'generate_document');

// Switch to forced synthesis after this many data-tool calls
const SYNTHESIS_TRIGGER_CALLS = 10;

function formatIntake(intake) {
  return [
    `Company: ${intake.companyName || 'N/A'}`,
    intake.companyDesc       ? `Description: ${intake.companyDesc}`                    : null,
    intake.investmentFocus?.length
      ? `Investment Focus: ${intake.investmentFocus.join(', ')}`                       : null,
    intake.geoFocus          ? `Geographic Focus: ${intake.geoFocus}`                 : null,
    (intake.projectSizeMin || intake.projectSizeMax)
      ? `Project Size: $${intake.projectSizeMin || '?'} – $${intake.projectSizeMax || '?'} USD` : null,
    intake.horizonYears      ? `Investment Horizon: ${intake.horizonYears} years`     : null,
    intake.riskTolerance     ? `Risk Tolerance: ${intake.riskTolerance}`              : null,
    intake.specificRegions   ? `Specific Regions: ${intake.specificRegions}`          : null,
    intake.existingPortfolio ? `Existing Portfolio:\n${intake.existingPortfolio}`     : null,
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

      // In synthesis phase: only offer generate_document and force its use
      const tools      = inSynthesisPhase ? SYNTHESIS_SCHEMA : ALL_SCHEMAS;
      const toolChoice = inSynthesisPhase
        ? { type: 'tool', name: 'generate_document' }
        : { type: 'auto' };

      // Keep session alive during long Claude calls (pings every 20s)
      const keepAlive = setInterval(
        () => appendEvent(streamId, { type: 'iter', data: { ping: true } }),
        20000
      );

      let resp;
      try {
        resp = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 16000,
          system: SYSTEM_PROMPT,
          tools,
          tool_choice: toolChoice,
          messages,
        });
      } finally {
        clearInterval(keepAlive);
      }

      emit({ type: 'iter', data: { iter: totalIter, stop_reason: resp.stop_reason, phase: inSynthesisPhase ? 'synthesis' : 'data' } });

      // Handle token limit mid-stream
      if (resp.stop_reason === 'max_tokens') {
        messages.push({ role: 'assistant', content: resp.content });
        messages.push({ role: 'user', content: [{ type: 'text', text: 'Continue.' }] });
        totalIter++;
        continue;
      }

      const toolUses = resp.content.filter(b => b.type === 'tool_use');

      // No tool calls — nudge if document not yet produced
      if (toolUses.length === 0) {
        const session = getSession(streamId);
        if (session?.lastDocumentSections) {
          emit({ type: 'done', data: { sections: session.lastDocumentSections, pins: session.lastDocumentPins ?? [] } });
          return;
        }
        messages.push({ role: 'assistant', content: resp.content });
        messages.push({ role: 'user', content: [{ type: 'text', text: 'Call generate_document now with all six sections using the data you have collected.' }] });
        totalIter++;
        continue;
      }

      // Execute all tool calls in parallel
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
            const timeout = isGenerateDoc ? 60000 : 20000;
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

      // If generate_document just ran, emit done and stop
      const session = getSession(streamId);
      if (session?.lastDocumentSections) {
        emit({ type: 'done', data: { sections: session.lastDocumentSections, pins: session.lastDocumentPins ?? [] } });
        return;
      }

      // Build next message, nudging toward synthesis when threshold just crossed
      const nextContent = [...toolResults];
      if (dataCallsUsed >= SYNTHESIS_TRIGGER_CALLS && !inSynthesisPhase) {
        nextContent.push({
          type: 'text',
          text: 'All data gathered. You must now call generate_document with all six sections populated.',
        });
      }

      messages.push({ role: 'assistant', content: resp.content });
      messages.push({ role: 'user', content: nextContent });
      totalIter++;
    }

    // Fallback after MAX_ITERS
    const session = getSession(streamId);
    if (session?.lastDocumentSections) {
      emit({ type: 'done', data: { sections: session.lastDocumentSections, pins: session.lastDocumentPins ?? [] } });
    } else {
      emit({ type: 'error', data: { where: 'budget', message: 'Analysis did not complete in time. Please try again.' } });
    }
  } catch (e) {
    appendEvent(streamId, { type: 'error', data: { where: 'runAgent', message: e.message } });
  }
}

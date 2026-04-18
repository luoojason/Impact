import Anthropic from '@anthropic-ai/sdk';
import { schemas } from './tools/index.js';
import { registry } from './tools/index.js';
import SYSTEM_PROMPT from './systemPrompt.js';
import { appendEvent, getSession } from './sessions.js';
import { globalLimit, hostLimiterFor } from './tools/pLimit.js';

const anthropic = new Anthropic();

function formatIntake(intake) {
  const lines = [
    `Company: ${intake.companyName || 'N/A'}`,
    intake.companyDesc ? `Description: ${intake.companyDesc}` : null,
    intake.investmentFocus ? `Investment Focus: ${Array.isArray(intake.investmentFocus) ? intake.investmentFocus.join(', ') : intake.investmentFocus}` : null,
    intake.geoFocus ? `Geographic Focus: ${intake.geoFocus}` : null,
    (intake.projectSizeMin || intake.projectSizeMax) ? `Project Size: $${intake.projectSizeMin || '?'} – $${intake.projectSizeMax || '?'} USD` : null,
    intake.horizonYears ? `Investment Horizon: ${intake.horizonYears} years` : null,
    intake.riskTolerance ? `Risk Tolerance: ${intake.riskTolerance}` : null,
    intake.specificRegions ? `Specific Regions: ${intake.specificRegions}` : null,
    intake.existingPortfolio ? `Existing Portfolio:\n${intake.existingPortfolio}` : null,
  ].filter(Boolean);
  return lines.join('\n');
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
    const budget = { callsUsed: 0, maxCalls: 12, iter: 0, maxIters: 6 };
    const gLimit = globalLimit(3);

    while (budget.iter < budget.maxIters) {
      const resp = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: schemas,
        messages,
      });

      emit({ type: 'iter', data: { iter: budget.iter, stop_reason: resp.stop_reason } });

      if (resp.stop_reason === 'max_tokens') {
        emit({ type: 'error', data: { where: 'messages.create', message: 'max_tokens' } });
        messages.push({ role: 'assistant', content: resp.content });
        messages.push({ role: 'user', content: [{ type: 'text', text: 'Continue.' }] });
        budget.iter++;
        continue;
      }

      const toolUses = resp.content.filter(b => b.type === 'tool_use');

      if (resp.stop_reason === 'end_turn' && toolUses.length === 0) {
        const session = getSession(streamId);
        if (session && session.lastDocumentSections) {
          emit({ type: 'done', data: { sections: session.lastDocumentSections } });
        } else {
          emit({ type: 'error', data: { where: 'final', message: 'ended without generate_document' } });
        }
        break;
      }

      const allowed = toolUses.slice(0, budget.maxCalls - budget.callsUsed);

      const toolResults = await Promise.all(allowed.map(tu => {
        const toolUrl = tu.name.includes('worldbank') || tu.name.includes('political') || tu.name.includes('energy') || tu.name.includes('comparable')
          ? 'https://api.worldbank.org'
          : `https://${tu.name}.example.com`;
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
            const ctx = isGenerateDoc
              ? { session, emit: (evt) => appendEvent(streamId, evt) }
              : undefined;
            result = await withTimeout(entry.handler(tu.input, ctx), 8000);
          }

          budget.callsUsed++;

          // Store result with tool name for Sources footer rendering
          const session = getSession(streamId);
          if (session) {
            session.toolResults.set(tu.id, { name: tu.name, ...result });
          }

          emit({ type: 'tool_call_end', data: { id: tu.id, name: tu.name, ok: result.ok, reason: result.reason, summary: summarize(result) } });

          const contentStr = result.ok
            ? truncate(JSON.stringify(result), 2000)
            : `[TOOL ERROR: reason=${result.reason}] ${truncate(JSON.stringify(result), 1800)}`;

          return { type: 'tool_result', tool_use_id: tu.id, content: contentStr };
        }));
      }));

      messages.push({ role: 'assistant', content: resp.content });
      messages.push({ role: 'user', content: toolResults });

      if (budget.callsUsed >= budget.maxCalls) break;
      budget.iter++;
    }

    // Final check: if loop exhausted without done event
    const session = getSession(streamId);
    if (session && session.lastDocumentSections) {
      emit({ type: 'done', data: { sections: session.lastDocumentSections } });
    } else if (budget.callsUsed >= budget.maxCalls || budget.iter >= budget.maxIters) {
      emit({ type: 'error', data: { where: 'budget', message: 'budget exhausted without generate_document' } });
    }
  } catch (e) {
    appendEvent(streamId, { type: 'error', data: { where: 'runAgent', message: e.message } });
  }
}

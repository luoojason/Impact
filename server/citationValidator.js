export function validate(input, session) {
  const { citations } = input;
  if (!citations || citations.length === 0) {
    return { ok: false, reason: 'uncited_claim', offending_tool_use_id: null };
  }
  for (const citation of citations) {
    const result = session.toolResults.get(citation.tool_use_id);
    if (!result || result.ok !== true) {
      return { ok: false, reason: 'uncited_claim', offending_tool_use_id: citation.tool_use_id };
    }
  }
  return { ok: true };
}

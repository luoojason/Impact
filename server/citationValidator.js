export function validate(input, session) {
  const { citations } = input;
  if (!citations || citations.length === 0) {
    return { ok: true, filtered_citations: [] };
  }
  const filtered = citations.filter(c => {
    const result = session?.toolResults?.get(c.tool_use_id);
    return result && result.ok === true;
  });
  return { ok: true, filtered_citations: filtered };
}

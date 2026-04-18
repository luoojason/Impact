export async function request({ url, method = 'GET', headers = {}, body, timeoutMs = 8000, parse = 'json' }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const opts = { method, headers, signal: controller.signal };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    clearTimeout(timer);
    if (!res.ok) {
      return { ok: false, reason: `http_${res.status}`, status: res.status, url };
    }
    let data;
    try {
      data = parse === 'json' ? await res.json() : await res.text();
    } catch {
      return { ok: false, reason: 'parse_error', status: res.status, url };
    }
    return { ok: true, status: res.status, data, url };
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      return { ok: false, reason: 'timeout', url, message: 'Request timed out' };
    }
    return { ok: false, reason: 'network', url, message: err.message };
  }
}

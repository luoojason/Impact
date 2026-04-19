import { request } from './httpClient.js';

export default async function handler({ country }) {
  if (!country) return { ok: false, reason: 'missing_country', url: null };

  const iso2 = country.trim().toUpperCase();
  const url = `https://api.worldbank.org/v2/country/${iso2}/indicator/IQ.CPA.PROT.XQ?format=json&per_page=5`;

  const result = await request({ url, timeoutMs: 8000 });
  if (!result.ok) return { ok: false, reason: result.reason ?? 'request_failed', status: result.status, url };

  const parsed = result.data;

  const dataArr = Array.isArray(parsed) && parsed.length > 1 ? parsed[1] : null;
  if (!dataArr || !Array.isArray(dataArr)) return { ok: false, reason: 'no_data', url };

  const latest = dataArr.find(entry => entry.value !== null && entry.value !== undefined);
  if (!latest) return { ok: false, reason: 'no_data', url };

  return {
    ok: true,
    data: { date: latest.date, value: latest.value, indicator: 'IQ.CPA.PROT.XQ' },
    source: 'World Bank',
    url,
  };
}

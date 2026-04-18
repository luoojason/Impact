import { request } from './httpClient.js';

export async function handler({ country }) {
  const iso3 = country.toUpperCase();
  const url = `https://api.ipcinfo.org/country?country=${iso3}&format=json`;
  const result = await request(url);

  if (!result.ok) {
    return { ok: false, reason: result.reason, message: result.message, source: 'IPC', url };
  }

  const analyses = result.data;

  if (!Array.isArray(analyses) || analyses.length === 0) {
    return { ok: false, reason: 'no_data', message: `No IPC data available for ${iso3}`, source: 'IPC', url };
  }

  const latest = analyses[0];
  const period = latest.period ?? latest.title ?? null;
  const phase_classification = latest.overall_phase ?? latest.phase ?? null;
  const pop_analyzed = latest.population_analysed ?? latest.pop_analysed ?? null;
  const pop_in_phase3_plus = latest.population_phase3_plus ?? latest.pop_phase3_plus ?? null;

  return {
    ok: true,
    data: { period, phase_classification, pop_analyzed, pop_in_phase3_plus },
    source: 'IPC',
    url,
  };
}

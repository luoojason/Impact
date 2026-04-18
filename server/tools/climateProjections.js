import { request } from './httpClient.js';

export default async function handler({ country }) {
  if (!country) return { ok: false, reason: 'missing_country', url: null };

  const iso3 = country.trim().toUpperCase();
  const primaryUrl = `https://cckpapi.worldbank.org/cckp/v1/cru-x0.5_timeseries_tas,pr_annual_mean_historical_1901-2022_mean/${iso3}`;
  const fallbackUrl = `https://climateknowledgeportal.worldbank.org/api/country-profile/timeseries?country=${iso3}&variable=tas&collection=cru`;

  let result = await request({ url: primaryUrl, timeoutMs: 8000 });

  if (!result.ok) {
    result = await request({ url: fallbackUrl, timeoutMs: 8000 });
    if (!result.ok) return { ok: false, reason: result.reason ?? 'request_failed', url: fallbackUrl };
  }

  const body = result.body;
  if (!body) return { ok: false, reason: 'no_data', url: result.url ?? primaryUrl };

  let parsed;
  try {
    parsed = typeof body === 'string' ? JSON.parse(body) : body;
  } catch {
    return { ok: false, reason: 'parse_error', url: result.url ?? primaryUrl };
  }

  const variable = parsed.variable ?? parsed.name ?? null;
  const rawValues = parsed.values ?? parsed.data ?? parsed.annual ?? [];
  const values = Array.isArray(rawValues)
    ? rawValues.map(v => ({ year: v.year ?? v.date, value: v.value ?? v.mean ?? null }))
    : [];

  if (!variable && values.length === 0) return { ok: false, reason: 'no_data', url: result.url ?? primaryUrl };

  return {
    ok: true,
    data: { variable, values },
    source: 'World Bank CCKP',
    url: result.url ?? primaryUrl,
  };
}

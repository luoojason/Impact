import { request } from './httpClient.js';

export default async function handler({ country, minmagnitude = 5, startYear = 2014 }) {
  const params = new URLSearchParams({
    format: 'geojson',
    minmagnitude: String(minmagnitude),
    starttime: `${startYear}-01-01`,
    limit: '100',
  });
  if (country) params.set('place', country);

  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?${params.toString()}`;

  const result = await request({ url, timeoutMs: 8000 });
  if (!result.ok) return { ok: false, reason: result.reason ?? 'request_failed', url };

  let parsed;
  try {
    parsed = typeof result.body === 'string' ? JSON.parse(result.body) : result.body;
  } catch {
    return { ok: false, reason: 'parse_error', url };
  }

  const features = parsed?.features ?? [];
  if (!Array.isArray(features)) return { ok: false, reason: 'no_data', url };

  const magnitudes = features.map(f => f.properties?.mag).filter(m => m != null);
  const max_mag = magnitudes.length > 0 ? Math.max(...magnitudes) : null;
  const recent = features.slice(0, 5).map(f => ({
    mag: f.properties?.mag ?? null,
    place: f.properties?.place ?? null,
    time: f.properties?.time ?? null,
  }));

  return {
    ok: true,
    data: { events: features.length, max_mag, recent },
    source: 'USGS FDSN',
    url,
  };
}

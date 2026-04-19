import { request } from './httpClient.js';

function classifyPermafrost(lat) {
  if (lat >= 60) return { zone: 'continuous', risk: 'high' };
  if (lat >= 50) return { zone: 'discontinuous', risk: 'medium' };
  if (lat >= 40) return { zone: 'sporadic', risk: 'low' };
  return { zone: 'none', risk: 'negligible' };
}

export async function handler({ country, lat, lon }) {
  let effectiveLat = lat != null ? parseFloat(lat) : null;

  if (effectiveLat == null && country) {
    const geoResult = await request({ url: `https://api.worldbank.org/v2/country/${country.trim().toUpperCase()}?format=json`, timeoutMs: 8000 });
    const info = geoResult.data?.[1]?.[0];
    effectiveLat = info?.latitude != null ? parseFloat(info.latitude) : null;
    lon = info?.longitude != null ? parseFloat(info.longitude) : lon;
  }

  if (effectiveLat == null) {
    return { ok: false, reason: 'missing_key', message: 'lat/lon or country required' };
  }

  const { zone, risk } = classifyPermafrost(effectiveLat);

  return {
    ok: true,
    data: {
      permafrost_zone: zone,
      permafrost_risk: risk,
      note: 'Latitude-based classification: ≥60°N continuous, ≥50°N discontinuous, ≥40°N sporadic',
      lat: effectiveLat,
      lon: lon ?? null,
    },
    source: 'Latitude-based permafrost classification',
    url: null,
  };
}

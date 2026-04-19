import { request } from './httpClient.js';

export default async function handler({ country }) {
  if (!country) return { ok: false, reason: 'missing_country', url: null };

  const iso3 = country.trim().toUpperCase();

  const geoResult = await request({ url: `https://api.worldbank.org/v2/country/${iso3}?format=json`, timeoutMs: 8000 });
  if (!geoResult.ok) return { ok: false, reason: 'geocode_failed', status: geoResult.status, url: geoResult.url };

  const countryInfo = geoResult.data?.[1]?.[0];
  const lat = parseFloat(countryInfo?.latitude);
  const lon = parseFloat(countryInfo?.longitude);
  if (!lat || !lon) return { ok: false, reason: 'no_centroid', url: geoResult.url };

  const url = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=T2M,PRECTOTCORR&community=AG&longitude=${lon}&latitude=${lat}&format=JSON`;
  const result = await request({ url, timeoutMs: 12000 });
  if (!result.ok) return { ok: false, reason: result.reason ?? 'request_failed', status: result.status, url };

  const params = result.data?.properties?.parameter;
  if (!params) return { ok: false, reason: 'no_data', url };

  return {
    ok: true,
    data: {
      mean_temp_c: params.T2M?.ANN ?? null,
      mean_precip_mm: params.PRECTOTCORR?.ANN ?? null,
      monthly_temp_c: params.T2M ?? null,
      monthly_precip_mm: params.PRECTOTCORR ?? null,
      lat,
      lon,
    },
    source: 'NASA POWER Climatology',
    url,
  };
}

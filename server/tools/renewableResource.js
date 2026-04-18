import { request } from './httpClient.js';

export default async function handler({ lat, lon }) {
  if (lat == null || lon == null) return { ok: false, reason: 'missing_lat_lon', url: null };

  const params = new URLSearchParams({
    parameters: 'ALLSKY_SFC_SW_DWN,WS50M',
    community: 'RE',
    longitude: String(lon),
    latitude: String(lat),
    format: 'JSON',
  });
  const url = `https://power.larc.nasa.gov/api/temporal/climatology/point?${params.toString()}`;

  const result = await request({ url, timeoutMs: 8000 });
  if (!result.ok) return { ok: false, reason: result.reason ?? 'request_failed', url };

  let parsed;
  try {
    parsed = typeof result.body === 'string' ? JSON.parse(result.body) : result.body;
  } catch {
    return { ok: false, reason: 'parse_error', url };
  }

  const props = parsed?.properties?.parameter ?? parsed?.features?.[0]?.properties?.parameter ?? null;
  if (!props) return { ok: false, reason: 'no_data', url };

  const ghiValues = props.ALLSKY_SFC_SW_DWN ?? {};
  const windValues = props.WS50M ?? {};

  const annualGhi = ghiValues.ANN ?? null;
  const annualWind = windValues.ANN ?? null;

  if (annualGhi == null && annualWind == null) return { ok: false, reason: 'no_data', url };

  return {
    ok: true,
    data: {
      ghi_kwh_m2_day: annualGhi,
      wind_speed_50m_ms: annualWind,
    },
    source: 'NASA POWER',
    url,
  };
}

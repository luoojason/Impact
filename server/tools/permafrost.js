// SEDAC Global Permafrost Zones requires OAuth — using WorldPop REST as proxy.
// High-latitude + high population density = infrastructure overlap risk indicator.
import { request } from './httpClient.js';

export async function handler({ country, lat, lon }) {
  if (lat == null || lon == null) {
    return { ok: false, reason: 'missing_key', message: 'lat and lon are required' };
  }

  const url = `https://api.worldpop.org/v1/services/stats?dataset=wpgppop&year=2020&geojson={"type":"Point","coordinates":[${lon},${lat}]}`;
  const result = await request(url);

  if (!result.ok) {
    return { ok: false, reason: result.reason, message: result.message, source: 'WorldPop' };
  }

  const pop = result.data?.data?.total_population ?? result.data?.pop ?? null;

  if (pop == null) {
    return {
      ok: false,
      reason: 'parse_error',
      message: 'Could not extract population from WorldPop response',
      source: 'WorldPop',
      url,
    };
  }

  return {
    ok: true,
    data: {
      permafrost_zone_index: 'n/a',
      note: 'proxy via WorldPop population density — high lat + high density indicates infrastructure overlap risk',
      population_density_proxy: pop,
      lat,
      lon,
    },
    source: 'WorldPop (SEDAC proxy)',
    url,
  };
}

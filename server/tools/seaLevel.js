// NASA Sea Level Change Portal API is undocumented and frequently unavailable outside browser contexts.
// This is a known data gap for the MVP — returning ok:false with explanation when unavailable.
import { request } from './httpClient.js';

export async function handler({ country, lat, lon }) {
  const url = 'https://sealevel.nasa.gov/api/v1/chart';
  const result = await request(url);

  if (!result.ok) {
    return {
      ok: false,
      reason: 'unavailable',
      message: 'NASA sea-level API is undocumented; this is a known data gap for the MVP',
      source: 'NASA Sea Level Change Portal',
      url,
    };
  }

  return {
    ok: true,
    data: result.data,
    source: 'NASA Sea Level Change Portal',
    url,
  };
}

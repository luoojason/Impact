import iso3166 from './iso3166.json';

const aliasToIso3 = new Map();
const iso3ToIso2 = new Map();

for (const entry of iso3166) {
  const iso3 = entry.alpha3 || entry.iso3;
  const iso2 = entry.alpha2 || entry.iso2;
  if (!iso3) continue;

  const names = [
    entry.name,
    entry.common_name,
    iso3,
    iso2,
    ...(entry.aliases || []),
  ].filter(Boolean);

  for (const n of names) {
    aliasToIso3.set(n.toLowerCase().trim(), iso3.toUpperCase());
  }

  if (iso2) {
    iso3ToIso2.set(iso3.toUpperCase(), iso2.toUpperCase());
  }
}

export function nameToIso3(name) {
  if (!name) return null;
  return aliasToIso3.get(name.toLowerCase().trim()) || null;
}

export function nameToIso2(name) {
  const iso3 = nameToIso3(name);
  if (!iso3) return null;
  return iso3ToIso2.get(iso3) || null;
}

export function findFeature(geojson, iso3) {
  if (!geojson || !geojson.features) return null;
  const target = iso3.toUpperCase();
  return geojson.features.find((f) => {
    const p = f.properties || {};
    return (
      p.ISO_A3 === target ||
      p.ISO_A3_EH === target ||
      p.ADM0_A3 === target
    );
  }) || null;
}

export function bboxOfFeature(feature) {
  if (!feature || !feature.geometry) return null;
  const coords = [];

  function collect(arr) {
    if (!Array.isArray(arr)) return;
    if (typeof arr[0] === 'number') {
      coords.push(arr);
    } else {
      arr.forEach(collect);
    }
  }

  collect(feature.geometry.coordinates);
  if (!coords.length) return null;

  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  return [[minLat, minLng], [maxLat, maxLng]];
}

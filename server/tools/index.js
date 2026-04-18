import climate from './climateProjections.js';
import { handler as permafrost } from './permafrost.js';
import seismic from './seismicHazard.js';
import renewable from './renewableResource.js';
import political from './politicalRisk.js';
import energy from './energyAccess.js';
import { handler as conflict } from './conflictData.js';
import { handler as deforestation } from './deforestation.js';
import { handler as food } from './foodInsecurity.js';
import { handler as seaLevel } from './seaLevel.js';
import comparable from './comparableProjects.js';
import { handler as generateDocument } from './generateDocument.js';

export { schemas } from '../toolSchemas.js';

export const registry = {
  get_climate_projections: {
    handler: (input) => climate({
      country: input.country_iso3,
      variable: input.variable,
      scenario: input.scenario,
    }),
  },
  get_permafrost_data: {
    handler: (input) => permafrost({
      country: input.country_iso3,
      lat: input.latitude,
      lon: input.longitude,
    }),
  },
  get_seismic_hazard: {
    handler: (input) => seismic({
      country: input.country_iso2,
      // schema start_date/end_date not used by handler which takes startYear int
      startYear: input.start_date ? new Date(input.start_date).getFullYear() : undefined,
    }),
  },
  get_renewable_resource_potential: {
    handler: (input) => renewable({
      lat: input.latitude,
      lon: input.longitude,
    }),
  },
  get_political_risk: {
    handler: (input) => political({
      country: input.country_iso2,
    }),
  },
  get_energy_access_gap: {
    handler: (input) => energy({
      country: input.country_iso2,
    }),
  },
  get_conflict_data: {
    handler: (input) => conflict({
      country: input.country_name,
    }),
  },
  get_deforestation_data: {
    handler: (input) => deforestation({
      country: input.country_iso3,
    }),
  },
  get_food_insecurity_data: {
    handler: (input) => food({
      country: input.country_iso3,
    }),
  },
  get_sea_level_projections: {
    handler: (input) => seaLevel({
      country: input.country_iso3,
      lat: input.latitude,
      lon: input.longitude,
    }),
  },
  get_comparable_projects: {
    handler: (input) => comparable({
      country: input.country_iso2,
      rows: input.rows,
    }),
  },
  generate_document: {
    handler: (input, ctx) => generateDocument(input, ctx),
  },
};

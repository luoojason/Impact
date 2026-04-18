export const schemas = [
  {
    name: 'get_climate_projections',
    description: 'Fetch mean annual temperature and precipitation projections for a country from the World Bank Climate Knowledge Portal.',
    input_schema: {
      type: 'object',
      properties: {
        country_iso3: { type: 'string', description: 'ISO 3166-1 alpha-3 country code (e.g. KEN, NGA)' },
        variable: { type: 'string', enum: ['tas', 'pr'], description: 'tas=temperature, pr=precipitation' },
        scenario: { type: 'string', enum: ['rcp45', 'rcp85'], description: 'Emissions scenario' }
      },
      required: ['country_iso3', 'variable']
    }
  },
  {
    name: 'get_permafrost_data',
    description: 'Fetch population and land area statistics relevant to permafrost or ground stability for a country via WorldPop.',
    input_schema: {
      type: 'object',
      properties: {
        country_iso3: { type: 'string', description: 'ISO 3166-1 alpha-3 country code' }
      },
      required: ['country_iso3']
    }
  },
  {
    name: 'get_seismic_hazard',
    description: 'Fetch recent seismic events (magnitude >= 5) for a country from the USGS earthquake catalog.',
    input_schema: {
      type: 'object',
      properties: {
        country_iso2: { type: 'string', description: 'ISO 3166-1 alpha-2 country code (e.g. KE, NG)' },
        start_date: { type: 'string', description: 'Start date YYYY-MM-DD (default: 5 years ago)' },
        end_date: { type: 'string', description: 'End date YYYY-MM-DD (default: today)' }
      },
      required: ['country_iso2']
    }
  },
  {
    name: 'get_renewable_resource_potential',
    description: 'Fetch solar irradiance and wind speed climatology for a country location via NASA POWER.',
    input_schema: {
      type: 'object',
      properties: {
        latitude: { type: 'number', description: 'Latitude of the project site' },
        longitude: { type: 'number', description: 'Longitude of the project site' },
        country_iso3: { type: 'string', description: 'ISO 3166-1 alpha-3 country code (used for labeling)' }
      },
      required: ['latitude', 'longitude', 'country_iso3']
    }
  },
  {
    name: 'get_political_risk',
    description: 'Fetch World Bank Worldwide Governance Indicators — Political Stability and Absence of Violence index for a country.',
    input_schema: {
      type: 'object',
      properties: {
        country_iso2: { type: 'string', description: 'ISO 3166-1 alpha-2 country code' }
      },
      required: ['country_iso2']
    }
  },
  {
    name: 'get_energy_access_gap',
    description: 'Fetch electricity access rate (% of population) from the World Bank for a country.',
    input_schema: {
      type: 'object',
      properties: {
        country_iso2: { type: 'string', description: 'ISO 3166-1 alpha-2 country code' }
      },
      required: ['country_iso2']
    }
  },
  {
    name: 'get_conflict_data',
    description: 'Fetch recent armed conflict events for a country from ACLED. Requires ACLED_API_KEY and ACLED_EMAIL env vars.',
    input_schema: {
      type: 'object',
      properties: {
        country_name: { type: 'string', description: 'Country name as recognized by ACLED (e.g. Kenya, Nigeria)' },
        start_date: { type: 'string', description: 'Start date YYYY-MM-DD' },
        end_date: { type: 'string', description: 'End date YYYY-MM-DD' }
      },
      required: ['country_name']
    }
  },
  {
    name: 'get_deforestation_data',
    description: 'Fetch tree cover loss data for a country from Global Forest Watch. Requires GFW_API_KEY env var.',
    input_schema: {
      type: 'object',
      properties: {
        country_iso3: { type: 'string', description: 'ISO 3166-1 alpha-3 country code' },
        start_year: { type: 'integer', description: 'Start year (e.g. 2015)' },
        end_year: { type: 'integer', description: 'End year (e.g. 2023)' }
      },
      required: ['country_iso3']
    }
  },
  {
    name: 'get_food_insecurity_data',
    description: 'Fetch IPC food insecurity classification data for a country.',
    input_schema: {
      type: 'object',
      properties: {
        country_iso3: { type: 'string', description: 'ISO 3166-1 alpha-3 country code' }
      },
      required: ['country_iso3']
    }
  },
  {
    name: 'get_sea_level_projections',
    description: 'Fetch sea level rise projections for a coastal location from NASA Sea Level Change Portal.',
    input_schema: {
      type: 'object',
      properties: {
        latitude: { type: 'number', description: 'Latitude of the coastal site' },
        longitude: { type: 'number', description: 'Longitude of the coastal site' },
        country_iso3: { type: 'string', description: 'ISO 3166-1 alpha-3 country code (for labeling)' }
      },
      required: ['latitude', 'longitude', 'country_iso3']
    }
  },
  {
    name: 'get_comparable_projects',
    description: 'Fetch comparable World Bank energy projects for a country.',
    input_schema: {
      type: 'object',
      properties: {
        country_iso2: { type: 'string', description: 'ISO 3166-1 alpha-2 country code' },
        rows: { type: 'integer', description: 'Number of results to return (default 10, max 20)' }
      },
      required: ['country_iso2']
    }
  },
  {
    name: 'generate_document',
    description: 'Generate the final structured investment analysis document. MUST be called as the last step after gathering data. Every claim must be backed by a citation referencing a successful tool_use_id from this session.',
    input_schema: {
      type: 'object',
      properties: {
        brief: { type: 'string', description: 'INVESTMENT BRIEF section text' },
        risks: { type: 'string', description: 'SECOND-ORDER RISKS section text' },
        roadmap: { type: 'string', description: 'IMPLEMENTATION ROADMAP section text' },
        regulatory: { type: 'string', description: 'REGULATORY PATHWAY section text' },
        financial: { type: 'string', description: 'FINANCIAL MODEL INPUTS section text' },
        funders: { type: 'string', description: 'FUNDER MATCHING section text' },
        citations: {
          type: 'array',
          description: 'List of citations linking claims to tool calls',
          items: {
            type: 'object',
            properties: {
              claim: { type: 'string', description: 'The specific claim being cited' },
              tool_use_id: { type: 'string', description: 'The tool_use_id of the tool call that supports this claim' }
            },
            required: ['claim', 'tool_use_id']
          },
          minItems: 1
        }
      },
      required: ['brief', 'risks', 'roadmap', 'regulatory', 'financial', 'funders', 'citations']
    }
  }
];

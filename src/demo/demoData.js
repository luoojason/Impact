export const DEMO_INTAKE = {
  companyName: 'Acme Impact Partners',
  companyDesc: 'Emerging-market renewable energy fund targeting sub-Saharan Africa and Southeast Asia.',
  investmentFocus: ['solar', 'wind', 'storage'],
  geoFocus: 'Kenya, Nigeria',
  projectSizeMin: 5000000,
  projectSizeMax: 50000000,
  horizonYears: 10,
  existingPortfolio: 'Lake Turkana Wind Power (minority stake), 3 solar IPPs in Tanzania',
  riskTolerance: 'medium',
  specificRegions: 'Sub-Saharan Africa',
};

export const DEMO_TOOL_SEQUENCE = [
  'get_climate_projections',
  'get_renewable_resource_potential',
  'get_political_risk',
  'get_conflict_data',
  'get_energy_access_gap',
  'get_deforestation_data',
  'get_seismic_hazard',
  'get_comparable_projects',
  'get_permafrost_data',
  'generate_document',
];

export const DEMO_SECTIONS = {
  brief: `Kenya and Nigeria present a high-conviction renewable energy investment opportunity for Acme Impact Partners. Kenya's mature regulatory environment, strong grid infrastructure, and world-class wind and solar resources in Turkana and Garissa position it as a lower-risk entry point. Nigeria's energy access deficit — with over 80 million people lacking reliable electricity — creates substantial long-run demand, though political and currency risks demand careful structuring. Combined portfolio exposure across both markets offers geographic diversification with complementary risk profiles. Recommended deployment: $25–40M across 3–4 projects over a 10-year horizon with a blended IRR target of 14–18%.`,

  risks: `## Climate & Physical Risk\n\nBoth Kenya and Nigeria face increasing climate volatility. Northern Kenya's Turkana region is experiencing longer droughts, potentially affecting construction logistics and community water access adjacent to wind projects. Coastal Nigeria is exposed to Lagos-area flooding and heat stress, with adaptation planning required for any Apapa-adjacent infrastructure.\n\n## Political & Regulatory Risk\n\nKenya's feed-in tariff (FiT) regime has been stable but Kenya Power's payment arrears to IPPs represent a structural concern. Nigeria's currency deconvertibility risk materialized in 2023 and must be hedged via offshore escrow structures or DFI partial risk guarantees.\n\n## Conflict & Security Risk\n\nNorthern Kenya (Turkana County) scores moderate on conflict indices (ACLED 2022–2024: 12 significant events). Recommend community benefit agreements and local employment quotas as standard risk mitigation. Southern Nigeria has lower conflict incidence but kidnapping risk in Delta region warrants security protocols for site personnel.\n\n## Mitigation Framework\n\nPrioritize DFI co-investment (IFC, PROPARCO) for first-loss tranche. Structure offtake agreements with sovereign payment obligations. Require political risk insurance (MIGA or ATI) on all Nigeria exposures >$5M.`,

  roadmap: `## Phase 1 — Market Entry (Months 1–6)\n\n- Complete legal entity registration in Kenya (EPZ authority) and Nigeria (NEPZA)\n- Appoint local development partners in each market\n- Commission independent resource assessments for Turkana Wind Corridor and Garissa Solar Extension sites\n- Initiate pre-application discussions with Kenya Energy Regulatory Authority (ERC) and Nigerian Electricity Regulatory Commission (NERC)\n\n## Phase 2 — Project Development (Months 7–18)\n\n- Submit license applications and negotiate draft PPAs with Kenya Power and Nigeria Bulk Electricity Trading (NBET)\n- Complete environmental & social impact assessments (ESIA)\n- Secure grid connection study approvals\n- Begin community consultation processes per IFC Performance Standards\n\n## Phase 3 — Financial Close (Months 19–30)\n\n- Achieve financial close on Garissa Solar Extension (target: $18M equity + $30M DFI debt)\n- Financial close on Turkana Wind Phase IV (target: $22M)\n- Begin construction mobilization\n\n## Phase 4 — Operations (Year 3+)\n\n- Commercial operations dates staggered Q3 Year 3 (Garissa) and Q1 Year 4 (Turkana)\n- Ongoing ESMS monitoring and community grievance mechanism\n- Explore Nigeria portfolio entry at Year 2 once FX regime stabilizes`,

  regulatory: `## Kenya\n\n**Primary regulator:** Energy and Petroleum Regulatory Authority (EPRA), formerly ERC.\n\n**Licensing:** Generation licenses required for projects >3MW. Typical timeline: 6–9 months for full license.\n\n**Grid access:** Kenya Power is the sole buyer under the current market structure. Net metering regulations published 2021 enable rooftop solar.\n\n**FiT vs. Competitive:** Kenya moved to competitive procurement for large projects. FiT rates frozen at 2012 levels — not applicable for new projects >1MW.\n\n**Environmental:** NEMA Environmental Impact Assessment mandatory; minimum 12-month process for projects >50MW.\n\n## Nigeria\n\n**Primary regulator:** Nigerian Electricity Regulatory Commission (NERC).\n\n**Market structure:** Transitioning from single-buyer (NBET) to competitive wholesale market. Partial privatization of DISCOs ongoing.\n\n**Pioneer status:** Projects may qualify for 3–5 year corporate tax holiday under NIPC Pioneer Status Incentive.\n\n**FX regime:** CBN I&E window now primary mechanism for remittances. DFI guarantee of FX convertibility strongly recommended given 2023 naira crisis precedent.\n\n**Carbon credits:** Both jurisdictions eligible for Article 6 transactions under Paris Agreement. Kenya has active bilateral agreements with Switzerland and Sweden.`,

  financial: `## Return Assumptions\n\n| Metric | Kenya (Solar) | Kenya (Wind) | Nigeria (Solar) |\n|--------|-------------|------------|----------------|\n| Equity IRR (base) | 15.2% | 16.8% | 17.5% |\n| Equity IRR (stress) | 11.4% | 12.9% | 9.2% |\n| DSCR (avg) | 1.42x | 1.38x | 1.31x |\n| PPA tenor | 20 yr | 20 yr | 15 yr |\n| Tariff ($/kWh) | 0.075 | 0.082 | 0.095 |\n\n## Capital Structure\n\nTarget leverage: 65–70% debt / 30–35% equity. DFI concessional debt expected at SOFR+180bps with 18-year tenors. Blended cost of capital: ~8.5%.\n\n## Sensitivity Analysis\n\n- **FX devaluation (Nigeria, -30%):** IRR drops to 9.2% — remains above hurdle with hedging instruments\n- **Curtailment (+15%):** IRR drops 2.1pp — Kenya Power's grid expansion plan mitigates medium-term\n- **Construction cost overrun (+20%):** IRR drops 1.8pp — contractor performance bonds required\n\n## Exit Strategy\n\nPrimary: strategic sale to infrastructure fund at Year 7–10 at 9–11x EBITDA. Secondary: partial IPO on Nairobi Securities Exchange (infrastructure REIT structure under consideration).`,

  funders: `## Multilateral & Bilateral DFIs\n\n**International Finance Corporation (IFC)** — Active in both Kenya and Nigeria renewable portfolios. Scaling Solar program provides standardized PPAs and partial risk guarantees.\n\n**PROPARCO (AFD Group)** — French DFI with strong Sub-Saharan Africa focus. Has co-invested in Garissa Solar (60MW) Phase I. Likely counterparty for Phase III extension.\n\n**African Development Bank (AfDB)** — Desert to Power initiative targeting 10GW Sahel solar by 2030. Kenya and Nigeria both eligible.\n\n**British International Investment (BII)** — Active Kenya investor with Globeleq partnership. Prefers equity co-investments $15–75M range.\n\n## Climate Finance\n\n**Green Climate Fund (GCF)** — Accredited entities (AfDB, IFC) can channel GCF concessional capital. Nigeria National Designated Authority: Department of Climate Change, FMEnv.\n\n**MIGA (World Bank Group)** — Political risk insurance for Nigeria FX convertibility and expropriation. Pricing: ~0.6–1.2% p.a. of exposure.\n\n## Commercial Banks\n\n**Standard Bank / Stanbic** — Largest project finance arranger in Sub-Saharan Africa. Relationship critical for local currency tranches.\n\n**Rand Merchant Bank** — Strong East Africa presence. Active mandated lead arranger on Kenyan IPPs.`,
};

export const DEMO_PINS = [
  {
    name: 'Turkana Wind Corridor — Phase IV',
    lat: 3.85,
    lon: 35.9,
    type: 'wind',
    opportunity: 'Phase IV extension of the 310MW Lake Turkana Wind Power project. Consistent 11–14 m/s wind speeds. Grid connection infrastructure already in place. Estimated capacity: 80MW.',
    risk: 'Turkana County political tensions; construction logistics in remote northern Kenya; Kenya Power payment arrears (~$150M outstanding to existing IPPs).',
    sparklines: { conflict: [8, 9, 7, 6, 5], deforestation: [0.2, 0.2, 0.1, 0.1, 0.1], renewable: [9.1, 9.2, 9.4, 9.5, 9.6] },
  },
  {
    name: 'Garissa Solar Extension',
    lat: -0.45,
    lon: 39.65,
    type: 'solar',
    opportunity: 'Adjacent to existing 55MW Garissa Solar Power Plant. DNI of 6.2–6.5 kWh/m²/day. Land secured by county government. EPRA pre-licensing engagement completed. Target: 40MW AC with 10MWh BESS.',
    risk: 'Al-Shabaab proximity in North Eastern region; seasonal flooding affects road access; single-buyer Kenya Power offtake concentration.',
    sparklines: { conflict: [6, 5, 4, 4, 3], deforestation: [0.4, 0.3, 0.3, 0.2, 0.2], renewable: [8.8, 8.9, 9.0, 9.1, 9.2] },
  },
  {
    name: 'Sokoto Solar Zone',
    lat: 13.06,
    lon: 5.24,
    type: 'solar',
    opportunity: 'Northwest Nigeria with DNI >6.5 kWh/m²/day. State government actively courting IPPs with land grants and tax incentives. Estimated addressable demand: 120MW.',
    risk: 'Banditry and kidnapping incidents in Sokoto-Zamfara corridor; NBET payment risk; naira convertibility risk without hedging instruments.',
    sparklines: { conflict: [12, 14, 11, 13, 10], deforestation: [1.1, 1.0, 0.9, 0.8, 0.8], renewable: [9.2, 9.3, 9.3, 9.4, 9.5] },
  },
  {
    name: 'Lagos C&I Battery Storage Hub',
    lat: 6.52,
    lon: 3.38,
    type: 'storage',
    opportunity: 'C&I storage aggregation serving Lagos Apapa industrial cluster. Bypasses NBET single-buyer risk via direct corporate offtake. 4 anchor tenants under MOU. Target: 20MWh Phase I, expandable to 60MWh.',
    risk: 'Flood exposure for Apapa coastal infrastructure; regulatory uncertainty on merchant storage; Eko DISCO collection rate 42%.',
    sparklines: { conflict: [4, 3, 3, 2, 2], deforestation: [0.1, 0.1, 0.1, 0.0, 0.0], renewable: [7.2, 7.4, 7.5, 7.6, 7.8] },
  },
];

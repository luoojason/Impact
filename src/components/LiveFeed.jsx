import { useState, useEffect } from 'react';
import styles from './LiveFeed.module.css';

const NAME_TO_DESC = {
  get_climate_projections: 'Climate projection data from World Bank',
  get_permafrost_data: 'Permafrost extent via WorldPop / NASA SEDAC',
  get_seismic_hazard: 'Seismic hazard data from USGS + GEM',
  get_renewable_resource_potential: 'Renewable resource potential (GSA/GWA + NASA)',
  get_political_risk: 'Political risk indicators from World Bank',
  get_energy_access_gap: 'Energy access gap (World Bank EG.ELC.ACCS.ZS)',
  get_conflict_data: 'Conflict events from ACLED',
  get_deforestation_data: 'Tree cover loss from Global Forest Watch',
  get_food_insecurity_data: 'Food insecurity data from IPC',
  get_sea_level_projections: 'Sea level projections from NASA',
  get_comparable_projects: 'Comparable projects from World Bank API',
  generate_document: 'Generating structured investment document',
};

export default function LiveFeed({ events }) {
  return (
    <div className={styles.feed}>
      <div className={styles.heading}>Live Tool Calls</div>
      <div className={styles.list}>
        {events.map((ev) => (
          <Tile key={ev.id} event={ev} />
        ))}
      </div>
    </div>
  );
}

function Tile({ event }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const desc = NAME_TO_DESC[event.name] || event.name;
  const isPending = event.ok === undefined;
  const isOk = event.ok === true;

  return (
    <div className={`${styles.tile} ${visible ? styles.visible : ''}`}>
      <div className={styles.tileTop}>
        <span className={styles.toolName}>{event.name}</span>
        {isPending && <span className={styles.spinner} />}
        {!isPending && isOk && <span className={styles.check}>✓</span>}
        {!isPending && !isOk && <span className={styles.fail}>!</span>}
      </div>
      <div className={styles.tileDesc}>{desc}</div>
    </div>
  );
}

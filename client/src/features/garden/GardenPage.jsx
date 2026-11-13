import { useEffect, useState } from 'react';
import Button from '../../shared/Button.jsx';
import ScreenHeader from '../../shared/ScreenHeader.jsx';
import { getSampleData } from '../../shared/sampleData.js';
import styles from './styles.module.css';

function isValidGreenhouse(greenhouse) {
  const garden = greenhouse && greenhouse.myGarden;
  return (
    garden &&
    Number.isFinite(garden.streakDays) &&
    Number.isFinite(garden.points) &&
    Number.isFinite(garden.grownPercent) &&
    Number.isFinite(greenhouse.crewTreePercent) &&
    Number.isFinite(greenhouse.harvestInDays) &&
    Array.isArray(greenhouse.plants) &&
    greenhouse.plants.every(
      (plant) =>
        typeof plant.name === 'string' &&
        typeof plant.detail === 'string' &&
        Number.isFinite(plant.percent),
    )
  );
}

function PlantDome({ plants }) {
  const sizes = plants.map((plant) => 0.78 + Math.max(0, Math.min(100, plant.percent)) / 300);
  const transform = (x, index) =>
    `translate(${x} 180) scale(${sizes[index]}) translate(${-x} -180)`;

  return (
    <div className={styles.domeWrap}>
      <svg className={styles.dome} viewBox="0 0 360 218" aria-hidden="true">
        <path className={styles.domeOutline} d="M5 180C12 82 78 15 180 15s168 67 175 165" />
        <g className={styles.stars}>
          <circle cx="80" cy="82" r="1.5" />
          <circle cx="135" cy="48" r="1.5" />
          <circle cx="260" cy="55" r="1.5" />
          <circle cx="300" cy="93" r="1.5" />
        </g>
        <g transform={transform(36, 0)}>
          <path className={styles.stem} d="M36 180v-54m0 32c-11-3-15-9-17-16m17 7c9-3 13-8 15-14" />
          <circle className={styles.flower} cx="36" cy="120" r="8" />
          <circle className={styles.flowerCenter} cx="36" cy="120" r="3" />
        </g>
        <g transform={transform(108, 1)}>
          <path className={styles.stem} d="M108 180V97m0 58c-14-4-20-11-22-20m22 8c13-4 18-10 21-18m-21 8c-11-3-16-9-18-16m18-4c10-3 14-8 16-15" />
        </g>
        <g transform={transform(180, 2)}>
          <path className={styles.stem} d="M180 180V75m0 71c-16-4-22-12-25-22m25 10c15-4 21-11 24-21m-24 0c-12-4-17-10-19-18m19-1c11-4 16-10 18-19" />
          <path className={styles.leafPrimary} d="M180 93c-10-3-14-9-16-17 9 1 14 6 16 17m0 19c10-3 14-9 16-17-9 1-14 6-16 17" />
        </g>
        <g transform={transform(252, 3)}>
          <path className={styles.stem} d="M252 180v-85m0 60c-13-4-18-10-21-19m21 9c12-4 17-10 19-18" />
          <g className={styles.flower}>
            <circle cx="252" cy="82" r="8" />
            <circle cx="239" cy="82" r="6" />
            <circle cx="265" cy="82" r="6" />
            <circle cx="252" cy="69" r="6" />
            <circle cx="252" cy="95" r="6" />
            <circle cx="243" cy="73" r="5" />
            <circle cx="261" cy="73" r="5" />
            <circle cx="243" cy="91" r="5" />
            <circle cx="261" cy="91" r="5" />
          </g>
          <circle className={styles.flowerCenter} cx="252" cy="82" r="4" />
        </g>
        <g transform={transform(324, 4)}>
          <path className={styles.trunk} d="M324 180V80m0 48-15-15m15 2 15-17m-15 38-15-12m15 5 15-14" />
          <g className={styles.canopy}>
            <circle cx="324" cy="69" r="22" />
            <circle cx="309" cy="80" r="16" />
            <circle cx="339" cy="82" r="16" />
            <circle cx="324" cy="54" r="15" />
          </g>
        </g>
        <path className={styles.soil} d="M0 180h360v38H0z" />
        {plants.map((plant, index) => (
          <text key={plant.name} className={styles.plantLabel} x={36 + index * 72} y="203">
            {plant.name}
          </text>
        ))}
      </svg>
    </div>
  );
}

export default function GardenPage() {
  const [greenhouse, setGreenhouse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;

    getSampleData('reaction-tests')
      .then((data) => {
        if (!active) return;
        if (!isValidGreenhouse(data.crewGreenhouse)) {
          throw new Error('The garden data is incomplete. Please try again.');
        }
        setGreenhouse(data.crewGreenhouse);
      })
      .catch((problem) => {
        if (active) {
          setError(problem instanceof Error ? problem.message : 'Please try again.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [retry]);

  const plants = greenhouse ? greenhouse.plants : [];
  function retryGarden() {
    setError('');
    setLoading(true);
    setRetry((value) => value + 1);
  }

  return (
    <main className={styles.page}>
      <ScreenHeader backTo="/" backLabel="Home" eyebrow="Plants grow with your habits" title="Your habitat garden" />

      {loading && <p className={styles.message} role="status">Growing your garden…</p>}

      {!loading && error && (
        <section className={styles.message} aria-labelledby="garden-error-title">
          <h2 id="garden-error-title">Your garden could not load</h2>
          <p role="alert">{error}</p>
          <Button variant="secondary" onClick={retryGarden}>Try again</Button>
        </section>
      )}

      {!loading && !error && plants.length === 0 && (
        <section className={styles.message} aria-labelledby="garden-empty-title">
          <h2 id="garden-empty-title">Your habitat is ready to grow</h2>
          <p>Check in to grow your first plants.</p>
          <Button to="/checkin">Start a check-in</Button>
        </section>
      )}

      {!loading && !error && plants.length > 0 && greenhouse && (
        <>
          <PlantDome plants={plants} />

          <section className={styles.stats} aria-label="Your garden stats">
            <div className={styles.stat}>
              <strong>{greenhouse.myGarden.streakDays}</strong>
              <span>day streak</span>
            </div>
            <div className={styles.stat}>
              <strong>{greenhouse.myGarden.points}</strong>
              <span>points</span>
            </div>
            <div className={styles.stat}>
              <strong>{greenhouse.myGarden.grownPercent}%</strong>
              <span>grown</span>
            </div>
          </section>

          <section className={styles.habits} aria-label="Habit progress">
            {plants.map((plant) => {
              const percent = Math.max(0, Math.min(100, plant.percent));
              const thirsty = percent < 50;
              return (
                <div className={styles.habit} key={plant.name}>
                  <div className={styles.habitHeading}>
                    <span><strong>{plant.name}</strong> · {plant.detail}</span>
                    <span className={thirsty ? styles.lowStatus : styles.growingStatus}>
                      {percent}%{thirsty ? ' · thirsty' : ''}
                    </span>
                  </div>
                  <div
                    className={styles.progress}
                    role="progressbar"
                    aria-label={`${plant.name} habit progress`}
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-valuenow={percent}
                    aria-valuetext={`${percent}%${thirsty ? ', thirsty' : ', growing'}`}
                  >
                    <span className={thirsty ? styles.progressLow : styles.progressFill} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </section>

          <section className={styles.greenhouse} aria-label="Crew greenhouse">
            <svg className={styles.greenhouseIcon} viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 21V11m0 4c-4 0-6-2-7-5 4 0 6 2 7 5Zm0-3c0-4 2-6 5-7 0 4-2 6-5 7Z" />
            </svg>
            <div className={styles.greenhouseCopy}>
              <strong>Crew greenhouse</strong>
              <span>
                Crew tree {greenhouse.crewTreePercent}% · harvest in {greenhouse.harvestInDays} days
              </span>
            </div>
            <Button to="/checkin/game" variant="secondary">
              Play Pollen catch
            </Button>
          </section>
        </>
      )}
    </main>
  );
}

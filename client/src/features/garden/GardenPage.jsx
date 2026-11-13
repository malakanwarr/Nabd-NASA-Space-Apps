import { useEffect, useState } from 'react';
import Button from '../../shared/Button.jsx';
import ScreenHeader from '../../shared/ScreenHeader.jsx';
import { apiFetch } from '../../shared/api.js';
import { getSampleData } from '../../shared/sampleData.js';
import { useSession } from '../../shared/session.js';
import { careNote, crewTree, droopAngle, isWilting, livePlants } from '../health/gardenModel.js';
import { readEntries } from '../health/storage.js';
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

// A plant that runs low turns grey, leans over, and drops dead leaves that fall and lie on the soil.
function DeadLeaves({ x, top, seed }) {
  const leaf = 'M0 0c4-3 8-1 9 3-4 2-8 1-9-3z';
  return (
    <g aria-hidden="true">
      <ellipse className={styles.groundLeaf} cx={x - 14} cy="177" rx="7" ry="2.6" transform={`rotate(-12 ${x - 14} 177)`} />
      <ellipse className={styles.groundLeaf} cx={x + 12} cy="178" rx="6" ry="2.4" transform={`rotate(14 ${x + 12} 178)`} />
      <g transform={`translate(${x - 8} ${top})`}>
        <path className={styles.fallingLeaf} style={{ animationDelay: `${seed * 0.9}s` }} d={leaf} />
      </g>
      <g transform={`translate(${x + 10} ${top + 8})`}>
        <path className={styles.fallingLeaf} style={{ animationDelay: `${seed * 0.9 + 3.5}s` }} d={leaf} />
      </g>
    </g>
  );
}

const PLANT_X = [36, 108, 180, 252, 324];
const PLANT_TOP = [120, 94, 72, 82, 66];

function PlantDome({ plants }) {
  const sizes = plants.map((plant) => 0.78 + Math.max(0, Math.min(100, plant.percent)) / 300);
  // A plant that runs low leans over and fades; the lean alternates sides so the dome looks natural.
  const plantProps = (x, index) => ({
    transform: `translate(${x} 180) rotate(${droopAngle(plants[index].percent) * (index % 2 ? -1 : 1)}) scale(${sizes[index]}) translate(${-x} -180)`,
    opacity: isWilting(plants[index].percent) ? 0.75 : 1,
    className: isWilting(plants[index].percent) ? styles.dying : undefined,
  });

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
        <g {...plantProps(36, 0)}>
          <path className={styles.stem} d="M36 180v-54m0 32c-11-3-15-9-17-16m17 7c9-3 13-8 15-14" />
          <circle className={styles.flower} cx="36" cy="120" r="8" />
          <circle className={styles.flowerCenter} cx="36" cy="120" r="3" />
        </g>
        <g {...plantProps(108, 1)}>
          <path className={styles.stem} d="M108 180V97m0 58c-14-4-20-11-22-20m22 8c13-4 18-10 21-18m-21 8c-11-3-16-9-18-16m18-4c10-3 14-8 16-15" />
        </g>
        <g {...plantProps(180, 2)}>
          <path className={styles.stem} d="M180 180V75m0 71c-16-4-22-12-25-22m25 10c15-4 21-11 24-21m-24 0c-12-4-17-10-19-18m19-1c11-4 16-10 18-19" />
          <path className={styles.leafPrimary} d="M180 93c-10-3-14-9-16-17 9 1 14 6 16 17m0 19c10-3 14-9 16-17-9 1-14 6-16 17" />
        </g>
        <g {...plantProps(252, 3)}>
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
        <g {...plantProps(324, 4)}>
          <path className={styles.trunk} d="M324 180V80m0 48-15-15m15 2 15-17m-15 38-15-12m15 5 15-14" />
          <g className={styles.canopy}>
            <circle cx="324" cy="69" r="22" />
            <circle cx="309" cy="80" r="16" />
            <circle cx="339" cy="82" r="16" />
            <circle cx="324" cy="54" r="15" />
          </g>
        </g>
        <path className={styles.soil} d="M0 180h360v38H0z" />
        {plants.map((plant, index) =>
          isWilting(plant.percent) ? <DeadLeaves key={`dead-${plant.name}`} x={PLANT_X[index]} top={PLANT_TOP[index] + 6} seed={index} /> : null,
        )}
        {plants.map((plant, index) => (
          <text key={plant.name} className={styles.plantLabel} x={36 + index * 72} y="203">
            {plant.name}
          </text>
        ))}
      </svg>
    </div>
  );
}

// The crew's shared habitat: one tree for each crew member, with no names. Healthy trees stand on the left,
// trees that need care are on the right, so the order says nothing about who is who.
function CrewHabitat({ trees, percent, wilting }) {
  const list = (trees && trees.length > 0 ? trees : [{ percent, wilting }]).slice(0, 6);
  const single = list.length === 1;
  const lowCount = list.filter((tree) => tree.wilting).length;
  const spoken = single
    ? `Crew habitat. The crew tree is at ${percent} percent${wilting ? ' and needs care' : ' and is growing'}.`
    : `Crew habitat with ${list.length} trees. ${lowCount === 0 ? 'All are growing.' : `${lowCount} need care.`}`;
  const positionOf = (index) => (single ? 180 : 68 + index * (224 / (list.length - 1)));
  const place = (tree, index) => {
    const x = positionOf(index);
    const scale = (0.8 + Math.max(0, Math.min(100, tree.percent)) / 300) * (single ? 1.05 : 0.82);
    const angle = tree.wilting ? 16 * (index % 2 ? -1 : 1) : 0;
    return { x, transform: `translate(${x} 180) rotate(${angle}) scale(${scale}) translate(${-x} -180)` };
  };

  return (
    <div className={styles.domeWrap}>
      <svg className={styles.dome} viewBox="0 0 360 218" role="img" aria-label={spoken}>
        <path className={styles.domeOutline} d="M5 180C12 82 78 15 180 15s168 67 175 165" />
        <g className={styles.stars}>
          <circle cx="80" cy="82" r="1.5" />
          <circle cx="135" cy="48" r="1.5" />
          <circle cx="260" cy="55" r="1.5" />
          <circle cx="300" cy="93" r="1.5" />
        </g>
        {list.map((tree, index) => {
          const { x, transform } = place(tree, index);
          return (
            <g key={`tree-${index}`} transform={transform} opacity={tree.wilting ? 0.8 : 1} className={tree.wilting ? styles.dying : undefined}>
              <path className={styles.trunk} d={`M${x} 180V80m0 48-15-15m15 2 15-17m-15 38-15-12m15 5 15-14`} />
              <g className={styles.canopy}>
                <circle cx={x} cy="69" r="22" />
                <circle cx={x - 15} cy="80" r="16" />
                <circle cx={x + 15} cy="82" r="16" />
                <circle cx={x} cy="54" r="15" />
              </g>
            </g>
          );
        })}
        <path className={styles.soil} d="M0 180h360v38H0z" />
        {list.map((tree, index) => (tree.wilting ? <DeadLeaves key={`dead-${index}`} x={positionOf(index)} top={78} seed={index} /> : null))}
        <text className={styles.plantLabel} x="180" y="203" textAnchor="middle">
          {single ? 'Crew tree' : 'Crew trees'}
        </text>
      </svg>
    </div>
  );
}

export default function GardenPage() {
  const session = useSession();
  const [greenhouse, setGreenhouse] = useState(null);
  const [tree, setTree] = useState(null); // the crew tree, from crew totals only
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;

    getSampleData('reaction-tests')
      .then(async (data) => {
        if (!active) return;
        if (!isValidGreenhouse(data.crewGreenhouse)) {
          throw new Error('The garden data is incomplete. Please try again.');
        }
        // Her plants follow today's real habits and scores, and the crew tree follows the crew's totals.
        // If any of that cannot be loaded, the sample garden is shown as it was.
        const crewId = session?.id;
        const [today, baseline, history, checkins, crew] = await Promise.allSettled([
          getSampleData('today'),
          getSampleData('baseline'),
          getSampleData('history-14-days'),
          apiFetch(`/api/mood?crewId=${encodeURIComponent(crewId || '')}`),
          apiFetch('/api/crew'),
        ]);
        if (!active) return;
        let plants = data.crewGreenhouse.plants;
        if (today.status === 'fulfilled' && baseline.status === 'fulfilled' && history.status === 'fulfilled') {
          const list = checkins.status === 'fulfilled' && Array.isArray(checkins.value) ? checkins.value : [];
          plants = livePlants({
            today: today.value,
            baseline: baseline.value,
            history: history.value.days || [],
            reactionTests: data,
            checkin: list.find((c) => c.missionDay === today.value.missionDay) ?? null,
            sleepEntries: readEntries('sleep', crewId),
            samplePlants: data.crewGreenhouse.plants,
          });
        }
        setGreenhouse({ ...data.crewGreenhouse, plants });
        setTree(crew.status === 'fulfilled' ? crewTree(crew.value?.crew, data.crewGreenhouse.crewTreePercent) : null);
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
  }, [retry, session?.id]);

  const plants = greenhouse ? greenhouse.plants : [];
  const note = careNote(plants);
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

          {note && (
            <section className={styles.careNote} role="status" aria-label="A note about your plants">
              <p>{note.text}</p>
              {note.to && <Button variant="secondary" to={note.to}>{note.label}</Button>}
            </section>
          )}

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
              const thirsty = isWilting(percent);
              return (
                <div className={styles.habit} key={plant.name}>
                  <div className={styles.habitHeading}>
                    <span><strong>{plant.name}</strong> · {plant.detail}</span>
                    <span className={thirsty ? styles.lowStatus : styles.growingStatus}>
                      {percent}%{thirsty ? ' · drooping' : ''}
                    </span>
                  </div>
                  <div
                    className={styles.progress}
                    role="progressbar"
                    aria-label={`${plant.name} habit progress`}
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-valuenow={percent}
                    aria-valuetext={`${percent}%${thirsty ? ', drooping' : ', growing'}`}
                  >
                    <span className={thirsty ? styles.progressLow : styles.progressFill} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </section>

          <CrewHabitat trees={tree?.trees} percent={tree ? tree.percent : greenhouse.crewTreePercent} wilting={Boolean(tree?.wilting)} />

          <section className={`${styles.greenhouse} ${tree?.wilting ? styles.crewWilting : ''}`} aria-label="Crew greenhouse">
            <svg className={styles.greenhouseIcon} viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 21V11m0 4c-4 0-6-2-7-5 4 0 6 2 7 5Zm0-3c0-4 2-6 5-7 0 4-2 6-5 7Z" />
            </svg>
            <div className={styles.greenhouseCopy}>
              <strong>Crew greenhouse</strong>
              <span>
                Crew tree {tree ? tree.percent : greenhouse.crewTreePercent}% · harvest in {greenhouse.harvestInDays} days
              </span>
              {tree && (
                <span className={tree.wilting ? styles.crewNeedsCare : styles.crewGrowing}>
                  {tree.wilting ? 'Needs care. ' : 'Growing. '}
                  {tree.message}
                </span>
              )}
            </div>
            <Button to="/checkin/game" state={{ cancelTo: '/' }} variant="secondary">
              Play Pollen catch
            </Button>
          </section>
        </>
      )}
    </main>
  );
}

// What each body system page says (owner: Hana Haytham). Design: BodyDetail.dc.html.
// Fixed text is general knowledge. Every number about Sara is read from the data files passed in as `d`:
//   d = { system, today, baseline, mission, reaction, history }
// numbers(d) -> rows for "Your numbers": { label, value, warn }   (warn = shown in the status color)
// today(d)   -> the numbered steps for "What to do today"
// chart      -> which field of history-14-days.json to draw, compared with baseline(d)

// NASA HRP's five hazards of spaceflight.
export const HAZARDS = {
  gravity: 'changing gravity fields',
  radiation: 'space radiation',
  isolation: 'isolation and confinement',
  distance: 'distance from Earth',
  environment: 'hostile and closed environments',
};

const bp = (v) => `${v.systolic}/${v.diastolic}`;

export const SYSTEM_INFO = {
  bones: {
    area: 'Hips, spine and legs',
    hazard: 'gravity',
    what: 'Your bones hold you up and store calcium; your muscles move you and protect your joints. On Earth, gravity keeps both strong every time you stand or walk.',
    why: 'Without weight to carry, your body stops maintaining bone and muscle. Weight-bearing bones like the hip lose mineral density month after month unless you exercise against resistance.',
    numbers: ({ system, today }) => [
      { label: 'Hip bone loss since launch', value: `${system.hipBoneLossSinceLaunchPct.toFixed(1)}%`, warn: true },
      { label: 'Leg muscle loss', value: `${system.legMuscleLossSinceLaunchPct.toFixed(1)}%`, warn: true },
      { label: 'Resistance workouts this week', value: `${today.workoutsThisWeek.hoursDone} of ${today.workoutsThisWeek.hoursPlanned} h` },
    ],
    chart: { field: 'workoutMinutes', label: 'Workout minutes per day', unit: 'min', baselineLabel: 'Plan', baseline: ({ mission }) => Math.round((mission.schedule.workoutPlanHoursPerWeek * 60) / 7) },
    today: ({ today }) => [
      'Resistance device: squats and heel raises load the hips and legs',
      `Take today's vitamin D dose: ${today.vitaminDThisWeek.taken} of ${today.vitaminDThisWeek.planned} this week`,
      `Choose calcium-rich meals and keep drinking: ${today.waterTodayLiters} of ${today.waterTargetLiters} L so far`,
    ],
    helpNow: 'if you feel sudden bone pain after a load, cannot put weight on a leg, or have back pain with numbness.',
  },
  mind: {
    area: 'Mood, focus and sleep',
    hazard: 'isolation',
    what: 'Your brain sets your mood, focus and reaction time. Sleep is when it clears out the day and recovers.',
    why: 'Noise, light, stress, a small crew and days without a real sunrise make sleep shorter and lighter. Short sleep slows reaction time and lowers mood.',
    numbers: ({ today, baseline, reaction }) => {
      const done = reaction.recent.filter((r) => r.averageMs);
      const last = done[done.length - 1];
      return [
        { label: 'Sleep last night', value: `${today.sleepLastNightHours} h`, warn: today.sleepLastNightHours < baseline.sleepHours - 1 },
        { label: 'Short nights in a row', value: `${today.sleepShortNightsInARow}`, warn: today.sleepShortNightsInARow >= 3 },
        { label: `Reaction test (usual ${reaction.usualMs} ms)`, value: `${last.averageMs} ms`, warn: last.averageMs > reaction.usualMs + 5 },
      ];
    },
    chart: { field: 'sleepHours', label: 'Sleep per night', unit: 'h', baselineLabel: 'Usual', baseline: ({ baseline }) => baseline.sleepHours },
    today: ({ mission }) => [
      `Start winding down at ${mission.schedule.windDown}: warm lights, no screens`,
      'Play the reaction test: it takes 3 minutes',
      'Do a mood check-in, and talk to a crewmate or your family if you feel low',
    ],
    helpNow: 'if you feel hopeless, unable to cope, or have any thoughts of harming yourself.',
  },
  kidneys: {
    area: 'Kidneys and fluids',
    hazard: 'gravity',
    what: 'Your kidneys clean your blood and balance water and salt.',
    why: 'In space, bone loss releases calcium into the urine and many astronauts drink less, so kidney stones become more likely.',
    numbers: ({ today }) => [
      { label: 'Water today', value: `${today.waterTodayLiters} of ${today.waterTargetLiters} L`, warn: today.waterTodayLiters < today.waterTargetLiters },
      { label: 'Symptoms reported today', value: today.symptomsReportedToday.length ? `${today.symptomsReportedToday.length}` : 'None' },
    ],
    chart: { field: 'waterLiters', label: 'Water per day', unit: 'L', baselineLabel: 'Target', baseline: ({ baseline }) => baseline.waterLitersTarget },
    today: ({ today }) => [
      `Drink a glass now: ${today.waterTodayLiters} of ${today.waterTargetLiters} L so far`,
      'Keep a bottle with you and check your urine is pale yellow',
      'Log your water so the target bar fills up',
    ],
    helpNow: 'if you have severe side or back pain, blood in your urine, fever or vomiting.',
  },
  heart: {
    area: 'Heart and blood vessels',
    hazard: 'gravity',
    what: 'Your heart pumps blood and oxygen to your whole body.',
    why: 'Without gravity, fluid shifts toward your head and your heart works less, so it can lose fitness. Standing up after landing can make you faint.',
    numbers: ({ system, today, baseline }) => [
      { label: `Blood pressure (usual ${bp(baseline.bloodPressure)})`, value: bp(today.vitals.bloodPressure) },
      { label: `Resting heart rate (usual ${baseline.restingHeartRateBpm})`, value: `${today.vitals.heartRateBpm} bpm` },
      ...(system.aerobicFitnessChangePct != null ? [{ label: 'Aerobic fitness since launch', value: `${system.aerobicFitnessChangePct}%`, warn: system.aerobicFitnessChangePct <= -10 }] : []),
    ],
    chart: { field: 'restingHeartRateBpm', label: 'Resting heart rate', unit: 'bpm', baselineLabel: 'Usual', baseline: ({ baseline }) => baseline.restingHeartRateBpm },
    today: () => ['Keep up your cardio session on the bike or treadmill', 'Measure your blood pressure at the usual time'],
    helpNow: 'if you have chest pain, faint, or feel a very fast or irregular heartbeat.',
  },
  eyes: {
    area: 'Eyes and optic nerve',
    hazard: 'gravity',
    what: 'Your eyes and the nerve behind them carry everything you see to your brain.',
    why: 'Fluid shifting toward the head can press on the back of the eye. NASA calls this SANS. It can slowly change vision over months.',
    numbers: ({ system }) => [
      { label: 'Latest check', value: system.headline },
      { label: 'Next', value: system.detail },
    ],
    chart: null,
    today: () => ['Use the vision grid and note any change', 'Keep your scheduled eye scan'],
    helpNow: 'if your vision changes suddenly, or you have eye pain or an eye injury.',
  },
  immune: {
    area: 'Immune system and skin',
    hazard: 'environment',
    what: 'Your immune system and skin protect you from germs.',
    why: 'Spaceflight changes how the immune system works, and germs spread easily in a closed cabin. Old viruses can wake up again.',
    numbers: ({ today, baseline }) => [
      { label: `Temperature (usual ${baseline.temperatureC} °C)`, value: `${today.vitals.temperatureC} °C` },
      { label: 'Oxygen', value: `${today.vitals.spo2Pct}%` },
      { label: 'Symptoms reported today', value: today.symptomsReportedToday.length ? `${today.symptomsReportedToday.length}` : 'None' },
    ],
    chart: { field: 'temperatureC', label: 'Body temperature', unit: '°C', baselineLabel: 'Usual', baseline: ({ baseline }) => baseline.temperatureC },
    today: () => ['Wash your hands before meals', 'Take your weekly skin photo when it is due'],
    helpNow: 'if you have a fever above 38.5 °C, or a fever with a rash or stiff neck.',
  },
  radiation: {
    area: 'Whole-body dose',
    hazard: 'radiation',
    what: 'Radiation is energy from the Sun and deep space that passes through the ship and your body.',
    why: "Outside Earth's magnetic field, radiation raises long-term cancer risk. Solar storms can make it spike for hours.",
    numbers: ({ today }) => {
      const r = today.radiation;
      return [
        { label: 'Career dose', value: `${r.careerDoseMSv} of ${r.careerLimitMSv} mSv` },
        { label: 'Today', value: `${r.todayMSv} mSv` },
        ...(r.forecast ? [{ label: r.forecast.alert, value: `Shelter ${r.forecast.shelterFrom}–${r.forecast.shelterTo}`, warn: true }] : []),
      ];
    },
    chart: null,
    today: ({ today }) => [
      'Wear your dosimeter all day',
      today.radiation.forecast ? `${today.radiation.forecast.text}: follow the shelter procedure from ${today.radiation.forecast.shelterFrom}` : 'Follow the shelter procedure if a storm watch starts',
    ],
    helpNow: 'if you feel sick or vomit, or your skin turns red, after a solar storm.',
  },
};

// Order: most urgent first.
export const STATUS_ORDER = { act: 0, watch: 1, stable: 2 };

// The cycle system lives on Layal's page.
export function systemLink(id) {
  return id === 'cycle' ? '/body/cycle' : `/body/${id}`;
}

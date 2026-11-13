// Builds what the AI doctor knows about the astronaut (owner: Hana Haytham).
// buildContext()      -> a short text summary of her data (prompt.md, section 2)
// buildSystemPrompt() -> the system prompt from prompt.md, section 1, with the {{...}} slots filled in
// All numbers come from the sample data files in data/, never typed here.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(here, '../../../data');
const promptFile = path.join(here, 'prompt.md');

function readData(name) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dataDir, `${name}.json`), 'utf8'));
  } catch (err) {
    console.warn(`[doctor] could not read data/${name}.json:`, err.message);
    return null;
  }
}

// Reads every file the doctor needs. Only Sara exists in the sample data, so crewId is not used yet.
export function loadCrewData(/* crewId */) {
  return {
    profile: readData('profile'),
    mission: readData('mission'),
    today: readData('today'),
    baseline: readData('baseline'),
    systems: readData('body-systems'),
    mood: readData('mood-checkins'),
    reaction: readData('reaction-tests'),
    womens: readData('womens-health'),
    kit: readData('medical-kit'),
  };
}

// Each part is wrapped so one missing or changed file drops one line instead of breaking the doctor.
function safe(fn) {
  try {
    return fn();
  } catch {
    return null;
  }
}

export function buildContext(crewId) {
  const { profile: p, mission: m, today: t, baseline: b, systems, mood, reaction, womens, kit } = loadCrewData(crewId);
  const lines = [];
  const add = (fn) => {
    const line = safe(fn);
    if (line) lines.push(line);
  };

  add(() => `Name: ${p.name}, ${p.age}, ${p.sex}, ${p.role.toLowerCase()}. Allergies: ${p.allergies.join(', ') || 'none'}.`);
  add(() => `Family history: ${p.familyHistory.map((f) => `${f.relative.toLowerCase()} ${f.condition.toLowerCase()}`).join('; ')}.`);
  add(() => `Mission day ${m.today.missionDay} of a ${m.name}, ${m.daysToMars} days to arrival. Earth delay ${m.earthDelayOneWay.text} one way.`);
  add(() => `Crew medical officer: ${m.crewMedicalOfficer}. Flight surgeon on Earth: ${m.flightSurgeonOnEarth}.`);
  add(() => {
    const v = t.vitals;
    return (
      `Today: BP ${v.bloodPressure.systolic}/${v.bloodPressure.diastolic} (baseline ${b.bloodPressure.systolic}/${b.bloodPressure.diastolic}), ` +
      `resting HR ${v.heartRateBpm} (baseline ${b.restingHeartRateBpm}), temp ${v.temperatureC} °C, SpO2 ${v.spo2Pct}%, ` +
      `blood sugar ${v.bloodSugarMgDl} mg/dL.`
    );
  });
  add(() => `Sleep ${t.sleepLastNightHours} h last night, ${t.sleepShortNightsInARow} short nights in a row (baseline ${b.sleepHours} h).`);
  add(() => `Water ${t.waterTodayLiters} of ${t.waterTargetLiters} L. Workouts ${t.workoutsThisWeek.hoursDone} of ${t.workoutsThisWeek.hoursPlanned} h this week (${t.workoutsThisWeek.percent}%). Vitamin D ${t.vitaminDThisWeek.taken} of ${t.vitaminDThisWeek.planned} doses.`);
  add(() => `Readiness ${t.readiness.score}/100, "${t.readiness.label.toLowerCase()}" (${t.readiness.reason.toLowerCase()}).`);
  add(() => {
    const watch = systems.systems.filter((s) => s.status !== 'stable' && s.id !== 'cycle');
    if (!watch.length) return 'All body systems stable.';
    return `On ${watch[0].status}: ` + watch.map((s) => `${s.name.toLowerCase()} (${s.headline}; ${s.detail})`).join(', ') + '.';
  });
  add(() => {
    const bones = systems.systems.find((s) => s.id === 'bones');
    return `Hip bone ${bones.hipBoneLossSinceLaunchPct}% lower since launch, leg muscle ${bones.legMuscleLossSinceLaunchPct}% lower.`;
  });
  add(() => {
    const list = mood.checkins;
    const last = list[list.length - 1];
    let streak = 0;
    for (let i = list.length - 1; i >= 0 && list[i].label === last.label; i--) streak++;
    const first = list[list.length - streak - 1] || list[0];
    return `Mood check-ins: ${last.label} for the last ${streak} days (energy ${first.energyScore} → ${last.energyScore}).`;
  });
  add(() => {
    const done = reaction.recent.filter((r) => r.averageMs);
    const last = done[done.length - 1];
    return `Reaction test on day ${last.missionDay}: ${last.averageMs} ms (usual ${reaction.usualMs}), ${last.lapses} lapses.`;
  });
  add(() => {
    if (womens.activeMode === 'cycle') {
      const c = womens.cycleTracking;
      return `Cycle (private): tracking natural cycle, day ${c.todayCycleDay} of ${c.averageCycleLengthDays} (${c.phaseToday} phase), next period in ${c.nextPeriodExpected.inDays} days.`;
    }
    const s = womens.periodSuppression;
    return `Cycle (private): ${s.method.toLowerCase()}, taken at ${s.doseTime}.`;
  });
  add(() => {
    const r = t.radiation;
    const storm = r.forecast ? ` ${r.forecast.text}, shelter ${r.forecast.shelterFrom}–${r.forecast.shelterTo}.` : '';
    return `Radiation: ${r.careerDoseMSv} of ${r.careerLimitMSv} mSv career dose.${storm}`;
  });
  add(() => (t.symptomsReportedToday.length ? `Symptoms already reported today: ${t.symptomsReportedToday.join(', ')}.` : null));
  add(() => {
    const meds = kit.medicines.map((x) => `- ${x.name}: for ${x.use.toLowerCase()}. Dose: ${x.labelDose}.${x.caution ? ` Caution: ${x.caution}.` : ''}`);
    return (
      'Ship medical kit (the ONLY medicines you may suggest):\n' +
      meds.join('\n') +
      `\nTests on board: ${kit.tests.join('; ')}.\nChecklists on board: ${kit.procedures.join('; ')}.`
    );
  });

  return lines.join('\n');
}

// Pulls the first ``` block under "## 1. System prompt" in prompt.md, so the team edits the prompt in one place.
function readPromptTemplate() {
  const md = fs.readFileSync(promptFile, 'utf8');
  const section = md.split(/^## 1\./m)[1] || md;
  const match = section.match(/```[a-z]*\r?\n([\s\S]*?)```/);
  if (!match) throw new Error('No system prompt code block found in doctor/prompt.md');
  return match[1].trim();
}

function delayParts(mission) {
  const d = mission?.earthDelayOneWay;
  if (!d) return { oneWay: 'about 18 minutes', roundTrip: 'about 40 minutes' };
  const total = 2 * (d.minutes * 60 + d.seconds);
  return { oneWay: d.text, roundTrip: `${Math.round(total / 60)} minutes` };
}

export function buildSystemPrompt(crewId) {
  const { profile, mission } = loadCrewData(crewId);
  const delay = delayParts(mission);
  const now = new Date();
  const values = {
    CONTEXT: buildContext(crewId),
    NAME: profile?.preferredName || profile?.name || 'the astronaut',
    EARTH_DELAY: delay.oneWay,
    ROUND_TRIP: delay.roundTrip,
    MISSION_DAY: String(mission?.today?.missionDay ?? 'unknown'),
    SHIP_TIME: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
  };
  return readPromptTemplate().replace(/\{\{(\w+)\}\}/g, (all, key) => (key in values ? values[key] : all));
}

// Name of the crew medical officer, for the emergency banner and the fallback answers.
export function getCrewMedicalOfficer(crewId) {
  return loadCrewData(crewId).mission?.crewMedicalOfficer || 'the crew medical officer';
}

// Workout mode steps (owner: Layal). Pure functions: today's workout -> a list of work and rest steps.
//   reps:      each set is { work, reps }, tempo 4 s per rep, 60 s rest between sets
//   intervals: each interval is { work, seconds }, easy recovery between (todaysWorkout.js INTERVAL_REST_SECONDS)
//   timed:     one { work, seconds } block (steady cardio, mobility, easy ride)
// 60 s rest between exercises. Demo mode (?demo=1, for filming): timed work 20 s, rests 10 s, sets of 4 reps.
// An exercise counts once at least half its sets are finished (2 of 3, 2 of 4, 4 of 8); a one-block item
// has to be finished.

export const REP_SECONDS = 4;
export const REST_SECONDS = 60;
const DEMO = { reps: 4, workSeconds: 20, restSeconds: 10 };

// What the twin does and what the voice calls it, per exercise.
const MOVE_OF = {
  aredSquat: { move: 'squat', say: 'Squats' },
  flywheelSquat: { move: 'squat', say: 'Flywheel squats' },
  aredHeelRaise: { move: 'heelRaise', say: 'Heel raises' },
  aredDeadlift: { move: 'deadlift', say: 'Deadlifts' },
  flywheelRow: { move: 'row', say: 'Rows' },
  aredBenchPress: { move: 'bench', say: 'Bench press' },
  aredBicepsCurl: { move: 'curl', say: 'Biceps curls' },
  cevisIntervals: { move: 'cycle', say: 'Cycle' },
  treadmillIntervals: { move: 'run', say: 'Treadmill' },
};

export function moveOf(item) {
  if (item.key === 'mobility') return { move: 'mobility', say: 'Mobility' };
  return MOVE_OF[item.exerciseId] || { move: 'rest', say: item.name };
}

// Seconds per loop of the twin's move.
function tempoOf(move, plan) {
  if (move === 'cycle') return plan.type === 'intervals' ? 1 : 1.6;
  if (move === 'run') return plan.type === 'intervals' ? 0.8 : 1;
  if (move === 'mobility') return 8;
  return REP_SECONDS;
}

export function setsOf(plan) {
  return plan.type === 'timed' ? 1 : plan.sets;
}

export function neededSets(plan) {
  return Math.ceil(setsOf(plan) / 2);
}

/**
 * exercises: todaysWorkout().exercises; demo: boolean.
 * Returns steps: [{ type: 'work' | 'rest', ex, set, sets, reps?, seconds?, move, tempo, say, label, easy? }]
 */
export function buildSteps(exercises, demo = false) {
  const steps = [];
  exercises.forEach((item, ex) => {
    const plan = item.plan || { type: 'timed', seconds: item.minutes * 60 };
    const { move, say } = moveOf(item);
    const sets = setsOf(plan);
    const unit = plan.type === 'intervals' ? 'Interval' : 'Set';
    for (let set = 1; set <= sets; set += 1) {
      const work = { type: 'work', ex, set, sets, move, tempo: tempoOf(move, plan), say, unit };
      if (plan.type === 'reps') work.reps = demo ? DEMO.reps : plan.reps;
      else work.seconds = demo ? DEMO.workSeconds : plan.seconds;
      steps.push(work);

      const last = set === sets && ex === exercises.length - 1;
      if (last) continue;
      if (set < sets && plan.type === 'intervals') {
        // Easy recovery between intervals: the twin keeps moving, slowly.
        steps.push({
          type: 'rest',
          ex,
          easy: true,
          seconds: demo ? DEMO.restSeconds : plan.restSeconds || REST_SECONDS,
          move,
          tempo: move === 'cycle' ? 1.8 : 1.4,
          label: move === 'cycle' ? 'Easy pedaling' : 'Easy pace',
        });
      } else {
        steps.push({ type: 'rest', ex, seconds: demo ? DEMO.restSeconds : REST_SECONDS, move: 'rest', tempo: 4, label: 'Rest' });
      }
    }
  });
  return steps;
}

export function stepSeconds(step) {
  return step.type === 'work' && step.reps ? step.reps * step.tempo : step.seconds;
}

export function totalSeconds(steps) {
  return steps.reduce((sum, st) => sum + stepSeconds(st), 0);
}

// Which exercises count: at least half their sets finished.
export function countedExercises(exercises, finishedSets) {
  return exercises
    .map((item, ex) => ({ item, ex, done: finishedSets[ex] || 0 }))
    .filter(({ item, done }) => done >= neededSets(item.plan || { type: 'timed' }));
}

// Everything that changes between measurement types (owner: Layal): texts, unit, ranges, gauge.
// The numbers come from data/measurements.json (passed in as `d`). To add blood pressure later,
// add a `bloodPressure` entry here and in server/src/routes/measurements.js, then open /measure?type=bloodPressure.

export const MEASURE_TYPES = {
  bloodSugar: {
    dataKey: 'bloodSugar',
    stepLabels: ['Why it matters', 'How to measure', 'Enter your result', 'Your result'],

    // Step 1
    whyTitle: 'Time for your blood sugar check',
    why: (d) =>
      `Less movement, stress and short sleep can push blood sugar up in space. A quick check every ${d.everyDays} days catches a change early, before you feel it.`,
    needs: [
      { what: 'Glucose meter and a test strip', where: 'Medical kit, drawer B' },
      { what: 'Lancet and an alcohol wipe', where: 'Drawer B' },
      { what: 'About 2 minutes', where: 'Before a meal is best' },
    ],

    // Step 2
    howTitle: 'How to measure',
    howSteps: [
      'Clean the side of a fingertip with the wipe and let it dry.',
      'Put a strip in the meter. Press the lancet against the side of the fingertip.',
      'Touch the strip to the drop and wait for the number.',
    ],
    tip: {
      strong: "In space the drop won't fall.",
      text: 'It stays on your finger as a little ball, so bring the strip to it.',
    },

    // Step 3
    enterTitle: 'Enter your result',
    inputLabel: 'Blood sugar',
    min: 20,
    max: 400,
    steppers: [-5, -1, 1, 5],
    fasting: { question: 'Before a meal?', yes: 'Yes, before a meal', no: 'No' },
    // Start the number at the last saved sample reading, so the steppers are close.
    startValue: (d) => {
      const last = d.readings && d.readings[d.readings.length - 1];
      return last ? last.value : Math.round((d.usualRange.low + d.usualRange.high) / 2);
    },

    // Step 4
    bandTitle: { low: 'low', normal: 'normal', high: 'a little high', veryHigh: 'high' },
    gaugeLabels: ['Low', 'Normal', 'High', 'Very high'],
    gaugeTop: { fasting: 180, notFasting: 260 }, // right end of the gauge (display only)
    usual: (d) => `Your usual: ${d.usualRange.low}–${d.usualRange.high} ${d.unit} before meals`,
    rangesNote: "General ranges for the prototype; the flight surgeon sets each crew member's own.",

    // Which band a value is in, plus the gauge layout. Same limits as the server.
    gauge(value, fasting, d) {
      const r = fasting ? d.ranges.beforeMeal : d.ranges.afterMeal;
      const top = fasting ? this.gaugeTop.fasting : this.gaugeTop.notFasting;
      const okMax = r.normalHigh + 1;
      const highMax = r.watchHigh + 1;
      let band = 'veryHigh';
      if (value < r.low) band = 'low';
      else if (value < okMax) band = 'normal';
      else if (value < highMax) band = 'high';
      return {
        band,
        segments: [r.low, okMax - r.low, highMax - okMax, Math.max(1, top - highMax)],
        position: Math.max(1, Math.min(99, (value / top) * 100)),
      };
    },
  },
};

export const DEFAULT_TYPE = 'bloodSugar';

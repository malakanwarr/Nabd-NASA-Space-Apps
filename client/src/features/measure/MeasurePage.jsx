// Take a measurement, /measure (owner: Layal). Four steps: why, how, enter the number, your result.
// Blood sugar now; the texts, ranges and unit live in measureTypes.js so blood pressure can reuse this page.
// Data: getSampleData('measurements'). Saves with POST /api/measurements -> the reading with { status, advice }.
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ScreenHeader from '../../shared/ScreenHeader.jsx';
import StepProgress from '../../shared/StepProgress.jsx';
import Button from '../../shared/Button.jsx';
import Chip from '../../shared/Chip.jsx';
import ListRow from '../../shared/ListRow.jsx';
import StatusLabel from '../../shared/StatusLabel.jsx';
import { apiFetch } from '../../shared/api.js';
import { getSampleData } from '../../shared/sampleData.js';
import { useSession } from '../../shared/session.js';
import { DEFAULT_TYPE, MEASURE_TYPES } from './measureTypes.js';
import s from './styles.module.css';

const SEGMENT_CLASS = [s.segLow, s.segNormal, s.segHigh, s.segVeryHigh];
const NEXT_LABEL = { 1: "I'm ready", 2: 'I have my number', 3: 'Save result' };

function stepperLabel(n) {
  return `${n > 0 ? 'Add' : 'Subtract'} ${Math.abs(n)}`;
}

export default function MeasurePage() {
  const session = useSession();
  const [params] = useSearchParams();
  const typeKey = MEASURE_TYPES[params.get('type')] ? params.get('type') : DEFAULT_TYPE;
  const cfg = MEASURE_TYPES[typeKey];

  const [load, setLoad] = useState({ status: 'loading', d: null, error: '' });
  const [step, setStep] = useState(1);
  const [entry, setEntry] = useState('');
  const [fasting, setFasting] = useState(true);
  const [save, setSave] = useState({ saving: false, error: '' });
  const [result, setResult] = useState(null);

  const fetchData = useCallback(() => {
    setLoad({ status: 'loading', d: null, error: '' });
    getSampleData('measurements')
      .then((all) => {
        const d = all && all[cfg.dataKey];
        if (!d) throw new Error('The measurement data is missing.');
        setLoad({ status: 'ready', d, error: '' });
        setEntry(String(cfg.startValue(d)));
      })
      .catch((err) => setLoad({ status: 'error', d: null, error: err.message }));
  }, [cfg]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (load.status !== 'ready') {
    return (
      <main className={s.page}>
        <ScreenHeader backTo="/" backLabel="Home" title="Take a measurement" />
        {load.status === 'loading' ? (
          <p className={s.muted} role="status">Loading…</p>
        ) : (
          <div className={s.stack} role="alert">
            <p className={s.error}>Could not load this measurement. {load.error}</p>
            <div>
              <Button onClick={fetchData}>Try again</Button>
            </div>
          </div>
        )}
      </main>
    );
  }

  const { d } = load;
  const value = Number(entry);
  const valid = entry.trim() !== '' && Number.isFinite(value) && value >= cfg.min && value <= cfg.max;

  function nudge(delta) {
    const base = Number.isFinite(value) && entry.trim() !== '' ? value : cfg.startValue(d);
    setEntry(String(Math.max(cfg.min, Math.min(cfg.max, Math.round(base + delta)))));
    setSave({ saving: false, error: '' });
  }

  async function saveReading() {
    if (!valid) {
      setSave({ saving: false, error: `Enter a number from ${cfg.min} to ${cfg.max}.` });
      return;
    }
    setSave({ saving: true, error: '' });
    try {
      const saved = await apiFetch('/api/measurements', {
        method: 'POST',
        body: {
          crewId: session?.id,
          type: typeKey,
          value,
          unit: d.unit,
          fasting,
          takenAt: new Date().toISOString(),
        },
      });
      setResult(saved);
      setSave({ saving: false, error: '' });
      setStep(4);
    } catch (err) {
      setSave({ saving: false, error: `Could not save. ${err.message}` });
    }
  }

  function next() {
    if (step < 3) setStep(step + 1);
    else saveReading();
  }

  function back() {
    setSave({ saving: false, error: '' });
    setStep(step - 1);
  }

  const gauge = result ? cfg.gauge(result.value, result.fasting, d) : null;
  const titles = {
    1: cfg.whyTitle,
    2: cfg.howTitle,
    3: cfg.enterTitle,
    4: result ? `${result.value} ${result.unit} · ${cfg.bandTitle[gauge.band]}` : '',
  };

  return (
    <main className={s.page}>
      <div className={s.top}>
        <ScreenHeader backTo="/" backLabel="Home" title={titles[step]} />
        <StepProgress step={step} total={4} label={cfg.stepLabels[step - 1]} />
      </div>

      {step === 1 && (
        <section className={`${s.stack} ${s.rise}`} aria-label={cfg.stepLabels[0]}>
          <p className={s.body}>{cfg.why(d)}</p>
          <div>
            <h2 className={s.h2}>You need</h2>
            {cfg.needs.map((item) => (
              <ListRow key={item.what} title={item.what} right={<span className={s.muted}>{item.where}</span>} />
            ))}
          </div>
        </section>
      )}

      {step === 2 && (
        <section className={`${s.stack} ${s.rise}`} aria-label={cfg.stepLabels[1]}>
          <ol className={s.howList}>
            {cfg.howSteps.map((text, i) => (
              <li key={text} className={s.howItem}>
                <strong className={s.howNumber} aria-hidden="true">
                  {i + 1}
                </strong>
                <span>{text}</span>
              </li>
            ))}
          </ol>
          <div className={s.tip}>
            <svg className={`${s.drop} ${s.dropIcon}`} viewBox="0 0 24 24" aria-hidden="true">
              <circle className={s.dropFill} cx="12" cy="12" r="7" />
              <circle className={s.dropShine} cx="9.5" cy="9.5" r="2" />
            </svg>
            <span className={s.tipText}>
              <strong className={s.tipStrong}>{cfg.tip.strong}</strong> {cfg.tip.text}
            </span>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className={`${s.stack} ${s.rise}`} aria-label={cfg.stepLabels[2]}>
          <label className={s.valueBox}>
            <input
              className={s.valueInput}
              type="number"
              inputMode="numeric"
              min={cfg.min}
              max={cfg.max}
              value={entry}
              onChange={(e) => {
                setEntry(e.target.value);
                setSave({ saving: false, error: '' });
              }}
              aria-label={`${cfg.inputLabel} in ${d.unit}`}
            />
            <span className={s.unit}>{d.unit}</span>
          </label>
          <div role="group" aria-label="Change the number" className={s.steppers}>
            {cfg.steppers.map((n) => (
              <button key={n} type="button" className={s.stepper} aria-label={stepperLabel(n)} onClick={() => nudge(n)}>
                {n > 0 ? `+${n}` : `−${Math.abs(n)}`}
              </button>
            ))}
          </div>
          {cfg.fasting && (
            <div className={s.stack} role="group" aria-label={cfg.fasting.question}>
              <span className={s.label}>{cfg.fasting.question}</span>
              <div className={s.chips}>
                <Chip selected={fasting} onClick={() => setFasting(true)}>
                  {cfg.fasting.yes}
                </Chip>
                <Chip selected={!fasting} onClick={() => setFasting(false)}>
                  {cfg.fasting.no}
                </Chip>
              </div>
            </div>
          )}
          {save.error && (
            <p className={s.error} role="alert">
              {save.error}
            </p>
          )}
        </section>
      )}

      {step === 4 && result && (
        <section className={`${s.stack} ${s.rise}`} aria-label={cfg.stepLabels[3]} aria-live="polite">
          <div className={s.resultHead}>
            <StatusLabel status={result.status} />
            <span className={s.muted}>{cfg.usual(d)}</span>
          </div>

          <div className={s.gauge}>
            <div
              className={s.gaugeBar}
              role="img"
              aria-label={`${result.value} ${result.unit} is ${cfg.bandTitle[gauge.band]}`}
              style={{ gridTemplateColumns: gauge.segments.map((n) => `${n}fr`).join(' ') }}
            >
              {gauge.segments.map((_, i) => (
                <span key={cfg.gaugeLabels[i]} className={SEGMENT_CLASS[i]} />
              ))}
              <span className={s.marker} style={{ left: `${gauge.position}%` }} />
            </div>
            <div className={s.gaugeLabels} aria-hidden="true">
              {cfg.gaugeLabels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </div>

          <p className={s.body}>{result.advice}</p>

          <div className={s.help}>
            <span className={s.helpTitle}>When to get help</span>
            <span className={s.helpText}>{d.whenToGetHelp}</span>
          </div>

          <span className={s.note}>{cfg.rangesNote}</span>
        </section>
      )}

      <div className={step > 1 && step < 4 ? s.actions : s.single}>
        {step > 1 && step < 4 && (
          <Button variant="secondary" onClick={back} disabled={save.saving}>
            Back
          </Button>
        )}
        {step < 4 ? (
          <Button onClick={next} disabled={save.saving} aria-busy={save.saving}>
            {save.saving ? 'Saving…' : NEXT_LABEL[step]}
          </Button>
        ) : (
          <Button to="/">Done</Button>
        )}
      </div>
    </main>
  );
}

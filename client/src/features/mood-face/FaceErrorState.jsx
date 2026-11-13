// Shown when the face check cannot run (owner: Habiba). Board 9: "We can't see your face".
// kind: 'no-face' (no face for 3 seconds) | 'blocked' (camera permission off) | 'error' (anything else).
// Nothing is saved in any of these cases.
import Button from '../../shared/Button.jsx';
import { FaceScanIcon } from './Icons.jsx';
import s from './styles.module.css';

const TEXT = {
  'no-face': {
    title: "We can't see your face",
    body: "It's too dark, or your face is out of frame. Move toward a light and hold the phone at eye level. Nothing was saved.",
    note: 'Camera blocked? Turn it on in Settings › NABD › Permissions.',
  },
  blocked: {
    title: 'The camera is turned off',
    body: "NABD can't use the camera yet. Turn it on in Settings › NABD › Permissions, then try again. Nothing was saved.",
  },
  error: {
    title: "The camera didn't start",
    body: 'Something went wrong while starting the face check. On a phone, the app needs a secure (https) link. Nothing was saved.',
  },
};

export default function FaceErrorState({ kind = 'no-face', onRetry, onVoiceOnly }) {
  const text = TEXT[kind] ?? TEXT.error;
  return (
    <section className={s.errorWrap} role="alert">
      <div className={s.errorPanel}>
        <span className={s.errorIcon}>
          <FaceScanIcon />
        </span>
        <p className={s.errorLabel}>Paused</p>
      </div>
      <h2 className={s.errorTitle}>{text.title}</h2>
      <p className={s.errorBody}>{text.body}</p>
      <div className={s.actions}>
        <Button onClick={onRetry}>Try again</Button>
        <Button variant="secondary" onClick={onVoiceOnly}>
          Continue with voice only
        </Button>
      </div>
      {text.note && <p className={s.note}>{text.note}</p>}
    </section>
  );
}

// Record page (owner: Malak). Placeholder: face and voice check-in, step 1 of 2.
import ScreenHeader from '../../shared/ScreenHeader.jsx';
import StepProgress from '../../shared/StepProgress.jsx';
import Button from '../../shared/Button.jsx';
import FaceCamera from '../mood-face/FaceCamera.jsx';
import useVoiceMetrics from './useVoiceMetrics.js';

// TODO:
//  - FaceCamera slot (Habiba's component) and call useFaceMetrics / useVoiceMetrics
//  - Read-aloud sentence
//  - Waveform
//  - "Next: Pollen catch"
export default function RecordPage() {
  const { status } = useVoiceMetrics();
  return (
    <main>
      <ScreenHeader backTo="/checkin" eyebrow="Malak" title="Record" />
      <StepProgress step={1} total={2} label="Face and voice" />
      <FaceCamera />
      <p>Voice status: {status}</p>
      <Button to="/checkin/game">Next: Pollen catch</Button>
    </main>
  );
}

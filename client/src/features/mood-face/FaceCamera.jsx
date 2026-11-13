// Camera panel (owner: Habiba). Placeholder component, used inside Malak's RecordPage.
import useFaceMetrics from './useFaceMetrics.js';
import s from './styles.module.css';

// TODO: show the camera video, call start(video) and stop(), show FaceErrorState on error.
export default function FaceCamera() {
  const { status } = useFaceMetrics();
  return (
    <div className={s.camera}>
      <p>Camera panel (Habiba). Status: {status}</p>
    </div>
  );
}

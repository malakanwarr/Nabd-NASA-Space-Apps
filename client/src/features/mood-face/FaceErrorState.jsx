// Shown when the camera or face check fails (owner: Habiba). Placeholder.
// TODO: friendly message, try again button, option to continue with voice only.
export default function FaceErrorState({ message = 'The camera is not available.' }) {
  return <p role="alert">{message}</p>;
}

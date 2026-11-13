// "Showing saved data" line (owner: Habiba). Shown by a screen when it uses the copy kept on the phone.
import s from './styles.module.css';

export default function SavedNote() {
  return (
    <p className={s.savedNote} role="status">
      No connection. Showing the data saved on your phone.
    </p>
  );
}

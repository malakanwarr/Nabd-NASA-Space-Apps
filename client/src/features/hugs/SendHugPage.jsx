// Send a hug page (owner: Hana Sakr). Placeholder: replace with the real screen.
import ScreenHeader from '../../shared/ScreenHeader.jsx';

// TODO:
//  - Hold-to-send
//  - POST /api/hugs
//  - Show "Hug sent"
export default function SendHugPage() {
  return (
    <main>
      <ScreenHeader eyebrow="Hana Sakr" title="Send a hug" />
      <p>Send a hug is a placeholder. Owner: Hana Sakr.</p>
      <p>TODO:</p>
      <ul>
        <li>Hold-to-send</li>
        <li>POST /api/hugs</li>
        <li>Show "Hug sent"</li>
      </ul>
    </main>
  );
}

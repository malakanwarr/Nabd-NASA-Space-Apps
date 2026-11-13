// Home page (owner: Hana Sakr). Placeholder: replace with the real screen.
import ScreenHeader from '../../shared/ScreenHeader.jsx';

// TODO:
//  - Heartbeat at 64 bpm
//  - Road to Mars
//  - Check-in button
//  - Readiness
//  - Needs attention
//  - For you
//  - The avatar opens /profile
export default function HomePage() {
  return (
    <main>
      <ScreenHeader eyebrow="Hana Sakr" title="Home" />
      <p>Home is a placeholder. Owner: Hana Sakr.</p>
      <p>TODO:</p>
      <ul>
        <li>Heartbeat at 64 bpm</li>
        <li>Road to Mars</li>
        <li>Check-in button</li>
        <li>Readiness</li>
        <li>Needs attention</li>
        <li>For you</li>
        <li>The avatar opens /profile</li>
      </ul>
    </main>
  );
}

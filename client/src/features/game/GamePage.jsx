// Pollen catch page (owner: Salma). Placeholder: replace with the real screen.
import ScreenHeader from '../../shared/ScreenHeader.jsx';

// TODO:
//  - Pollen catch game
//  - At the end POST /api/game, then navigate('/checkin/results', { state: { reactionMs } })
export default function GamePage() {
  return (
    <main>
      <ScreenHeader eyebrow="Salma" title="Pollen catch" />
      <p>Pollen catch is a placeholder. Owner: Salma.</p>
      <p>TODO:</p>
      <ul>
        <li>Pollen catch game</li>
        <li>At the end POST /api/game, then navigate('/checkin/results', {'{'} state: {'{'} reactionMs {'}'} {'}'})</li>
      </ul>
    </main>
  );
}

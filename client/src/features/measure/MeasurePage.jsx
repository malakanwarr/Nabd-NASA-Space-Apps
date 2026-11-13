// Take a measurement page (owner: Layal). Placeholder: replace with the real screen.
import ScreenHeader from '../../shared/ScreenHeader.jsx';

// TODO:
//  - Step 1: why and what you need
//  - Step 2: how to measure
//  - Step 3: enter the number
//  - Step 4: color-coded result
//  - POST /api/measurements
//  - Blood sugar first, reusable for blood pressure
export default function MeasurePage() {
  return (
    <main>
      <ScreenHeader eyebrow="Layal" title="Take a measurement" />
      <p>Take a measurement is a placeholder. Owner: Layal.</p>
      <p>TODO:</p>
      <ul>
        <li>Step 1: why and what you need</li>
        <li>Step 2: how to measure</li>
        <li>Step 3: enter the number</li>
        <li>Step 4: color-coded result</li>
        <li>POST /api/measurements</li>
        <li>Blood sugar first, reusable for blood pressure</li>
      </ul>
    </main>
  );
}

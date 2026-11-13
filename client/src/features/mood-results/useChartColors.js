// Chart colours (owner: Malak).
// Recharts draws with real colour strings, not CSS variables, so we read the few we need
// out of shared/theme.css at runtime. That way the chart follows dark and light mode
// instead of repeating hex colours by hand.
import { useEffect, useState } from 'react';

const WANTED = ['--primary', '--line', '--muted', '--raised', '--stable', '--watch', '--act'];

function read() {
  const style = getComputedStyle(document.documentElement);
  const colors = {};
  WANTED.forEach((name) => {
    colors[name.replace('--', '')] = style.getPropertyValue(name).trim();
  });
  return colors;
}

export default function useChartColors() {
  const [colors, setColors] = useState(read);

  // The profile screen can switch between dark and light while the app is open.
  useEffect(() => {
    const watcher = new MutationObserver(() => setColors(read()));
    watcher.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => watcher.disconnect();
  }, []);

  return colors;
}

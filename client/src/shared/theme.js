// Light / dark / system theme (Malak only). The choice is saved in localStorage.
const KEY = 'nabd-theme';
let mediaQuery = null;
let mediaListener = null;

export function getTheme() {
  try {
    return localStorage.getItem(KEY) || 'system';
  } catch {
    return 'system';
  }
}

function paint(choice) {
  const dark = window.matchMedia('(prefers-color-scheme: dark)');
  const value = choice === 'system' ? (dark.matches ? 'dark' : 'light') : choice;
  document.documentElement.dataset.theme = value;
}

export function setTheme(choice) {
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    // storage blocked: the theme still changes for this visit
  }
  if (mediaQuery && mediaListener) mediaQuery.removeEventListener('change', mediaListener);
  mediaQuery = null;
  mediaListener = null;
  paint(choice);
  if (choice === 'system') {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaListener = () => paint('system');
    mediaQuery.addEventListener('change', mediaListener);
  }
}

export function applySavedTheme() {
  setTheme(getTheme());
}

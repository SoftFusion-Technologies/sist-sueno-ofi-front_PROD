// Benjamin Orellana - 2026-02-17 - Helper simple para aplicar tema por clase 'dark' en <html>
export function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
}

export function loadCachedTheme() {
  return localStorage.getItem('ui_tema'); // 'dark' | 'light' | null
}

export function cacheTheme(theme) {
  localStorage.setItem('ui_tema', theme);
}

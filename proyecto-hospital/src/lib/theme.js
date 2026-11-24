// Modo oscuro: clase "dark" en <html>, preferencia guardada en localStorage.
// index.html la aplica antes del primer render para evitar el "flash" blanco.
const KEY = 'hmspro-theme'

export function getTheme() {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'dark' || saved === 'light') return saved
  } catch { /* storage bloqueado */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function setTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  try { localStorage.setItem(KEY, theme) } catch { /* noop */ }
}

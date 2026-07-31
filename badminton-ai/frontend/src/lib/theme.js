const STORAGE_KEY = "badminton-ai:theme";

export function getThemePreference() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

export function applyThemePreference(preference) {
  if (preference === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", preference);
  }
}

export function setThemePreference(preference) {
  localStorage.setItem(STORAGE_KEY, preference);
  applyThemePreference(preference);
}

/** Call at the top of every page's entry script so the stored preference
 * applies before first paint (avoids a flash of the wrong theme).
 */
export function initTheme() {
  applyThemePreference(getThemePreference());
}

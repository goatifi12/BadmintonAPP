export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "badminton-ai:theme";

export function getThemePreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

export function applyThemePreference(preference: ThemePreference): void {
  if (preference === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", preference);
  }
}

export function setThemePreference(preference: ThemePreference): void {
  localStorage.setItem(STORAGE_KEY, preference);
  applyThemePreference(preference);
}

/** Call at the top of every page's entry script so the stored preference
 * applies before first paint (avoids a flash of the wrong theme).
 */
export function initTheme(): void {
  applyThemePreference(getThemePreference());
}

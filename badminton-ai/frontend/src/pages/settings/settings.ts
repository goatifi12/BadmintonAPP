import "@/components/app-nav/app-nav";
import { requireToken, signOutAndRedirect, verifySession } from "@/lib/auth-guard";
import { initGlobalErrorHandler } from "@/lib/error-handler";
import { animateOnEnter, showToast } from "@/lib/motion";
import { getThemePreference, initTheme, setThemePreference, type ThemePreference } from "@/lib/theme";

initGlobalErrorHandler();
initTheme();
requireToken();

const nav = document.querySelector("app-nav") as HTMLElement & { setUserEmail(email: string): void };
const profileName = document.getElementById("profileName") as HTMLElement;
const profileEmail = document.getElementById("profileEmail") as HTMLElement;
const signOutBtn = document.getElementById("signOutBtn") as HTMLButtonElement;
const themeButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".theme-option"));

const THEME_LABELS: Record<ThemePreference, string> = { system: "System", light: "Light", dark: "Dark" };

function highlightActiveTheme(preference: ThemePreference): void {
  for (const button of themeButtons) {
    button.classList.toggle("active", button.dataset.themeOption === preference);
  }
}

highlightActiveTheme(getThemePreference());

for (const button of themeButtons) {
  button.addEventListener("click", () => {
    const preference = (button.dataset.themeOption as ThemePreference) ?? "system";
    setThemePreference(preference);
    highlightActiveTheme(preference);
    showToast(`Theme set to ${THEME_LABELS[preference]}.`, "info", 1800);
  });
}

signOutBtn.addEventListener("click", signOutAndRedirect);

void (async () => {
  const user = await verifySession();
  nav.setUserEmail(user.email);
  profileName.textContent = user.display_name;
  profileEmail.textContent = user.email;
  animateOnEnter();
})();

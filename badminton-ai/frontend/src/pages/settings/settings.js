import "../../components/app-nav/app-nav.js";
import { requireToken, signOutAndRedirect, verifySession } from "../../lib/auth-guard.js";
import { initGlobalErrorHandler } from "../../lib/error-handler.js";
import { animateOnEnter, showToast } from "../../lib/motion.js";
import { getThemePreference, initTheme, setThemePreference } from "../../lib/theme.js";

initGlobalErrorHandler();
initTheme();
requireToken();

const nav = document.querySelector("app-nav");
const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");
const signOutBtn = document.getElementById("signOutBtn");
const themeButtons = Array.from(document.querySelectorAll(".theme-option"));

const THEME_LABELS = { system: "System", light: "Light", dark: "Dark" };

function highlightActiveTheme(preference) {
  for (const button of themeButtons) {
    button.classList.toggle("active", button.dataset.themeOption === preference);
  }
}

highlightActiveTheme(getThemePreference());

for (const button of themeButtons) {
  button.addEventListener("click", () => {
    const preference = button.dataset.themeOption ?? "system";
    setThemePreference(preference);
    highlightActiveTheme(preference);
    showToast(`Theme set to ${THEME_LABELS[preference]}.`, "info", 1800);
  });
}

signOutBtn.addEventListener("click", signOutAndRedirect);

(async () => {
  const user = await verifySession();
  nav.setUserEmail(user.email);
  animateOnEnter();
  profileName.textContent = user.display_name;
  profileEmail.textContent = user.email;
})();

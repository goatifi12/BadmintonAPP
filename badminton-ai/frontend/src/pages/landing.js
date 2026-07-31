import { animateOnEnter } from "../lib/motion.js";
import { initTheme } from "../lib/theme.js";
import { authStore } from "../state/auth-store.js";

initTheme();

if (authStore.isAuthenticated()) {
  window.location.replace("./pages/dashboard/index.html");
}

animateOnEnter();

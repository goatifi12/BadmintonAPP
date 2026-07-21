import { animateOnEnter } from "@/lib/motion";
import { initTheme } from "@/lib/theme";
import { authStore } from "@/state/auth-store";

initTheme();

if (authStore.isAuthenticated()) {
  window.location.replace("src/pages/dashboard/index.html");
}

animateOnEnter();

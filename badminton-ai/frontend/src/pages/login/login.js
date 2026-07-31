import { authApi } from "../../api/auth.js";
import { ApiError } from "../../api/client.js";
import { initGlobalErrorHandler } from "../../lib/error-handler.js";
import { initTheme } from "../../lib/theme.js";
import { authStore } from "../../state/auth-store.js";

initGlobalErrorHandler();
initTheme();

if (authStore.isAuthenticated()) {
  window.location.replace("../dashboard/index.html");
}

const form = document.getElementById("loginForm");
const errorBox = document.getElementById("formError");
const submitBtn = document.getElementById("submitBtn");

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.add("visible");
}

function clearError() {
  errorBox.textContent = "";
  errorBox.classList.remove("visible");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();

  const formData = new FormData(form);
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  submitBtn.disabled = true;
  submitBtn.classList.add("btn-loading");

  try {
    const { user, tokens } = await authApi.login({ email, password });
    authStore.setSession(user, tokens);
    window.location.href = "../dashboard/index.html";
  } catch (error) {
    if (error instanceof ApiError) {
      showError(error.message);
    } else {
      showError("Something went wrong. Please try again.");
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove("btn-loading");
  }
});

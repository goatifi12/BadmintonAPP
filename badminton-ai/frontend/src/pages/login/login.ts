import { authApi } from "@/api/auth";
import { ApiError } from "@/api/client";
import { initTheme } from "@/lib/theme";
import { authStore } from "@/state/auth-store";

initTheme();

if (authStore.isAuthenticated()) {
  window.location.replace("../dashboard/index.html");
}

const form = document.getElementById("loginForm") as HTMLFormElement;
const errorBox = document.getElementById("formError") as HTMLDivElement;
const submitBtn = document.getElementById("submitBtn") as HTMLButtonElement;

function showError(message: string): void {
  errorBox.textContent = message;
  errorBox.classList.add("visible");
}

function clearError(): void {
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

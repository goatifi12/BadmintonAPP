import { signOutAndRedirect } from "../../lib/auth-guard.js";

const NAV_LINKS = [
  { key: "dashboard", label: "Dashboard", href: "../dashboard/index.html" },
  { key: "upload", label: "Upload", href: "../upload/index.html" },
  { key: "reports", label: "Reports", href: "../reports/index.html" },
  { key: "settings", label: "Settings", href: "../settings/index.html" },
];

class AppNav extends HTMLElement {
  connectedCallback() {
    const active = this.getAttribute("active") ?? "";

    this.innerHTML = `
      <div class="app-nav-inner">
        <a class="brand" href="../dashboard/index.html">
          <span class="brand-mark">BA</span>
          <span>Badminton AI</span>
        </a>
        <nav class="app-nav-links">
          ${NAV_LINKS.map((link) => `<a class="app-nav-link${link.key === active ? " active" : ""}" href="${link.href}">${link.label}</a>`).join("")}
        </nav>
        <div class="app-header-user">
          <span class="user-label" data-role="user-label"></span>
          <button class="btn btn-secondary" data-role="sign-out">Sign out</button>
        </div>
      </div>
    `;

    this.querySelector('[data-role="sign-out"]')?.addEventListener("click", () => signOutAndRedirect());
  }

  setUserEmail(email) {
    const label = this.querySelector('[data-role="user-label"]');
    if (label) label.textContent = email;
  }
}

customElements.define("app-nav", AppNav);

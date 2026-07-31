/** Fades/slides elements in as they scroll into view (or immediately if
 * already visible on load). Call once per page after the DOM has the
 * elements you want animated - pass a selector, or nothing to auto-target
 * `.card` and `[data-animate]`.
 */
export function animateOnEnter(selector = ".card, [data-animate]") {
  const elements = Array.from(document.querySelectorAll(selector));
  if (elements.length === 0) return;

  if (!("IntersectionObserver" in window)) {
    for (const el of elements) el.classList.add("in-view");
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
  );

  elements.forEach((el, i) => {
    el.classList.add("animate-ready");
    el.style.setProperty("--stagger", String(i % 8));
    observer.observe(el);
  });
}

/** Animates a number from 0 (or its current text) up to `value` over
 * `durationMs`, formatting with `formatter` on every frame.
 */
export function countUpTo(el, value, options = {}) {
  const durationMs = options.durationMs ?? 800;
  const formatter = options.formatter ?? ((n) => String(Math.round(n)));
  const start = performance.now();

  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(1, elapsed / durationMs);
    // ease-out-cubic
    const eased = 1 - (1 - progress) ** 3;
    el.textContent = formatter(value * eased);
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

let toastContainer = null;

function getToastContainer() {
  if (toastContainer) return toastContainer;
  toastContainer = document.createElement("div");
  toastContainer.className = "toast-container";
  document.body.appendChild(toastContainer);
  return toastContainer;
}

/** Shows a small auto-dismissing toast in the bottom-right corner. */
export function showToast(message, kind = "info", durationMs = 3200) {
  const container = getToastContainer();
  const toast = document.createElement("div");
  toast.className = `toast toast-${kind}`;
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("toast-in"));

  setTimeout(() => {
    toast.classList.remove("toast-in");
    toast.classList.add("toast-out");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  }, durationMs);
}

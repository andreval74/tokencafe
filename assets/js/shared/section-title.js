function init(el) {
  if (!el || el.getAttribute("data-st-initialized") === "true") return;
  const icon = el.getAttribute("data-st-icon") || "";
  const title = el.getAttribute("data-st-title") || "";
  const subtitle = el.getAttribute("data-st-subtitle") || "";
  const note = el.getAttribute("data-st-note") || "";
  const root = el.querySelector(".section-title");
  if (!root) return;
  const iconEl = root.querySelector(".section-icon");
  if (iconEl && icon) {
    const raw = String(icon || "").trim();
    const hasBi = raw.split(/\s+/).includes("bi") || raw.startsWith("bi-");
    const cls = hasBi ? raw : `bi ${raw}`;
    iconEl.className = `${cls} section-icon`;
  }
  const hEl = root.querySelector("h3") || root.querySelector("h5");
  if (hEl) hEl.textContent = title;
  const pEl = root.querySelector("p");
  if (pEl) pEl.textContent = subtitle;
  const smallEl = root.querySelector("small");
  if (smallEl) {
    smallEl.textContent = note;
    if (note) smallEl.classList.remove("d-none");
    else smallEl.classList.add("d-none");
  }
  el.setAttribute("data-st-initialized", "true");
}

function findContainers() {
  const nodes = document.querySelectorAll('[data-component*="section-title.php"]');
  nodes.forEach(init);
}

findContainers();
const observer = new MutationObserver(() => {
  findContainers();
});
observer.observe(document.body, { childList: true, subtree: true });

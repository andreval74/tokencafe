function init(el) {
  if (!el || el.getAttribute("data-st-initialized") === "true") return;
  const icon = el.getAttribute("data-st-icon") || "";
  const title = el.getAttribute("data-st-title") || "";
  const subtitle = el.getAttribute("data-st-subtitle") || "";
  const note = el.getAttribute("data-st-note") || "";
  const root = el.querySelector(".section-title");
  if (!root) return;
  const iconEl = root.querySelector(".section-icon");
  if (iconEl && icon) iconEl.className = `bi ${icon} section-icon fs-2`;
  const hEl = root.querySelector("h5");
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
  const nodes = document.querySelectorAll('[data-component*="section-title.html"]');
  nodes.forEach(init);
}

findContainers();
const observer = new MutationObserver(() => {
  findContainers();
});
observer.observe(document.body, { childList: true, subtree: true });

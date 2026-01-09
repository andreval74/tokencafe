function init(el) {
  if (!el || el.getAttribute("data-sf-initialized") === "true") return;
  const icon = el.getAttribute("data-sf-icon") || "bi-code-slash";
  const title = el.getAttribute("data-sf-title") || "Feito por webkeeper.com.br";
  const subtitle = el.getAttribute("data-sf-subtitle") || "";
  const note = el.getAttribute("data-sf-note") || "";
  const root = el.querySelector(".section-footer");
  if (!root) return;
  const iconEl = root.querySelector(".section-footer-icon");
  if (iconEl && icon) iconEl.className = `bi ${icon} section-footer-icon fs-2`;
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
  el.setAttribute("data-sf-initialized", "true");
}

function findContainers() {
  const nodes = document.querySelectorAll('[data-component*="section-footer.html"]');
  nodes.forEach(init);
}

findContainers();
const observer = new MutationObserver(() => {
  findContainers();
});
observer.observe(document.body, { childList: true, subtree: true });

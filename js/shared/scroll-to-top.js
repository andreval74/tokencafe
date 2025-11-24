(() => {
  const SCROLL_THRESHOLD = 300;

  function createButton() {
    const btn = document.createElement("button");
    btn.id = "scrollTopBtn";
    btn.className = "btn btn-outline-primary rounded-circle position-fixed bottom-0 end-0 m-3 shadow z-3 d-none";
    btn.setAttribute("aria-label", "Voltar ao topo");

    const icon = document.createElement("i");
    icon.className = "bi bi-arrow-up";
    icon.setAttribute("aria-hidden", "true");
    btn.appendChild(icon);

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });

    return btn;
  }

  function toggleButton(btn) {
    const show = window.scrollY > SCROLL_THRESHOLD;
    btn.classList.toggle("d-none", !show);
  }

  function initScrollToTop() {
    if (document.getElementById("scrollTopBtn")) return;
    const btn = createButton();
    document.body.appendChild(btn);
    toggleButton(btn);
    window.addEventListener("scroll", () => toggleButton(btn), {
      passive: true,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initScrollToTop);
  } else {
    initScrollToTop();
  }
})();

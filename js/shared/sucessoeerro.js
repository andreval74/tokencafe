// Sistema unificado de mensagens de sucesso/erro
// IIFE para evitar poluição global e múltiplas inicializações
// Expõe SuccessErrorUI e a função global window.notify
(() => {
  try {
    if (window.SuccessErrorUI && typeof window.notify === "function") return;
  } catch (_) {}

  const ICONS = {
    success: '<i class="bi bi-check-circle me-2"></i>',
    error: '<i class="bi bi-exclamation-triangle me-2"></i>',
  };

  function findContainer(container) {
    if (container && container.nodeType === 1) return container;
    try {
      const active = document.activeElement;
      const form = active ? active.closest("form") : null;
      if (form) return form;
    } catch (_) {}
    try {
      const main = document.querySelector(".container, .container-fluid") || document.body;
      return main;
    } catch (_) {
      return document.body;
    }
  }

  function ensureMessageHost() {
    const hostId = "tc-footer-message-host";
    let host = document.getElementById(hostId);
    if (!host) {
      host = document.createElement("div");
      host.id = hostId;
      host.className = "container mt-2";
      try {
        const wrappers = document.querySelectorAll('[data-component*="section-footer.html"]');
        const lastWrapper = wrappers && wrappers.length ? wrappers[wrappers.length - 1] : null;
        if (lastWrapper && lastWrapper.parentNode) {
          lastWrapper.parentNode.insertBefore(host, lastWrapper);
        } else {
          const dividers = document.querySelectorAll('.section-divider');
          const lastDivider = dividers && dividers.length ? dividers[dividers.length - 1] : null;
          if (lastDivider && lastDivider.parentNode) {
            lastDivider.parentNode.insertBefore(host, lastDivider);
          } else {
            document.body.appendChild(host);
          }
        }
      } catch (_) {
        try { document.body.appendChild(host); } catch (_) {}
      }
    }
    return host;
  }

  function clearForm(container) {
    const root = findContainer(container);
    try {
      const fields = root.querySelectorAll("input, textarea, select");
      fields.forEach((el) => {
        const tag = (el.tagName || "").toLowerCase();
        const type = String(el.type || "").toLowerCase();
        if (tag === "input") {
          if (type === "checkbox" || type === "radio") {
            el.checked = false;
          } else {
            el.value = "";
          }
        } else if (tag === "textarea") {
          el.value = "";
        } else if (tag === "select") {
          el.selectedIndex = 0;
        }
        el.classList.remove("is-valid", "is-invalid");
      });
    } catch (_) {}
  }

  function renderMessage(type, message, _onClear, _container) {
    const host = ensureMessageHost();
    try {
      while (host.firstChild) host.removeChild(host.firstChild);
    } catch (_) {}
    const wrap = document.createElement("small");
    wrap.className = `${type === "success" ? "text-success" : "text-danger"} d-block mt-1`;
    wrap.innerHTML = `${ICONS[type] || ""}${message || ""}`;
    host.appendChild(wrap);
    if (type === "success") {
      try {
        setTimeout(() => {
          try { if (wrap.parentElement === host) host.removeChild(wrap); } catch (_) {}
        }, 1500);
      } catch (_) {}
    }
    return wrap;
  }

  function showSuccess(message, opts = {}) {
    const { onClear, container } = opts || {};
    return renderMessage("success", message, onClear, container);
  }

  function showError(message, opts = {}) {
    const { onClear, container } = opts || {};
    return renderMessage("error", message, onClear, container);
  }

  window.SuccessErrorUI = { showSuccess, showError, clearForm };

  window.notify = (message, type = "info", opts = {}) => {
    try {
      const t = String(type).toLowerCase();
      const container = opts.container || (document.querySelector(".container, .container-fluid") || document.body);
      const onClear = typeof opts.onClear === "function" ? opts.onClear : undefined;
      if (t === "success" || t === "info") return showSuccess(message, { container, onClear });
      return showError(message, { container, onClear });
    } catch (_) {
      try { alert(message); } catch (_) {}
      return null;
    }
  };
})();

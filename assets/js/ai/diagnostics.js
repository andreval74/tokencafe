/**
 * diagnostics.js — Sistema de diagnóstico e exibição de resultados
 * Exports: showDiagnosis, diagnoseEvmError, getDefaultAddressCauses
 */

// Code → { icon, colorClass, label }
const CODE_MAP = {
  SUCCESS:               { icon: "bi-check-circle-fill", colorClass: "text-success", label: "Sucesso" },
  ERROR:                 { icon: "bi-x-circle-fill",     colorClass: "text-danger",  label: "Erro" },
  WARNING:               { icon: "bi-exclamation-triangle-fill", colorClass: "text-warning", label: "Atenção" },
  INFO:                  { icon: "bi-info-circle-fill",  colorClass: "text-info",    label: "Informação" },
  PRECONDITION:          { icon: "bi-slash-circle",      colorClass: "text-warning", label: "Pré-condição" },
  API_UNAVAILABLE:       { icon: "bi-cloud-slash",       colorClass: "text-danger",  label: "API Indisponível" },
  INSUFFICIENT_FUNDS:    { icon: "bi-wallet2",           colorClass: "text-warning", label: "Saldo Insuficiente" },
  VERIFY_NETWORK_OR_ADDRESS: { icon: "bi-search",        colorClass: "text-info",    label: "Verificar Rede/Endereço" },
};

const MODAL_ID = "tcDiagnosisModal";

function ensureModalExists() {
  if (document.getElementById(MODAL_ID)) return;
  const el = document.createElement("div");
  el.innerHTML = `
    <div class="modal fade" id="${MODAL_ID}" tabindex="-1" data-bs-backdrop="static" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content bg-dark text-light border-secondary">
          <div class="modal-header border-secondary pb-2">
            <span id="${MODAL_ID}-icon" class="fs-4 me-2"></span>
            <h5 class="modal-title mb-0" id="${MODAL_ID}-title"></h5>
          </div>
          <div class="modal-body">
            <p id="${MODAL_ID}-subtitle" class="mb-2 text-white-75"></p>
            <div id="${MODAL_ID}-badge-wrap" class="mb-2 d-none">
              <span id="${MODAL_ID}-badge" class="badge bg-secondary text-white"></span>
            </div>
            <ul id="${MODAL_ID}-causes" class="mb-0 ps-3 tc-text-sm text-white-50"></ul>
            <div id="${MODAL_ID}-html" class="mt-2"></div>
          </div>
          <div class="modal-footer border-secondary pt-2">
            <button type="button" class="btn btn-sm btn-outline-secondary" id="${MODAL_ID}-close">Fechar</button>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(el.firstElementChild);

  document.getElementById(`${MODAL_ID}-close`)?.addEventListener("click", () => {
    try { bootstrap?.Modal?.getInstance(document.getElementById(MODAL_ID))?.hide(); } catch (_) {}
  });
}

/**
 * Exibe um painel de diagnóstico.
 * @param {string} code  - Código do tipo: SUCCESS, ERROR, WARNING, INFO, etc.
 * @param {object} opts  - { title, subtitle, badge, causes, content, htmlContent, onClear }
 * @returns {boolean} true se exibido com sucesso
 */
export function showDiagnosis(code, opts = {}) {
  try {
    const meta = CODE_MAP[String(code).toUpperCase()] || CODE_MAP.INFO;
    const title    = opts.title    || meta.label;
    const subtitle = opts.subtitle || opts.content || "";
    const badge    = opts.badge    || "";
    const causes   = Array.isArray(opts.causes) ? opts.causes : [];
    const html     = opts.htmlContent || "";
    const onClear  = typeof opts.onClear === "function" ? opts.onClear : null;

    // Try Bootstrap modal first
    try {
      ensureModalExists();
      const modalEl = document.getElementById(MODAL_ID);
      if (!modalEl) throw new Error("no modal");

      const iconEl    = document.getElementById(`${MODAL_ID}-icon`);
      const titleEl   = document.getElementById(`${MODAL_ID}-title`);
      const subEl     = document.getElementById(`${MODAL_ID}-subtitle`);
      const badgeWrap = document.getElementById(`${MODAL_ID}-badge-wrap`);
      const badgeEl   = document.getElementById(`${MODAL_ID}-badge`);
      const causesEl  = document.getElementById(`${MODAL_ID}-causes`);
      const htmlEl    = document.getElementById(`${MODAL_ID}-html`);

      if (iconEl)  { iconEl.className = `bi ${meta.icon} ${meta.colorClass} fs-4 me-2`; }
      if (titleEl) { titleEl.textContent = title; titleEl.className = `modal-title mb-0 ${meta.colorClass}`; }
      if (subEl)   { subEl.textContent = subtitle; }
      if (badgeWrap && badgeEl) {
        if (badge) { badgeEl.textContent = badge; badgeWrap.classList.remove("d-none"); }
        else { badgeWrap.classList.add("d-none"); }
      }
      if (causesEl) {
        causesEl.innerHTML = causes.map((c) => `<li>${String(c)}</li>`).join("");
      }
      if (htmlEl) { htmlEl.innerHTML = html; }

      const closeBtn = document.getElementById(`${MODAL_ID}-close`);
      if (closeBtn && onClear) {
        closeBtn.onclick = () => {
          try { bootstrap?.Modal?.getInstance(modalEl)?.hide(); } catch (_) {}
          onClear();
        };
      } else if (closeBtn) {
        closeBtn.onclick = () => {
          try { bootstrap?.Modal?.getInstance(modalEl)?.hide(); } catch (_) {}
        };
      }

      const instance = bootstrap.Modal.getOrCreateInstance(modalEl);
      instance.show();
      return true;
    } catch (_) {}

    // Fallback: window.notify
    if (typeof window.notify === "function") {
      const msg = [title, subtitle].filter(Boolean).join(" — ");
      const type = code === "SUCCESS" ? "success" : code === "ERROR" ? "error" : code === "WARNING" ? "warning" : "info";
      window.notify(msg, type);
      if (onClear) setTimeout(onClear, 3000);
      return true;
    }

    // Last resort: console
    console.info(`[Diagnosis:${code}]`, title, subtitle, causes);
    return false;
  } catch (_) {
    return false;
  }
}

// EVM error code → diagnosis data
const EVM_ERROR_MAP = [
  {
    match: (e) => e?.code === 4001 || /user (rejected|denied)/i.test(e?.message || ""),
    result: { code: "WARNING", badge: "Cancelado", causes: ["O usuário cancelou a operação na carteira."] },
  },
  {
    match: (e) => e?.code === -32002 || /already pending/i.test(e?.message || ""),
    result: { code: "WARNING", badge: "Pendente", causes: ["Solicitação já em andamento — verifique sua carteira."] },
  },
  {
    match: (e) => /insufficient funds/i.test(e?.message || ""),
    result: { code: "INSUFFICIENT_FUNDS", badge: "Saldo insuficiente", causes: ["Saldo nativo insuficiente para cobrir o gás.", "Adicione fundos à carteira e tente novamente."] },
  },
  {
    match: (e) => /gas/i.test(e?.message || "") && /too low|underpriced/i.test(e?.message || ""),
    result: { code: "WARNING", badge: "Gás baixo", causes: ["Gás muito baixo — aumente o limite e tente novamente."] },
  },
  {
    match: (e) => /network|chain/i.test(e?.message || ""),
    result: { code: "VERIFY_NETWORK_OR_ADDRESS", badge: "Rede", causes: ["Verifique se está na rede correta.", "Troque de rede na carteira e tente novamente."] },
  },
  {
    match: (e) => /revert/i.test(e?.message || ""),
    result: { code: "ERROR", badge: "Revertido", causes: ["Contrato reverteu a transação.", "Verifique os parâmetros e tente novamente."] },
  },
];

/**
 * Analisa um erro EVM e retorna código de diagnóstico estruturado.
 * @param {Error|object} error
 * @returns {{ code: string, badge: string, causes: string[] }}
 */
export function diagnoseEvmError(error) {
  for (const entry of EVM_ERROR_MAP) {
    try {
      if (entry.match(error)) return { ...entry.result };
    } catch (_) {}
  }
  return {
    code: "ERROR",
    badge: "Erro",
    causes: [error?.message || "Erro desconhecido — tente novamente."],
  };
}

/**
 * Retorna causas padrão para erros de endereço/rede.
 * @returns {string[]}
 */
export function getDefaultAddressCauses() {
  return [
    "Endereço inválido ou inexistente nesta rede.",
    "Verifique se o contrato foi publicado na rede correta.",
    "Confira o endereço e tente novamente.",
  ];
}

import { persona } from "./persona.js";

function normalizeText(v) {
  try {
    return String(v || "").trim();
  } catch (_) {
    return "";
  }
}

function buildCausesHtml(causes) {
  const items = Array.isArray(causes) ? causes.filter(Boolean) : [];
  if (!items.length) return "";
  const li = items.map((x) => `<li>${String(x)}</li>`).join("");
  return `<div class="text-start"><div class="mb-2">Possíveis causas:</div><ul class="mb-0">${li}</ul></div>`;
}

export function getDefaultAddressCauses() {
  return ["Endereço não informado", "Endereço inválido", "Endereço não pertence a esta rede"];
}

function lower(v) {
  try {
    return String(v || "").toLowerCase();
  } catch (_) {
    return "";
  }
}

function getEvmMessage(err) {
  try {
    if (!err) return "";
    const msg = err?.data?.message || err?.error?.message || err?.message || "";
    return String(msg || "");
  } catch (_) {
    return "";
  }
}

export function diagnoseEvmError(err, context = {}) {
  const msg = getEvmMessage(err);
  const msgLc = lower(msg);
  const code = err?.code;
  const nestedCode = err?.data?.code;

  if (code === 4001 || msgLc.includes("user rejected") || msgLc.includes("rejected the request") || msgLc.includes("user rejected the transaction")) {
    return {
      code: "USER_CANCELLED",
      badge: "Operação cancelada pelo usuário.",
      causes: ["Você cancelou na carteira.", "A carteira solicitou confirmação e foi rejeitada."],
    };
  }

  if (msgLc.includes("insufficient funds") || msgLc.includes("saldo insuficiente") || nestedCode === -32000) {
    const sym = normalizeText(context.nativeSymbol) || "moeda nativa";
    return {
      code: "INSUFFICIENT_FUNDS",
      badge: `Saldo insuficiente para pagar taxas (gás) em ${sym}.`,
      causes: ["Saldo da carteira insuficiente na rede selecionada.", "Você precisa receber fundos (faucet/testnet ou depósito)."],
    };
  }

  if (msgLc.includes("failed to fetch")) {
    return {
      code: "API_UNAVAILABLE",
      badge: "Falha de conexão (Failed to fetch).",
      causes: ["Servidor indisponível ou em sleep.", "Bloqueio de rede/CORS.", "Conexão instável."],
    };
  }

  if (msgLc.includes("network") && msgLc.includes("chain")) {
    return {
      code: "NETWORK_MISMATCH",
      badge: "Rede incorreta na carteira.",
      causes: ["A carteira está em uma rede diferente da selecionada no sistema.", "Troque a rede na carteira e tente novamente."],
    };
  }

  if (code === -32603 || msgLc.includes("internal json-rpc error")) {
    return {
      code: "RPC_ERROR",
      badge: "Erro interno de RPC ao processar a solicitação.",
      causes: ["Nó/RPC instável.", "Parâmetros recusados pelo nó.", "Tente novamente em instantes."],
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    badge: normalizeText(msg) || "Falha inesperada.",
    causes: ["Tente novamente.", "Se persistir, verifique rede/carteira e conexão."],
  };
}

export function createDiagnosis(code, input = {}) {
  const badge = normalizeText(input.badge);
  const subtitle = normalizeText(input.subtitle) || persona.style.defaultSubtitle;
  const title = normalizeText(input.title) || persona.style.defaultTitle;
  const causes = input.causes || null;
  const htmlContent = input.htmlContent || (causes ? buildCausesHtml(causes) : "");
  const content = typeof input.content !== "undefined" ? input.content : "";
  const type = input.type || "error";
  const actions = Array.isArray(input.actions) ? input.actions : undefined;

  if (code === "VERIFY_NETWORK_OR_ADDRESS") {
    return {
      type,
      title,
      subtitle,
      badge,
      icon: input.icon || "bi-exclamation-triangle",
      content,
      htmlContent,
      actions,
      onClear: typeof input.onClear === "function" ? input.onClear : undefined,
    };
  }

  if (code === "ERROR") {
    return {
      type: "error",
      title: normalizeText(input.title) || "Erro",
      subtitle: normalizeText(input.subtitle) || "Não foi possível concluir a ação.",
      badge,
      icon: input.icon || "bi-x-circle",
      content,
      htmlContent,
      actions,
      onClear: typeof input.onClear === "function" ? input.onClear : undefined,
    };
  }

  if (code === "WARNING") {
    return {
      type: "warning",
      title: normalizeText(input.title) || "Atenção",
      subtitle: normalizeText(input.subtitle) || "Verifique os dados e tente novamente.",
      badge,
      icon: input.icon || "bi-exclamation-triangle",
      content,
      htmlContent,
      actions,
      onClear: typeof input.onClear === "function" ? input.onClear : undefined,
    };
  }

  if (code === "INSUFFICIENT_FUNDS") {
    return {
      type: "error",
      title: "Saldo insuficiente",
      subtitle: normalizeText(input.subtitle) || "A carteira não tem saldo suficiente para concluir.",
      badge,
      icon: input.icon || "bi-cash-coin",
      content,
      htmlContent,
      actions,
      onClear: typeof input.onClear === "function" ? input.onClear : undefined,
    };
  }

  if (code === "USER_CANCELLED") {
    return {
      type: "info",
      title: "Operação cancelada",
      subtitle: normalizeText(input.subtitle) || "Você cancelou a solicitação na carteira.",
      badge,
      icon: input.icon || "bi-x-circle",
      content,
      htmlContent,
      actions,
      onClear: typeof input.onClear === "function" ? input.onClear : undefined,
    };
  }

  if (code === "API_UNAVAILABLE") {
    return {
      type: "error",
      title: "Sem conexão",
      subtitle: normalizeText(input.subtitle) || "Não foi possível conectar ao servidor agora.",
      badge,
      icon: input.icon || "bi-wifi-off",
      content,
      htmlContent,
      actions,
      onClear: typeof input.onClear === "function" ? input.onClear : undefined,
    };
  }

  if (code === "PRECONDITION") {
    return {
      type: "warning",
      title: "Ação necessária",
      subtitle: normalizeText(input.subtitle) || "Complete os passos obrigatórios antes de continuar.",
      badge,
      icon: input.icon || "bi-exclamation-triangle",
      content,
      htmlContent,
      actions,
      onClear: typeof input.onClear === "function" ? input.onClear : undefined,
    };
  }

  if (code === "RPC_ERROR") {
    return {
      type: "error",
      title: "Falha de rede",
      subtitle: normalizeText(input.subtitle) || "Falha ao processar a solicitação na rede.",
      badge,
      icon: input.icon || "bi-hdd-network",
      content,
      htmlContent,
      actions,
      onClear: typeof input.onClear === "function" ? input.onClear : undefined,
    };
  }

  if (code === "INFO") {
    return {
      type: "info",
      title: normalizeText(input.title) || "Informação",
      subtitle,
      badge,
      icon: input.icon || "bi-info-circle",
      content,
      htmlContent,
      actions,
      onClear: typeof input.onClear === "function" ? input.onClear : undefined,
    };
  }

  if (code === "SUCCESS") {
    return {
      type: "success",
      title: normalizeText(input.title) || "Sucesso",
      subtitle,
      badge,
      icon: input.icon || "bi-check-circle",
      content,
      htmlContent,
      actions,
      onClear: typeof input.onClear === "function" ? input.onClear : undefined,
    };
  }

  return {
    type,
    title,
    subtitle,
    badge,
    icon: input.icon || "bi-exclamation-triangle",
    content,
    htmlContent,
    actions,
    onClear: typeof input.onClear === "function" ? input.onClear : undefined,
  };
}

export function showDiagnosis(code, input = {}) {
  const cfg = createDiagnosis(code, input);
  try {
    if (window.SystemResponse) {
      const sys = new window.SystemResponse();
      sys.show(cfg);
      return true;
    }
  } catch (_) {}

  try {
    const msg = cfg.subtitle || cfg.title || "Aviso";
    if (typeof window.notify === "function") window.notify(String(msg), cfg.type === "error" ? "error" : "info");
  } catch (_) {}
  return false;
}

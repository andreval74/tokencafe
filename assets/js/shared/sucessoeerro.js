// Sistema unificado de mensagens de sucesso/erro
// Substitui a antiga exibição inline pelo Modal Global (SystemResponse)
// Mantém compatibilidade com chamadas antigas (window.notify, SuccessErrorUI)

(() => {
  // Evitar múltiplas inicializações se já estiver configurado corretamente
  if (window.SuccessErrorUI && window.SuccessErrorUI.__isModern) return;

  console.log("🔄 Inicializando Sistema Unificado de Notificações (Modal Global)...");

  // Função auxiliar para garantir acesso ao SystemResponse
  function getSystemResponse() {
    if (window.SystemResponse) {
      return new window.SystemResponse();
    }
    // Fallback: Tenta encontrar no escopo global se não estiver em window.SystemResponse explicitamente
    // (Caso SystemResponse tenha sido carregado mas não atribuído a window.SystemResponse ainda)
    return null;
  }

  function showSuccess(message, opts = {}) {
    try {
      if (typeof window.showDiagnosis === "function") {
        window.showDiagnosis("SUCCESS", {
          title: "Sucesso",
          subtitle: String(message || "Sucesso"),
          onClear: opts.onClear,
        });
        return;
      }
    } catch (_) {}
    const sys = getSystemResponse();
    if (sys) {
      sys.show({
        title: "Sucesso",
        subtitle: message,
        type: "success",
        icon: "bi-check-circle",
        onClear: opts.onClear,
      });
      return;
    }

    // Fallback legado
    console.log("Success (Fallback):", message);
    alert("✅ " + message);
    if (opts.onClear) opts.onClear();
  }

  function showError(message, opts = {}) {
    try {
      if (typeof window.showDiagnosis === "function") {
        window.showDiagnosis("ERROR", {
          title: "Erro",
          subtitle: String(message || "Erro"),
          onClear: opts.onClear,
        });
        return;
      }
    } catch (_) {}
    const sys = getSystemResponse();
    if (sys) {
      sys.show({
        title: "Erro",
        subtitle: message,
        type: "error",
        icon: "bi-exclamation-triangle",
        onClear: opts.onClear,
      });
      return;
    }

    // Fallback legado
    console.error("Error (Fallback):", message);
    alert("❌ " + message);
    if (opts.onClear) opts.onClear();
  }

  function clearForm(container) {
    try {
      const root = container && container.nodeType === 1 ? container : document.querySelector(container) || document.body;
      const fields = root.querySelectorAll("input, textarea, select");
      fields.forEach((el) => {
        if (el.type === "hidden" || el.readOnly || el.disabled) return;

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
    } catch (e) {
      console.warn("Erro ao limpar formulário:", e);
    }
  }

  // Expor API global
  window.SuccessErrorUI = {
    showSuccess,
    showError,
    clearForm,
    __isModern: true,
  };

  // Compatibilidade Legada
  if (typeof window.showFormSuccess !== "function") window.showFormSuccess = (msg, opts) => showSuccess(msg, opts);
  if (typeof window.showFormError !== "function") window.showFormError = (msg, opts) => showError(msg, opts);

  window.notify = (message, type = "info", opts = {}) => {
    const t = String(type).toLowerCase();
    if (t === "success") return showSuccess(message, opts);
    if (t === "error") return showError(message, opts);

    try {
      if (typeof window.showDiagnosis === "function") {
        if (t === "warning") {
          window.showDiagnosis("WARNING", { subtitle: String(message || "Atenção"), onClear: opts.onClear });
        } else {
          window.showDiagnosis("INFO", { subtitle: String(message || "Informação"), onClear: opts.onClear });
        }
        return;
      }
    } catch (_) {}

    const sys = getSystemResponse();
    if (sys) {
      let icon = "bi-info-circle";
      let modalType = "info";
      if (t === "warning") {
        icon = "bi-exclamation-triangle";
        modalType = "warning";
      }

      sys.show({
        title: t === "warning" ? "Atenção" : "Informação",
        subtitle: message,
        type: modalType,
        icon: icon,
        onClear: opts.onClear,
      });
      return;
    }

    alert(message);
    if (opts.onClear) opts.onClear();
  };

  console.log("✅ Sistema Unificado de Notificações configurado.");
})();

/**
 * Registra os botões padrão btn-clear e btn-home para qualquer módulo.
 *
 * Uso:
 *   import { registerModuleActions } from "../../shared/module-actions.js";
 *   registerModuleActions({ onClear: minhaFuncaoLimpar, isBusy: () => false });
 *
 * @param {object} options
 * @param {Function} options.onClear  — função executada ao clicar em #btn-clear (obrigatória)
 * @param {Function} [options.isBusy] — retorna true enquanto o módulo está processando;
 *                                      bloqueia Limpar e Início durante o processo
 */
export function registerModuleActions({ onClear, isBusy } = {}) {
  const clearBtn = document.getElementById("btn-clear");
  if (clearBtn && typeof onClear === "function") {
    clearBtn.addEventListener("click", (e) => {
      if (typeof isBusy === "function" && isBusy()) {
        e.preventDefault();
        return;
      }
      onClear();
    });
  }

  if (typeof isBusy === "function") {
    const homeBtn = document.getElementById("btn-home");
    if (homeBtn) {
      homeBtn.addEventListener("click", (e) => {
        if (isBusy()) {
          e.preventDefault();
          e.stopPropagation();
        }
      });
    }
  }
}

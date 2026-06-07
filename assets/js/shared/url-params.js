/**
 * url-params.js — Captura e persiste parâmetros de URL de marketing.
 *
 * Objetivo principal: quando um usuário acessa tokencafe.app?ref=0xWALLET,
 * salvar o endereço do indicador por 7 dias e expor via getCapturedReferral().
 * O módulo contrato/referral.js usa essa função para auto-preencher o campo.
 *
 * Carregado em todas as páginas via footer.php.
 */

const REF_KEY        = 'tc_ref_from_url';
const REF_EXPIRY_KEY = 'tc_ref_expiry_ms';
const REF_TTL_MS     = 7 * 24 * 60 * 60 * 1000; // 7 dias — padrão de mercado para cookies de afiliado

/** Lê ?ref= da URL e persiste se for um endereço EVM válido. */
function _captureRefFromUrl() {
  try {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (!ref || !/^0x[0-9a-fA-F]{40}$/i.test(ref)) return;
    localStorage.setItem(REF_KEY, ref);
    localStorage.setItem(REF_EXPIRY_KEY, String(Date.now() + REF_TTL_MS));
  } catch (_) {}
}

/**
 * Retorna o endereço do indicador capturado da URL, ou '' se expirado/inexistente.
 * @returns {string}
 */
export function getCapturedReferral() {
  try {
    const ref    = localStorage.getItem(REF_KEY) || '';
    const expiry = Number(localStorage.getItem(REF_EXPIRY_KEY) || '0');
    if (!ref || Date.now() > expiry) {
      _clearCapturedReferral();
      return '';
    }
    return ref;
  } catch (_) { return ''; }
}

/** Remove o referral capturado. Chamar após o deploy bem-sucedido para evitar dupla indicação. */
export function clearCapturedReferral() {
  _clearCapturedReferral();
}

function _clearCapturedReferral() {
  try {
    localStorage.removeItem(REF_KEY);
    localStorage.removeItem(REF_EXPIRY_KEY);
  } catch (_) {}
}

// Executa ao carregar o módulo — captura ?ref= imediatamente antes de qualquer outra coisa
_captureRefFromUrl();

// Expõe globalmente para módulos não-ES e compatibilidade com scripts legados
window.tcUrlParams = { getCapturedReferral, clearCapturedReferral };

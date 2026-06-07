/**
 * session-timeout.js
 * Desconecta a carteira automaticamente após inatividade.
 *
 * Regras:
 * - 30 minutos sem interação → desconecta e limpa toda a memória da sessão
 * - 2 minutos antes exibe banner de aviso com contador regressivo
 * - Qualquer atividade (mouse, teclado, toque) reinicia o timer — MAS apenas
 *   enquanto o banner de aviso NÃO estiver visível. Se o banner aparecer, o
 *   usuário precisa clicar "Continuar ativo" para reativar. Isso evita que
 *   movimentos acidentais do mouse do outro usuário estendam a sessão.
 * - Só ativa quando a sessão está autorizada (carteira conectada)
 */

const TIMEOUT_MS       = 30 * 60 * 1000; // 30 minutos
const WARN_BEFORE_MS   =  2 * 60 * 1000; // aviso 2 minutos antes
const THROTTLE_MS      = 2_000;           // limita reset a 1 vez a cada 2s

const ACTIVITY_EVENTS = ["mousemove", "keydown", "mousedown", "touchstart", "scroll", "click"];

let timeoutTimer    = null;
let warnTimer       = null;
let countdownTimer  = null;
let warnBanner      = null;
let active          = false;
let lastReset       = 0;

// ── Helpers ──────────────────────────────────────────────────────────────────

function isSessionAuthorized() {
  try {
    return window.walletConnector?.getStatus?.()?.sessionAuthorized === true;
  } catch (_) {
    return false;
  }
}

function clearTimers() {
  if (timeoutTimer)   { clearTimeout(timeoutTimer);   timeoutTimer  = null; }
  if (warnTimer)      { clearTimeout(warnTimer);      warnTimer     = null; }
}

function removeWarnBanner() {
  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
  if (warnBanner)     { warnBanner.remove();            warnBanner    = null; }
}

// ── Banner de aviso ──────────────────────────────────────────────────────────

function showWarnBanner(secondsLeft) {
  removeWarnBanner();

  warnBanner = document.createElement("div");
  warnBanner.id = "tc-session-warn";
  Object.assign(warnBanner.style, {
    position:       "fixed",
    bottom:         "24px",
    right:          "20px",
    zIndex:         "99999",
    background:     "rgba(180, 30, 30, 0.97)",
    color:          "#fff",
    padding:        "14px 18px",
    borderRadius:   "10px",
    fontSize:       "0.88rem",
    maxWidth:       "320px",
    boxShadow:      "0 4px 24px rgba(0,0,0,0.5)",
    backdropFilter: "blur(6px)",
    display:        "flex",
    flexDirection:  "column",
    gap:            "10px",
  });

  const title = document.createElement("div");
  title.innerHTML = `<i class="bi bi-shield-exclamation me-2"></i><strong>Sessão expirando por inatividade</strong>`;

  const countdown = document.createElement("div");
  countdown.style.opacity = "0.9";

  const btn = document.createElement("button");
  btn.textContent = "Continuar ativo";
  Object.assign(btn.style, {
    background:   "rgba(255,255,255,0.18)",
    border:       "1px solid rgba(255,255,255,0.4)",
    color:        "#fff",
    padding:      "5px 14px",
    borderRadius: "6px",
    cursor:       "pointer",
    fontSize:     "0.82rem",
    alignSelf:    "flex-start",
  });
  btn.onclick = () => { resetTimer(); removeWarnBanner(); };

  warnBanner.append(title, countdown, btn);
  document.body.appendChild(warnBanner);

  let remaining = secondsLeft;
  const tick = () => {
    const m = Math.floor(remaining / 60);
    const s = String(remaining % 60).padStart(2, "0");
    countdown.textContent = `A carteira será desconectada em ${m}:${s}`;
    remaining--;
  };
  tick();
  countdownTimer = setInterval(tick, 1000);
}

// ── Desconexão por timeout ────────────────────────────────────────────────────

function doTimeout() {
  removeWarnBanner();
  clearTimers();
  stop();

  // Notifica o usuário e executa logout completo
  try {
    if (typeof window.notify === "function") {
      window.notify("Sessão encerrada por inatividade. Carteira desconectada.", "warning");
    }
  } catch (_) {}

  // Aguarda 800ms para que a notificação seja vista antes do redirecionamento
  setTimeout(() => {
    try {
      if (typeof window.handleLogout === "function") {
        window.handleLogout();
      }
    } catch (_) {}
  }, 800);
}

// ── Ciclo do timer ────────────────────────────────────────────────────────────

function resetTimer() {
  if (!active) return;
  clearTimers();

  // Aviso 2 minutos antes de desconectar
  warnTimer = setTimeout(() => {
    if (!isSessionAuthorized()) { stop(); return; }
    showWarnBanner(WARN_BEFORE_MS / 1000);
  }, TIMEOUT_MS - WARN_BEFORE_MS);

  // Logout ao expirar
  timeoutTimer = setTimeout(() => {
    if (!isSessionAuthorized()) { stop(); return; }
    doTimeout();
  }, TIMEOUT_MS);

  lastReset = Date.now();
}

// ── Detecção de atividade ─────────────────────────────────────────────────────

function onActivity() {
  if (!active) return;
  if (warnBanner) return; // Usuário deve clicar "Continuar ativo" para reativar

  const now = Date.now();
  if (now - lastReset < THROTTLE_MS) return;

  if (!isSessionAuthorized()) { stop(); return; }
  resetTimer();
}

// ── Controle ──────────────────────────────────────────────────────────────────

function start() {
  if (active) return;
  active = true;
  ACTIVITY_EVENTS.forEach(evt => document.addEventListener(evt, onActivity, { passive: true, capture: true }));
  resetTimer();
}

function stop() {
  active = false;
  clearTimers();
  removeWarnBanner();
  ACTIVITY_EVENTS.forEach(evt => document.removeEventListener(evt, onActivity, { capture: true }));
}

// ── Integração com eventos da carteira ───────────────────────────────────────

document.addEventListener("wallet:connected", () => {
  // Aguarda o walletConnector atualizar sessionAuthorized
  setTimeout(() => { if (isSessionAuthorized()) start(); }, 300);
});

document.addEventListener("wallet:disconnected", stop);

// Verifica estado inicial — a carteira pode já estar conectada ao carregar
const checkInitialState = () => setTimeout(() => { if (isSessionAuthorized()) start(); }, 700);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", checkInitialState);
} else {
  checkInitialState();
}

// Exposto para debug em desenvolvimento
window._tcSessionTimeout = { start, stop, resetTimer, get active() { return active; } };

<?php
$maintenance = defined("TOKENCAFE_MAINTENANCE_MODE") && (bool) TOKENCAFE_MAINTENANCE_MODE;
?>

<div class="tc-system-health-host" data-maintenance="<?= $maintenance ? "1" : "0" ?>">
  <div class="tc-status-row">
    <div class="tc-status-pills" role="group" aria-label="Status do Sistema">
      <span class="tc-status-pill tc-pill-warn" data-role="modules" data-state="warn">
        <span class="tc-status-pill__icon"><i class="bi bi-grid-1x2"></i></span>
        <span class="tc-status-pill__label">MÓDULOS</span>
        <span class="tc-status-pill__value" data-role="modulesValue">…</span>
      </span>
      <span class="tc-status-pill tc-pill-warn" data-role="system" data-state="warn">
        <span class="tc-status-pill__icon"><i class="bi bi-cpu"></i></span>
        <span class="tc-status-pill__label">SISTEMA</span>
        <span class="tc-status-pill__value">…</span>
      </span>
      <span class="tc-status-pill tc-pill-warn" data-role="api" data-state="warn">
        <span class="tc-status-pill__icon"><i class="bi bi-cloud-check"></i></span>
        <span class="tc-status-pill__label">API</span>
        <span class="tc-status-pill__value">…</span>
      </span>
      <span class="tc-status-pill tc-pill-warn" data-role="wallet" data-state="warn">
        <span class="tc-status-pill__icon"><i class="bi bi-wallet2"></i></span>
        <span class="tc-status-pill__label">CARTEIRA</span>
        <span class="tc-status-pill__value">…</span>
      </span>
      <span class="tc-status-pill tc-pill-warn" data-role="maint" data-state="warn">
        <span class="tc-status-pill__icon"><i class="bi bi-tools"></i></span>
        <span class="tc-status-pill__label">MANUT.</span>
        <span class="tc-status-pill__value">…</span>
      </span>
    </div>
  </div>
</div>

<script type="module">
  import { getApiBase } from "./assets/js/shared/verify-utils.js";

  const initHost = (host) => {
    if (!host || host.__tcSystemStatusInitialized === true) return;
    host.__tcSystemStatusInitialized = true;

    // Wrapper é o nó que possui os data-mod-* (injetado pelo Tools).
    const wrapper = host.closest('[data-component="modules/system-status/system-status-tile.php"]');
    const root = host;

    const modulesEl = host.querySelector('[data-role="modules"]');
    const modulesValEl = host.querySelector('[data-role="modulesValue"]');
    const systemEl = host.querySelector('[data-role="system"]');
    const apiEl = host.querySelector('[data-role="api"]');
    const walletEl = host.querySelector('[data-role="wallet"]');
    const maintEl = host.querySelector('[data-role="maint"]');

    // Aplica o estado visual (ok/warn/bad) em uma pílula.
    // Se ela tiver um value customizado (HTML), não sobrescreva com textContent.
    const setPillState = (pillEl, state) => {
      if (!pillEl) return;
      pillEl.setAttribute("data-state", state);
      pillEl.classList.remove("tc-pill-ok", "tc-pill-warn", "tc-pill-bad");
      if (state === "ok") pillEl.classList.add("tc-pill-ok");
      else if (state === "bad") pillEl.classList.add("tc-pill-bad");
      else pillEl.classList.add("tc-pill-warn");
    };

    // Aplica estado + texto simples.
    const setPillText = (pillEl, state, text) => {
      if (!pillEl) return;
      setPillState(pillEl, state);
      const v = pillEl.querySelector(".tc-status-pill__value");
      if (v) v.textContent = text;
    };

    const setState = (el, state, text) => {
      if (!el) return;
      setPillText(el, state, text);
    };

    const checkApi = async () => {
      const base = String(getApiBase() || "").trim();
      if (!base) return { ok: false, ms: null };
      const url = `${base.replace(/\/$/, "")}/health`;
      const t0 = performance.now();
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const resp = await fetch(url, { method: "GET", signal: controller.signal });
        clearTimeout(timeout);
        const ms = Math.round(performance.now() - t0);
        return { ok: !!resp.ok, ms };
      } catch (_) {
        const ms = Math.round(performance.now() - t0);
        return { ok: false, ms };
      }
    };

    const checkWallet = () => {
      try {
        if (window.ethereum) return { ok: true };
      } catch (_) {}
      return { ok: false };
    };

    const checkMaintenance = () => {
      const on = root && root.getAttribute("data-maintenance") === "1";
      return { on };
    };

    const run = async () => {
      try {
        // MÓDULOS: exibir "finalizados/em breve" (valores vêm do Tools via data-mod-*).
        const finished = parseInt(wrapper?.getAttribute?.("data-mod-active") || "0", 10) || 0;
        const soon = parseInt(wrapper?.getAttribute?.("data-mod-soon") || "0", 10) || 0;
        const total = parseInt(wrapper?.getAttribute?.("data-mod-total") || "0", 10) || 0;
        const mode = String(wrapper?.getAttribute?.("data-mod-mode") || "").toLowerCase();

        if (modulesValEl) {
          const a = Math.max(0, finished);
          const s = Math.max(0, soon);
          if (mode === "user" || s === 0) {
            modulesValEl.innerHTML = `<span class="tc-status-ok">${a}</span>`;
          } else {
            modulesValEl.innerHTML = `<span class="tc-status-ok">${a}</span>/<span class="tc-status-bad">${s}</span>`;
          }
        }
        if (modulesEl) {
          // Estado do pill "MÓDULOS" é apenas visual (não sobrescreve o value HTML acima).
          if (mode === "user") {
            setPillState(modulesEl, "ok");
          } else if (soon <= 0 && total > 0 && finished >= total) {
            setPillState(modulesEl, "ok");
          } else if (soon > 0) {
            setPillState(modulesEl, "warn");
          } else {
            setPillState(modulesEl, "ok");
          }
        }
      } catch (_) {}

      // Estado inicial curto (evita "verificando/verificado").
      setState(systemEl, "warn", "...");
      setState(apiEl, "warn", "...");
      setState(walletEl, "warn", "...");
      setState(maintEl, "warn", "...");

      const [api, wallet] = await Promise.all([checkApi(), Promise.resolve(checkWallet())]);
      const maint = checkMaintenance();

      setState(apiEl, api.ok ? "ok" : "bad", api.ok ? "OK" : "OFF");
      setState(walletEl, wallet.ok ? "ok" : "warn", wallet.ok ? "OK" : "N/D");
      setState(maintEl, maint.on ? "warn" : "ok", maint.on ? "ON" : "OFF");

      const isOk = api.ok && !maint.on;
      const isBad = !api.ok;
      if (isOk) {
        setState(systemEl, "ok", "OK");
      } else if (isBad) {
        setState(systemEl, "bad", "FALHA");
      } else {
        setState(systemEl, "warn", maint.on ? "MANUT." : "ATENÇÃO");
      }
    };

    setTimeout(run, 50);
  };

  try {
    document.querySelectorAll(".tc-system-health-host").forEach(initHost);
  } catch (_) {}
</script>

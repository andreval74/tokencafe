
import PageManager from "../../shared/page-manager.js";
import { walletConnector } from "../../shared/wallet-connector.js";
import { NetworkManager } from "../../shared/network-manager.js";
import { WidgetSimple } from "./widget-simple.js";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Evita múltiplas instâncias: reutiliza se já existir
    let widgetSimple = window.widgetSimple;
    if (!(widgetSimple instanceof WidgetSimple)) {
      widgetSimple = new WidgetSimple();
    }
    window.widgetSimple = widgetSimple; // Disponibiliza globalmente se necessário
    await widgetSimple.init();
  } catch (e) {
    console.error("Falha ao instanciar/iniciar WidgetSimple:", e);
  }

  const pm = new PageManager("link");
  try {
    await pm.init();
  } catch (e) {
    console.warn("Falha ao iniciar PageManager:", e?.message || e);
  }

  // Override inicial com dados fornecidos (para validação controlada)
  window.__overrideChainId = 97;
  window.__overrideSaleContract = "0x2701B4ef482BE4DD8A653B7C97090713A9a0AFE6";
  window.__overrideReceiverWallet = "0xEe02E32d8d2888E9f1D6d13391E716Bc7F41f6Ae";
  window.__overrideTokenContract = "0x2cf724171a998C3d470048AC2F1b187a48A5cafE";

  // Preencher UI com overrides
  try {
    const sel = document.getElementById("blockchain");
    if (sel) sel.value = String(window.__overrideChainId);
    const saleEl = document.getElementById("saleContract");
    if (saleEl) saleEl.value = window.__overrideSaleContract;
    const nm = new NetworkManager();
    const net = nm.getNetworkById(window.__overrideChainId);
    const symSpan = document.getElementById("currencySymbol");
    if (symSpan && net?.nativeCurrency?.symbol) symSpan.textContent = net.nativeCurrency.symbol;
    window.__selectedNetwork = net || null;
  } catch (_) {}

  // Integrar eventos do componente de busca de rede
  document.addEventListener("network:selected", (ev) => {
    const net = ev?.detail?.network;
    if (!net) return;
    const sel = document.getElementById("blockchain");
    if (sel) sel.value = String(net.chainId);
    const symSpan = document.getElementById("currencySymbol");
    if (symSpan && net?.nativeCurrency?.symbol) symSpan.textContent = net.nativeCurrency.symbol;
    window.__selectedNetwork = net;
  });
  document.addEventListener("network:clear", () => {
    const sel = document.getElementById("blockchain");
    if (sel) sel.value = "";
    window.__selectedNetwork = null;
  });

  // Já inicializado acima; não chamar init novamente para evitar duplicações
});

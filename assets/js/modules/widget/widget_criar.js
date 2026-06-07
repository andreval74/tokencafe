
import PageManager from "../../shared/page-manager.js";
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

import { BaseSystem } from "../shared/base-system.js";

/**
 * Lógica da página de Investidor
 */
document.addEventListener("DOMContentLoaded", async () => {
  const baseSystem = new BaseSystem();
  await baseSystem.init();
  console.log("🚀 BaseSystem iniciado (investidor)");
});

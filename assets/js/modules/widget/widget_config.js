// Mini Widget Config — integração de busca de redes padronizada
// Reutiliza NetworkManager sem duplicar lógica dos módulos link/rpc

import { networkManager } from "../../shared/network-manager.js";

function $(id) {
  return document.getElementById(id);
}

function renderAutocomplete(list) {
  const ac = $("networkAutocomplete");
  if (!ac) return;
  if (!list || list.length === 0) {
    ac.classList.add("d-none");
    ac.innerHTML = "";
    return;
  }
  ac.innerHTML = list
    .map(
      (n) => `
    <div class="autocomplete-item" data-chainid="${n.chainId}">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <strong>${n.name}</strong>
          <small class="d-block text-muted">Chain ID: ${n.chainId}</small>
        </div>
        <span class="badge bg-dark-elevated text-tokencafe">${n.nativeCurrency?.symbol || "N/A"}</span>
      </div>
    </div>
  `,
    )
    .join("");

  ac.querySelectorAll(".autocomplete-item").forEach((item) => {
    item.addEventListener("click", () => {
      const chainId = parseInt(item.dataset.chainid);
      selectNetwork(chainId);
    });
  });

  ac.classList.remove("d-none");
}

function selectNetwork(chainId) {
  const net = networkManager?.getNetworkById(chainId);
  if (!net) return;

  const search = $("networkSearch");
  const chainInput = $("chainIdDec");
  const ac = $("networkAutocomplete");

  if (chainInput) chainInput.value = String(net.chainId);
  if (search) {
    search.value = net.name;
    search.dataset.chainId = String(net.chainId);
  }
  if (ac) {
    ac.classList.add("d-none");
    ac.innerHTML = "";
  }
}

function setupEvents() {
  const search = $("networkSearch");
  const ac = $("networkAutocomplete");
  if (!search) return;

  search.addEventListener("focus", () => {
    const popular = networkManager?.getPopularNetworks(8) || [];
    renderAutocomplete(popular);
  });

  search.addEventListener("input", (e) => {
    const q = String(e.target.value || "").replace(/\s+$/u, "");
    const results = q.length < 2 ? networkManager?.getPopularNetworks(8) || [] : networkManager?.searchNetworks(q, 10) || [];
    renderAutocomplete(results);
  });

  // Fechar autocomplete ao clicar fora
  document.addEventListener("click", (evt) => {
    if (!ac || !search) return;
    const isInside = ac.contains(evt.target) || search.contains(evt.target);
    if (!isInside) ac.classList.add("d-none");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupEvents();
});

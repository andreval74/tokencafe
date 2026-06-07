/**
 * model-pricing.js
 * Exibe preços de cada modelo de contrato em moeda nativa da rede conectada.
 * Mostra: taxa de serviço + gas estimado + total.
 * Gas é estimado com o gas price atual da rede (ou defaults por chain).
 */

import { PriceService } from "../../shared/price-service.js";
import { state } from "./builder.js";

// Gas limits por modelo — lidos de TC_SYSTEM_SETTINGS (painel admin) com fallback hardcoded
const GAS_LIMITS = Object.assign(
    { "erc20-minimal": 1_200_000, "erc20-controls": 1_500_000, "erc20-advanced": 2_000_000, "erc20-directsale": 2_500_000 },
    window.TC_SYSTEM_SETTINGS?.contracts?.gasLimits ?? {}
);

// Gas price padrão (em gwei) quando não há provider conectado, por chain
function defaultGasGwei(chainId) {
    const id = parseInt(chainId);
    if (id === 56 || id === 97)          return 3;    // BSC
    if (id === 137 || id === 80001)      return 100;  // Polygon
    if (id === 43114)                    return 25;   // Avalanche
    return 20; // ETH e outros
}

let _lastChainId = null;

// ── DOM helpers ────────────────────────────────────────────────────────────
const getIndicator  = () => document.getElementById("tc-model-rate-indicator");
const getRateText   = () => document.getElementById("tc-model-rate-text");
const getSpinner    = () => document.getElementById("tc-model-rate-spinner");
const getPriceBlocks = () => document.querySelectorAll(".tc-contract-price-block[data-model]");

// ── Formata quantidade nativa (precisão dinâmica) ──────────────────────────
function fmtNative(amount) {
    if (amount < 0.0001) return amount.toFixed(6);
    if (amount < 0.001)  return amount.toFixed(5);
    if (amount < 0.01)   return amount.toFixed(4);
    if (amount < 1)      return amount.toFixed(4);
    return amount.toFixed(3);
}

// ── Busca gas price real ou usa default ────────────────────────────────────
async function getGasPriceGwei(chainId) {
    try {
        if (state.wallet?.provider && typeof ethers !== "undefined") {
            const gp   = await state.wallet.provider.getGasPrice();
            const gwei = parseFloat(ethers.utils.formatUnits(gp, "gwei"));
            if (gwei > 0) return gwei;
        }
    } catch (_) { /* sem provider — usa default */ }
    return defaultGasGwei(chainId);
}

// ── Busca saldo da carteira ativa via RPC direta ──────────────────────────
async function fetchWalletBalance() {
    try {
        if (!window.ethereum) return null;

        // Prioridade: conta gerenciada pelo walletConnector (= o que aparece no header)
        // wallet:connected dispara com e.detail.account = esse endereço
        const addr = window.walletConnector?.getStatus?.()?.account
            || localStorage.getItem("tokencafe_wallet_address")
            || window.ethereum.selectedAddress
            || state.wallet?.address;

        if (!addr) return null;

        const balHex = await window.ethereum.request({
            method: 'eth_getBalance',
            params: [addr, 'latest'],
        });
        if (!balHex) return null;

        const bal = typeof ethers !== "undefined" && ethers.utils?.formatEther
            ? parseFloat(ethers.utils.formatEther(balHex))
            : parseInt(balHex, 16) / 1e18;

        console.log(`[TC] saldo (${addr.slice(0, 8)}…): ${bal}`);
        return bal;
    } catch (e) {
        console.warn("[TC] fetchWalletBalance erro:", e);
    }
    return null;
}

// ── Habilita/desabilita cards com base no saldo disponível ────────────────
// walletBalance: null = carteira não conectada ou sem cotação → não filtra
//                número (inclusive 0) = saldo real → compara com custo
export function applyAffordabilityFilter(walletBalance) {
    const cards = document.querySelectorAll(".contract-card[data-value]");
    let firstAffordable = null;

    cards.forEach(card => {
        const totEl      = card.querySelector(".tc-price-total");
        const totalNative = parseFloat(totEl?.dataset.totalNative || 0);

        // null = sem informação de saldo → não aplica filtro
        // totalNative = 0 → cotação indisponível → não aplica filtro
        const canAfford = walletBalance === null || totalNative <= 0 || walletBalance >= totalNative;

        // Remove badge anterior (é irmão do card, não filho)
        document.querySelector(`.tc-insufficient-badge[data-for="${card.dataset.value}"]`)?.remove();

        if (!canAfford) {
            card.classList.add("tc-unaffordable");
            card.setAttribute("data-unaffordable", "true");
            // Badge inserido APÓS o card (fora da opacidade)
            const badge = document.createElement("div");
            badge.className = "tc-insufficient-badge";
            badge.dataset.for = card.dataset.value;
            badge.innerHTML = `<i class="bi bi-exclamation-circle me-1"></i>Saldo insuficiente para este modelo`;
            card.insertAdjacentElement("afterend", badge);
        } else {
            card.classList.remove("tc-unaffordable");
            card.removeAttribute("data-unaffordable");
            if (!firstAffordable) firstAffordable = card;
        }
    });

    // Se o card selecionado ficou inviável, muda para o mais barato acessível
    const selected = document.querySelector(".contract-card.selected");
    if (selected?.dataset.unaffordable === "true" && firstAffordable) {
        selected.classList.remove("selected");
        firstAffordable.classList.add("selected");
        const input = document.getElementById("contractGroup");
        if (input && input.value !== firstAffordable.dataset.value) {
            input.value = firstAffordable.dataset.value;
            input.dispatchEvent(new Event("change"));
        }
    }
}

// ── Restaura valores em USD (sem rede / cotação indisponível) ─────────────
function showUSD() {
    const ind = getIndicator();
    if (ind) ind.classList.add("d-none");

    getPriceBlocks().forEach(block => {
        const svcEl   = block.querySelector(".tc-price-service");
        const gasEl   = block.querySelector(".tc-price-gas");
        const totEl   = block.querySelector(".tc-price-total");
        const usd     = parseFloat(svcEl?.dataset.usd || 0);

        if (svcEl) { svcEl.textContent = `$${Math.round(usd)}`; svcEl.title = ""; }
        if (gasEl) { gasEl.textContent = "—"; gasEl.title = ""; }
        if (totEl) {
            totEl.textContent = `~$${Math.round(usd)}`;
            totEl.title = "";
            delete totEl.dataset.totalNative;
        }
    });

    // Sem cotação nativa → não é possível comparar com saldo → remove filtro
    applyAffordabilityFilter(null);
}

// ── Atualização principal ─────────────────────────────────────────────────
export async function updateModelPrices(chainId) {
    if (!chainId) {
        _lastChainId = null;
        showUSD();
        return;
    }

    _lastChainId = chainId;

    const ind = getIndicator();
    const txt = getRateText();
    const spn = getSpinner();

    if (ind) ind.classList.remove("d-none");
    if (spn) spn.classList.remove("d-none");
    if (txt) txt.textContent = "…";

    try {
        const [price, gasPriceGwei] = await Promise.all([
            PriceService.getNativeCoinPrice(chainId),
            getGasPriceGwei(chainId),
        ]);

        const sym = PriceService.getNativeSymbol(chainId);

        // Descarta resposta obsoleta se rede mudou durante o fetch
        if (_lastChainId !== chainId) return;

        if (price > 0) {
            // Atualiza indicador de cotação
            const fmtPrice = price >= 1000
                ? price.toLocaleString("pt-BR", { maximumFractionDigits: 0 })
                : price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            if (txt) txt.textContent = `1 ${sym} ≈ $${fmtPrice}`;

            // Gas price em ETH (gwei → ETH: divide por 1e9)
            const gasPriceEth = gasPriceGwei / 1e9;

            getPriceBlocks().forEach(block => {
                const modelKey = block.dataset.model;
                const gasLimit = GAS_LIMITS[modelKey] ?? 1_500_000;

                const svcEl = block.querySelector(".tc-price-service");
                const gasEl = block.querySelector(".tc-price-gas");
                const totEl = block.querySelector(".tc-price-total");

                const usdSvc    = parseFloat(svcEl?.dataset.usd || 0);
                const svcNative = usdSvc / price;
                const gasNative = gasLimit * gasPriceEth;
                const totNative = svcNative + gasNative;

                const usdGas = gasNative * price;
                const usdTot = usdSvc + usdGas;

                if (svcEl) {
                    svcEl.textContent = `${fmtNative(svcNative)} ${sym}`;
                    svcEl.title       = `≈ $${Math.round(usdSvc)} USD`;
                }
                if (gasEl) {
                    gasEl.textContent = `~${fmtNative(gasNative)} ${sym}`;
                    gasEl.title       = `≈ $${usdGas.toFixed(2)} · ${gasPriceGwei.toFixed(1)} Gwei`;
                }
                if (totEl) {
                    totEl.textContent          = `~${fmtNative(totNative)} ${sym}`;
                    totEl.title                = `≈ $${usdTot.toFixed(2)} USD`;
                    totEl.dataset.totalNative  = totNative; // usado pelo filtro de saldo
                }
            });

            // Aplica filtro de acessibilidade com saldo atual da carteira
            try {
                const bal = await fetchWalletBalance();
                applyAffordabilityFilter(bal);
            } catch (_) {}
        } else {
            if (txt) txt.textContent = "cotação indisponível";
            showUSD();
        }
    } catch (_) {
        if (_lastChainId === chainId) {
            const t = getRateText();
            if (t) t.textContent = "cotação indisponível";
        }
        showUSD();
    } finally {
        const s = getSpinner();
        if (s) s.classList.add("d-none");
    }
}

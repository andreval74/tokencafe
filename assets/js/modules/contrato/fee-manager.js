
import { PriceService } from "../../shared/price-service.js";
import { NetworkManager } from "../../shared/network-manager.js";
import { PAYMENT_CONFIG, getModelPrice } from "./payment-config.js";
import { diagnoseEvmError, showDiagnosis } from "../../ai/diagnostics.js";
import { getReferrer } from "./referral.js";

const MODEL_LABELS = {
    "erc20-minimal":    "ERC20 Padrão",
    "erc20-controls":   "ERC20 Gerenciável",
    "erc20-advanced":   "ERC20 Avançado",
    "erc20-directsale": "ERC20 Venda/ICO",
    "tokensale-separado": "TokenSale Separado",
    "upgradeable-uups": "Upgradeable UUPS",
};

export class FeeManager {
    constructor() {
        this.nm = new NetworkManager();
    }

    /**
     * Exibe o modal de confirmação de pagamento e deploy
     * @param {Object} signer - Signer do ethers.js
     * @param {Object} network - Objeto de rede { chainId, name }
     * @param {BigNumber} estimatedGasLimit - Limite de gas estimado
     * @param {string|null} [modelKey] - Chave do modelo (ex: "erc20-advanced") para preço específico
     * @returns {Promise<{ok: boolean, signer?: Object, billingAddress?: string | null}>}
     */
    async confirmAndPay(signer, network, estimatedGasLimit, modelKey = null) {
        // Atualiza o provider mas mantém o endereço do signer recebido (não pega conta ativa do MetaMask)
        try {
            if (window.ethereum && ethers?.providers?.Web3Provider) {
                const addr = await signer.getAddress();
                const providerNow = new ethers.providers.Web3Provider(window.ethereum);
                signer = providerNow.getSigner(addr);
            }
        } catch (_) {}

        // 1. Verificar se é Testnet
        const isTestnet = this.nm.isTestNetwork(network.chainId);

        if (isTestnet && !PAYMENT_CONFIG.CHARGE_ON_TESTNET) {
            let addr = null;
            try {
                addr = await signer.getAddress();
            } catch (_) {}
            return { ok: true, signer, billingAddress: addr };
        }

        // 2. Obter dados financeiros
        const nativeSymbol = PriceService.getNativeSymbol(network.chainId);
        const nativePrice  = await PriceService.getNativeCoinPrice(network.chainId);
        const safePrice    = nativePrice > 0 ? nativePrice : 2000;

        // Referral: lê indicador validado (string vazia se não houver)
        const referrerAddr = getReferrer();
        const hasReferral  = Boolean(referrerAddr);

        // Cálculo de taxas com ou sem referral
        const baseServiceFeeUSD      = getModelPrice(modelKey);
        const discountUSD            = hasReferral ? baseServiceFeeUSD * 0.10 : 0;
        const userServiceFeeUSD      = baseServiceFeeUSD - discountUSD;          // 90% ou 100%
        const platformPortionUSD     = hasReferral ? baseServiceFeeUSD * 0.80 : baseServiceFeeUSD;
        const referrerPortionUSD     = hasReferral ? baseServiceFeeUSD * 0.10 : 0;

        const serviceFeeCrypto       = userServiceFeeUSD / safePrice;            // o que o usuário paga
        const platformPortionCrypto  = platformPortionUSD / safePrice;
        const referrerPortionCrypto  = referrerPortionUSD / safePrice;

        // Gas
        let gasPrice = await signer.getGasPrice();
        const gasCostWei    = estimatedGasLimit.mul(gasPrice);
        const gasCostCrypto = parseFloat(ethers.utils.formatEther(gasCostWei));
        const gasCostUSD    = gasCostCrypto * safePrice;

        // Saldo
        const balanceWei     = await signer.getBalance();
        const balanceCrypto  = parseFloat(ethers.utils.formatEther(balanceWei));
        const totalCostCrypto = serviceFeeCrypto + gasCostCrypto;
        const isBalanceEnough = balanceCrypto >= totalCostCrypto;

        let billingAddress = null;
        try {
            billingAddress = await signer.getAddress();
        } catch (_) {}

        let activeSigner = signer;
        let latestCalc = {
            symbol: nativeSymbol,
            baseServiceFeeUSD,
            discountUSD,
            userServiceFeeUSD,
            platformPortionUSD,
            referrerPortionUSD,
            platformPortionCrypto,
            referrerPortionCrypto,
            serviceFeeCrypto,
            gasCostUSD,
            gasCostCrypto,
            totalCostCrypto,
            balanceCrypto,
            isBalanceEnough,
            isTestnet,
            billingAddress,
            hasReferral,
            referrerAddr,
        };

        const recalc = async () => {
            // Provider fresco para gas atualizado, mantendo o endereço original
            try {
                if (window.ethereum && ethers?.providers?.Web3Provider) {
                    const addr = await activeSigner.getAddress();
                    const providerNow = new ethers.providers.Web3Provider(window.ethereum);
                    activeSigner = providerNow.getSigner(addr);
                }
            } catch (_) {}

            const nativePrice2      = await PriceService.getNativeCoinPrice(network.chainId);
            const safePrice2        = nativePrice2 > 0 ? nativePrice2 : 2000;

            const serviceFeeCrypto2      = userServiceFeeUSD / safePrice2;
            const platformCrypto2        = platformPortionUSD / safePrice2;
            const referrerCrypto2        = referrerPortionUSD / safePrice2;

            const gasPrice2       = await activeSigner.getGasPrice();
            const gasCostWei2     = estimatedGasLimit.mul(gasPrice2);
            const gasCostCrypto2  = parseFloat(ethers.utils.formatEther(gasCostWei2));
            const gasCostUSD2     = gasCostCrypto2 * safePrice2;

            const totalCostCrypto2 = serviceFeeCrypto2 + gasCostCrypto2;

            latestCalc = {
                symbol: nativeSymbol,
                baseServiceFeeUSD,
                discountUSD,
                userServiceFeeUSD,
                platformPortionUSD,
                referrerPortionUSD,
                platformPortionCrypto: platformCrypto2,
                referrerPortionCrypto: referrerCrypto2,
                serviceFeeCrypto: serviceFeeCrypto2,
                gasCostUSD: gasCostUSD2,
                gasCostCrypto: gasCostCrypto2,
                totalCostCrypto: totalCostCrypto2,
                isTestnet,
                hasReferral,
                referrerAddr,
            };
            return latestCalc;
        };

        // 3. Renderizar Modal
        return new Promise((resolve) => {
            this.showModal({
                ...latestCalc,
                modelKey,
                recalc,
                onConfirm: async () => {
                    try {
                        await recalc();
                        if (latestCalc.serviceFeeCrypto > 0) {
                            await this.processServiceFeePayment(
                                activeSigner,
                                latestCalc.platformPortionCrypto,
                                latestCalc.referrerPortionCrypto,
                                latestCalc.hasReferral ? latestCalc.referrerAddr : null,
                                nativeSymbol
                            );
                        }
                        let addrNow = null;
                        try {
                            addrNow = await activeSigner.getAddress();
                        } catch (_) {}
                        resolve({ ok: true, signer: activeSigner, billingAddress: addrNow });
                    } catch (e) {
                        const d = diagnoseEvmError(e, { nativeSymbol });
                        showDiagnosis(d.code, { badge: d.badge, causes: d.causes });
                        resolve({ ok: false });
                    }
                },
                onCancel: () => resolve({ ok: false })
            });
        });
    }

    async processServiceFeePayment(signer, platformCrypto, referrerCrypto, referrerAddr, symbol, onReferralStart) {
        const btn = document.getElementById("btnConfirmDeployFee");

        // 1ª transação: plataforma (80% ou 100% sem referral)
        if (btn) {
            btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processando Taxa...`;
            btn.disabled = true;
        }
        const platformWei = ethers.utils.parseEther(platformCrypto.toFixed(18));
        const tx1 = await signer.sendTransaction({ to: PAYMENT_CONFIG.RECEIVER_WALLET, value: platformWei });
        if (btn) btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Confirmando...`;
        await tx1.wait(1);

        let txReferrer = null;
        // 2ª transação: indicador (10% — somente se houver referral)
        if (referrerAddr && referrerCrypto > 0) {
            // Notifica a UI que a TX de plataforma acabou e o bônus vai começar
            await onReferralStart?.();
            if (btn) btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Enviando bônus ao indicador...`;
            const referrerWei = ethers.utils.parseEther(referrerCrypto.toFixed(18));
            const tx2 = await signer.sendTransaction({ to: referrerAddr, value: referrerWei });
            await tx2.wait(1);
            txReferrer = tx2.hash;
        }

        return { txPlatform: tx1.hash, txReferrer };
    }

    /**
     * Calcula custos sem abrir modal — usado pela página de deploy.
     * @param {Object} signer
     * @param {Object} network
     * @param {BigNumber|null} estimatedGasLimit
     * @param {string|null} [modelKey] - Chave do modelo para preço específico
     * @returns {Promise<Object>} breakdown de custos (mesmo shape que latestCalc em confirmAndPay)
     */
    async calculateFees(signer, network, estimatedGasLimit, modelKey = null) {
        const isTestnet = this.nm.isTestNetwork(network.chainId);
        const nativeSymbol = PriceService.getNativeSymbol(network.chainId);
        const nativePrice  = await PriceService.getNativeCoinPrice(network.chainId);
        const safePrice    = nativePrice > 0 ? nativePrice : 2000;

        const referrerAddr = getReferrer();
        const hasReferral  = Boolean(referrerAddr);

        const baseServiceFeeUSD     = getModelPrice(modelKey);
        const discountUSD           = hasReferral ? baseServiceFeeUSD * 0.10 : 0;
        const userServiceFeeUSD     = baseServiceFeeUSD - discountUSD;
        const platformPortionUSD    = hasReferral ? baseServiceFeeUSD * 0.80 : baseServiceFeeUSD;
        const referrerPortionUSD    = hasReferral ? baseServiceFeeUSD * 0.10 : 0;

        const serviceFeeCrypto      = userServiceFeeUSD    / safePrice;
        const platformPortionCrypto = platformPortionUSD   / safePrice;
        const referrerPortionCrypto = referrerPortionUSD   / safePrice;

        // Usa o limite fornecido ou estimativa padrão para deploy de contrato ERC20
        const gasLimitToUse = estimatedGasLimit ?? ethers.BigNumber.from(1_500_000);
        let gasCostCrypto = 0;
        let gasCostUSD    = 0;
        try {
            const gasPrice   = await signer.getGasPrice();
            const gasCostWei = gasLimitToUse.mul(gasPrice);
            gasCostCrypto    = parseFloat(ethers.utils.formatEther(gasCostWei));
            gasCostUSD       = gasCostCrypto * safePrice;
        } catch (_) {}

        const balanceWei      = await signer.getBalance();
        const balanceCrypto   = parseFloat(ethers.utils.formatEther(balanceWei));
        const totalCostCrypto = serviceFeeCrypto + gasCostCrypto;
        const isBalanceEnough = balanceCrypto >= totalCostCrypto;

        let billingAddress = null;
        try { billingAddress = await signer.getAddress(); } catch (_) {}

        return {
            symbol: nativeSymbol,
            baseServiceFeeUSD,
            discountUSD,
            userServiceFeeUSD,
            platformPortionUSD,
            referrerPortionUSD,
            platformPortionCrypto,
            referrerPortionCrypto,
            serviceFeeCrypto,
            gasCostUSD,
            gasCostCrypto,
            totalCostCrypto,
            balanceCrypto,
            isBalanceEnough,
            isTestnet,
            billingAddress,
            hasReferral,
            referrerAddr,
        };
    }

    /**
     * Executa o pagamento da taxa diretamente, sem modal.
     * @param {Object} signer
     * @param {Object} fees  - retorno de calculateFees()
     * @param {Function} [onProgress] - callback(mensagem: string)
     */
    async payFeeDirect(signer, fees, onProgress, onReferralStart) {
        // Testnet sem cobrança: retorna sem enviar transações
        if (fees.isTestnet && !PAYMENT_CONFIG.CHARGE_ON_TESTNET) return {};
        if (!fees.isBalanceEnough) throw new Error("Saldo insuficiente para pagar a taxa");
        if (fees.serviceFeeCrypto > 0) {
            onProgress?.("Pagando taxa de serviço...");
            return await this.processServiceFeePayment(
                signer,
                fees.platformPortionCrypto,
                fees.referrerPortionCrypto,
                fees.hasReferral ? fees.referrerAddr : null,
                fees.symbol,
                onReferralStart
            );
        }
        return {};
    }

    showModal(data) {
        const oldModal = document.getElementById("deployFeeModal");
        if (oldModal) oldModal.remove();

        const addr      = data.billingAddress ? String(data.billingAddress) : "";
        const shortAddr = addr && addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : (addr || "—");
        const shortRef  = data.referrerAddr && data.referrerAddr.length > 12
            ? `${data.referrerAddr.slice(0, 6)}…${data.referrerAddr.slice(-4)}`
            : (data.referrerAddr || "");

        // Bloco de referral (só aparece quando há indicador)
        const referralBlock = data.hasReferral ? `
            <div class="tc-modal-referral-block mb-3">
                <div class="d-flex align-items-center gap-2 mb-2">
                    <i class="bi bi-gift-fill text-success"></i>
                    <span class="tc-label-caps text-success">Desconto por Indicação</span>
                </div>
                <div class="tc-modal-details-box">
                    <div class="d-flex align-items-center justify-content-between gap-3">
                        <div class="tc-text-sm tc-status-text">Taxa base do serviço</div>
                        <div class="tc-text-sm tc-status-text text-nowrap">($<span class="fee-base-usd">${data.baseServiceFeeUSD.toFixed(2)}</span>)</div>
                    </div>
                    <div class="d-flex align-items-center justify-content-between gap-3 mt-1">
                        <div class="tc-text-sm text-success"><i class="bi bi-tag-fill me-1"></i>Seu desconto (−10%)</div>
                        <div class="tc-text-sm text-success text-nowrap">−$<span class="fee-discount-usd">${data.discountUSD.toFixed(2)}</span></div>
                    </div>
                    <div class="d-flex align-items-center justify-content-between gap-3 mt-2 pt-2 tc-divider-top">
                        <div class="tc-text-sm text-info fw-semibold">Taxa de serviço (com desconto)</div>
                        <div class="fw-semibold text-info text-nowrap">($<span class="fee-user-usd">${data.userServiceFeeUSD.toFixed(2)}</span>) <span id="feeServiceFeeValue">${data.serviceFeeCrypto.toFixed(6)}</span> <span>${data.symbol}</span></div>
                    </div>
                    <div class="d-flex align-items-center justify-content-between gap-3 mt-2 pt-2 tc-divider-top">
                        <div class="tc-text-sm tc-status-text"><i class="bi bi-send me-1"></i>Bônus do indicador</div>
                        <div class="tc-text-sm tc-status-text text-nowrap">$${data.referrerPortionUSD.toFixed(2)} → <span class="text-warning font-monospace">${shortRef}</span></div>
                    </div>
                    <div class="d-flex align-items-center justify-content-between gap-3 mt-1">
                        <div class="tc-text-sm tc-status-text"><i class="bi bi-building me-1"></i>Plataforma recebe</div>
                        <div class="tc-text-sm tc-status-text text-nowrap">$${data.platformPortionUSD.toFixed(2)} (80%)</div>
                    </div>
                </div>
            </div>` : `
            <div class="tc-modal-details-box mb-3">
                <div class="d-flex align-items-center justify-content-between gap-3">
                    <div class="text-info">Taxa de serviço</div>
                    <div class="text-info text-end text-nowrap">($<span id="feeServiceFeeUsdValue">${data.baseServiceFeeUSD.toFixed(2)}</span>)</div>
                    <div class="text-info text-end fw-semibold text-nowrap"><span id="feeServiceFeeValue">${data.serviceFeeCrypto.toFixed(6)}</span> <span class="ms-1">${data.symbol}</span></div>
                </div>
            </div>`;

        const modelLabel = MODEL_LABELS[data.modelKey] || data.modelKey || "Padrão";
        const modelBadgeHtml = `
            <div class="d-flex align-items-center gap-2 px-3 py-2" style="background:rgba(13,202,240,.08);border-bottom:1px solid rgba(13,202,240,.2)">
                <i class="bi bi-tag-fill text-info"></i>
                <span class="tc-text-sm text-info fw-semibold">Modelo: ${modelLabel}</span>
                <span class="tc-text-sm text-info">· Taxa: <strong>$${data.baseServiceFeeUSD.toFixed(2)} USD</strong></span>
            </div>`;

        const modalHtml = `
        <div class="modal fade" id="deployFeeModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
            <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                <div class="modal-content bg-dark-elevated border-secondary text-light">
                    <div class="modal-header border-secondary">
                        <h5 class="modal-title"><i class="bi bi-rocket-takeoff me-2"></i>Implementar Contrato</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    ${modelBadgeHtml}
                    <div class="modal-body">

                        <div class="d-flex align-items-start gap-3 mb-4">
                            <div class="tc-modal-icon--warning flex-shrink-0">
                                <i class="bi bi-cash-coin fs-3"></i>
                            </div>
                            <div class="flex-grow-1">
                                <div class="tc-modal-message-title">Confirme os custos antes do deploy</div>
                                <p class="tc-modal-message-desc mb-0">Revise taxa de serviço + estimativa de gás. O valor final pode variar conforme a rede.</p>
                            </div>
                        </div>

                        <div class="row g-4">

                            <!-- ── Coluna esquerda: formulário ── -->
                            <div class="col-md-5">

                                <div class="tc-field mb-3">
                                    <label class="tc-field-label" for="feeCountrySelect">País*</label>
                                    <select class="tc-field-select" id="feeCountrySelect">
                                        <option value="BR" selected>🇧🇷 Brazil</option>
                                        <option value="US">🇺🇸 United States</option>
                                        <option value="EU">🇪🇺 Europe</option>
                                        <option value="OT">🏳️ Outro</option>
                                    </select>
                                    <div class="tc-field-hint">Escolha seu país para fins de cobrança.</div>
                                </div>

                                <div class="mb-3">
                                    <div class="form-check mb-2">
                                        <input class="form-check-input" type="checkbox" id="checkNonEU">
                                        <label class="form-check-label tc-text-sm tc-status-text" for="checkNonEU">
                                            Declaro que não sou residente da UE e sou responsável pelos impostos locais (IVA/VAT) se aplicável.
                                        </label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="checkTerms">
                                        <label class="form-check-label tc-text-sm tc-status-text" for="checkTerms">
                                            Concordo com a entrega do conteúdo digital e aceito a perda do direito de desistência após o início. *
                                        </label>
                                    </div>
                                </div>

                            </div>

                            <!-- ── Coluna direita: breakdown de custos ── -->
                            <div class="col-md-7">

                                ${referralBlock}

                                <div class="tc-modal-details-box mb-3">
                                    <div class="d-flex align-items-center justify-content-between gap-3">
                                        <div class="text-warning">Gás estimado</div>
                                        <div class="text-warning text-end text-nowrap">($<span id="feeGasUsdValue">${data.gasCostUSD.toFixed(2)}</span>)</div>
                                        <div class="text-warning text-end fw-semibold text-nowrap"><span id="feeGasValue">${data.gasCostCrypto.toFixed(6)}</span> <span class="ms-1">${data.symbol}</span></div>
                                    </div>
                                    <div class="d-flex align-items-center justify-content-between gap-3 mt-3 pt-2 tc-divider-top">
                                        <div class="tc-label-caps">Total que você paga</div>
                                        <div></div>
                                        <div class="fw-bold text-end text-nowrap"><span id="feeTotalValue">${data.totalCostCrypto.toFixed(11)}</span> <span class="ms-1">${data.symbol}</span></div>
                                    </div>
                                </div>

                                ${data.isTestnet ? '<div class="alert alert-warning py-2 tc-text-sm"><i class="bi bi-exclamation-triangle me-1"></i><strong>Modo Testnet:</strong> A cobrança será realizada na moeda de teste da rede.<br>A verificação de contrato é exclusiva para redes oficiais.</div>' : ''}

                            </div>
                        </div>

                    </div>
                    <div class="modal-footer border-secondary justify-content-center">
                        <div class="d-flex gap-2 w-100">
                            <button type="button" class="tc-btn-cancel-ds flex-grow-1 py-2" data-bs-dismiss="modal" id="btnCancelDeployFee">
                                <i class="bi bi-x-circle me-2"></i>Cancelar
                            </button>
                            <button type="button" class="tc-btn-primary-ds flex-grow-1 py-2" id="btnConfirmDeployFee" disabled>
                                <i class="bi bi-rocket-takeoff me-2"></i>Implementar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modalEl = document.getElementById("deployFeeModal");
        const bsModal = new bootstrap.Modal(modalEl);

        const btnConfirm   = document.getElementById("btnConfirmDeployFee");
        const btnCancel    = document.getElementById("btnCancelDeployFee");
        const checkTerms   = document.getElementById("checkTerms");
        const checkNonEU   = document.getElementById("checkNonEU");
        const elGas        = document.getElementById("feeGasValue");
        const elGasUsd     = document.getElementById("feeGasUsdValue");
        const elTotal      = document.getElementById("feeTotalValue");

        // Somente usado no modo sem referral
        const elService    = data.hasReferral ? null : document.getElementById("feeServiceFeeValue");
        const elServiceUsd = data.hasReferral ? null : document.getElementById("feeServiceFeeUsdValue");

        let didConfirm = false;
        let live = { ...data };
        let pendingAccountsChangedRecalc = false;

        const validate = () => {
            btnConfirm.disabled = !(checkTerms.checked && checkNonEU.checked);
        };

        const applyLive = () => {
            try {
                if (elService)    elService.textContent    = Number(live.serviceFeeCrypto).toFixed(6);
                if (elServiceUsd) elServiceUsd.textContent = Number(live.baseServiceFeeUSD).toFixed(2);
                if (elGas)        elGas.textContent        = Number(live.gasCostCrypto).toFixed(6);
                if (elGasUsd)     elGasUsd.textContent     = Number(live.gasCostUSD).toFixed(2);
                if (elTotal)      elTotal.textContent      = Number(live.totalCostCrypto).toFixed(11);
            } catch (_) {}
            validate();
        };

        checkTerms.addEventListener("change", validate);
        checkNonEU.addEventListener("change", validate);

        if (btnCancel) {
            btnCancel.addEventListener("click", () => {
                try {
                    btnCancel.disabled = true;
                    if (btnConfirm) btnConfirm.disabled = true;
                } catch (_) {}
                try {
                    bsModal.hide();
                } catch (_) {}
            });
        }

        btnConfirm.addEventListener("click", () => {
            didConfirm = true;
            try {
                if (btnConfirm) btnConfirm.disabled = true;
                if (btnCancel) btnCancel.disabled = true;
            } catch (_) {}
            try {
                bsModal.hide();
            } catch (_) {}
            data.onConfirm();
        });

        modalEl.addEventListener('hidden.bs.modal', () => {
            if (!didConfirm) {
                try {
                    data.onCancel();
                } finally {
                    try {
                        window.location.reload();
                    } catch (_) {}
                }
            }
            modalEl.remove();
        });

        bsModal.show();
        applyLive();

        try {
            if (window.ethereum && typeof window.ethereum.on === "function") {
                const onAccountsChanged = async () => {
                    if (pendingAccountsChangedRecalc) return;
                    pendingAccountsChangedRecalc = true;
                    try {
                        if (typeof live.recalc === "function") {
                            const updated = await live.recalc();
                            if (updated) live = { ...live, ...updated };
                            applyLive();
                        }
                    } catch (_) {}
                    pendingAccountsChangedRecalc = false;
                };
                window.ethereum.on("accountsChanged", onAccountsChanged);
                modalEl.addEventListener("hidden.bs.modal", () => {
                    try {
                        if (typeof window.ethereum.removeListener === "function") {
                            window.ethereum.removeListener("accountsChanged", onAccountsChanged);
                        }
                    } catch (_) {}
                });
            }
        } catch (_) {}
    }
}


import { PriceService } from "../../shared/price-service.js";
import { NetworkManager } from "../../shared/network-manager.js";
import { PAYMENT_CONFIG } from "./payment-config.js";
import { diagnoseEvmError, showDiagnosis } from "../../ai/diagnostics.js";

export class FeeManager {
    constructor() {
        this.nm = new NetworkManager();
    }

    /**
     * Exibe o modal de confirmação de pagamento e deploy
     * @param {Object} signer - Signer do ethers.js
     * @param {Object} network - Objeto de rede { chainId, name }
     * @param {BigNumber} estimatedGasLimit - Limite de gas estimado
     * @returns {Promise<{ok: boolean, signer?: Object, billingAddress?: string | null}>}
     */
    async confirmAndPay(signer, network, estimatedGasLimit) {
        try {
            if (window.ethereum && typeof window.ethereum.request === "function" && ethers?.providers?.Web3Provider) {
                const accounts = await window.ethereum.request({ method: "eth_accounts" }).catch(() => []);
                const list = Array.isArray(accounts) ? accounts.filter(Boolean).map((a) => String(a)) : [];

                const getCookie = (name) => {
                    try {
                        const parts = String(document.cookie || "").split(";");
                        for (const raw of parts) {
                            const [k, ...rest] = String(raw).trim().split("=");
                            if (k === name) return decodeURIComponent(rest.join("=") || "");
                        }
                    } catch (_) {}
                    return "";
                };
                const findAccount = (preferred) => {
                    const pref = String(preferred || "").toLowerCase();
                    if (!pref) return null;
                    for (const a of list) {
                        if (String(a || "").toLowerCase() === pref) return a;
                    }
                    return null;
                };

                let preferred = "";
                try {
                    preferred = String(window.walletConnector?.getStatus?.()?.account || "");
                } catch (_) {}
                if (!preferred) {
                    try {
                        preferred = String(window.ethereum?.selectedAddress || "");
                    } catch (_) {}
                }
                if (!preferred) {
                    try {
                        preferred = String(localStorage.getItem("tokencafe_wallet_address") || "");
                    } catch (_) {}
                }
                if (!preferred) preferred = getCookie("tokencafe_wallet_address");

                const match = findAccount(preferred);
                if (match) {
                    const providerNow = new ethers.providers.Web3Provider(window.ethereum);
                    signer = providerNow.getSigner(match);
                }
            }
        } catch (_) {}

        // 1. Verificar se é Testnet
        const isTestnet = this.nm.isTestNetwork(network.chainId);
        
        // Se a config diz para não cobrar em testnet, retornamos true direto (apenas se não quiser simular)
        // Mas a config diz CHARGE_ON_TESTNET (default true para teste de fluxo)
        if (isTestnet && !PAYMENT_CONFIG.CHARGE_ON_TESTNET) {
            let addr = null;
            try {
                addr = await signer.getAddress();
            } catch (_) {}
            return { ok: true, signer, billingAddress: addr };
        }

        // 2. Obter dados financeiros
        const nativeSymbol = PriceService.getNativeSymbol(network.chainId);
        const nativePrice = await PriceService.getNativeCoinPrice(network.chainId);
        
        // Taxa de Serviço (USD) vinda da configuração
        const serviceFeeUSD = PAYMENT_CONFIG.SERVICE_FEE_USD;

        // Se preço não disponível (0), fallback seguro
        // Em testnet, nativePrice pode ser 0 se a API não retornar nada para a rede de teste
        // Se for testnet e preço for 0, usamos um valor simulado (ex: $2000) para calcular tokens de teste
        const safePrice = nativePrice > 0 ? nativePrice : 2000; 
        
        // Calculo da taxa de serviço em crypto
        // Valor USD / Preço Unitário = Quantidade Crypto
        const serviceFeeCrypto = serviceFeeUSD / safePrice;
        
        // Estimativa de Gas
        let gasPrice = await signer.getGasPrice();
        // Custo Gas = GasLimit * GasPrice
        const gasCostWei = estimatedGasLimit.mul(gasPrice);
        const gasCostCrypto = parseFloat(ethers.utils.formatEther(gasCostWei));
        const gasCostUSD = gasCostCrypto * safePrice;

        // Saldo do Usuário
        const balanceWei = await signer.getBalance();
        const balanceCrypto = parseFloat(ethers.utils.formatEther(balanceWei));
        const totalCostCrypto = serviceFeeCrypto + gasCostCrypto;
        const isBalanceEnough = balanceCrypto >= totalCostCrypto;

        let billingAddress = null;
        try {
            billingAddress = await signer.getAddress();
        } catch (_) {}

        let billingAddressOverride = null;

        let activeSigner = signer;
        let latestCalc = {
            symbol: nativeSymbol,
            serviceFeeUSD,
            serviceFeeCrypto,
            gasCostUSD,
            gasCostCrypto,
            totalCostCrypto,
            balanceCrypto,
            isBalanceEnough,
            isTestnet,
            billingAddress,
        };

        const setBillingAddressOverride = async (addrOrNull) => {
            const normalized = addrOrNull ? String(addrOrNull) : null;
            billingAddressOverride = normalized;
            await recalc();
            return latestCalc;
        };

        const recalc = async () => {
            try {
                if (window.ethereum && ethers?.providers?.Web3Provider) {
                    const providerNow = new ethers.providers.Web3Provider(window.ethereum);
                    if (billingAddressOverride) activeSigner = providerNow.getSigner(billingAddressOverride);
                    else activeSigner = providerNow.getSigner();
                }
            } catch (_) {}

            const nativePrice2 = await PriceService.getNativeCoinPrice(network.chainId);
            const safePrice2 = nativePrice2 > 0 ? nativePrice2 : 2000;

            const serviceFeeUSD2 = PAYMENT_CONFIG.SERVICE_FEE_USD;
            const serviceFeeCrypto2 = serviceFeeUSD2 / safePrice2;

            const gasPrice2 = await activeSigner.getGasPrice();
            const gasCostWei2 = estimatedGasLimit.mul(gasPrice2);
            const gasCostCrypto2 = parseFloat(ethers.utils.formatEther(gasCostWei2));
            const gasCostUSD2 = gasCostCrypto2 * safePrice2;

            const balanceWei2 = await activeSigner.getBalance();
            const balanceCrypto2 = parseFloat(ethers.utils.formatEther(balanceWei2));
            const totalCostCrypto2 = serviceFeeCrypto2 + gasCostCrypto2;
            const isBalanceEnough2 = balanceCrypto2 >= totalCostCrypto2;

            let billingAddress2 = null;
            try {
                billingAddress2 = await activeSigner.getAddress();
            } catch (_) {}

            latestCalc = {
                symbol: nativeSymbol,
                serviceFeeUSD: serviceFeeUSD2,
                serviceFeeCrypto: serviceFeeCrypto2,
                gasCostUSD: gasCostUSD2,
                gasCostCrypto: gasCostCrypto2,
                totalCostCrypto: totalCostCrypto2,
                balanceCrypto: balanceCrypto2,
                isBalanceEnough: isBalanceEnough2,
                isTestnet,
                billingAddress: billingAddress2,
            };
            return latestCalc;
        };

        // 3. Renderizar Modal
        return new Promise((resolve) => {
            this.showModal({
                symbol: nativeSymbol,
                serviceFeeUSD: serviceFeeUSD,
                serviceFeeCrypto,
                gasCostUSD,
                gasCostCrypto,
                totalCostCrypto,
                balanceCrypto,
                isBalanceEnough,
                isTestnet,
                billingAddress,
                recalc,
                setBillingAddressOverride,
                onConfirm: async () => {
                    // Lógica de Pagamento ("Duas Cobranças")
                    try {
                        await recalc();
                        if (!latestCalc.isBalanceEnough) {
                            showDiagnosis("INSUFFICIENT_FUNDS", {
                                badge: `Saldo atual: ${latestCalc.balanceCrypto.toFixed(4)} ${nativeSymbol}`,
                                causes: ["Saldo insuficiente para pagar taxa e gás.", "Adicione saldo na rede selecionada e tente novamente."],
                            });
                            resolve({ ok: false });
                            return;
                        }
                        // 1ª Cobrança: Taxa de Serviço (Transferência)
                        if (latestCalc.serviceFeeCrypto > 0) {
                            await this.processServiceFeePayment(activeSigner, latestCalc.serviceFeeCrypto, nativeSymbol);
                        }
                        let addrNow = null;
                        try {
                            addrNow = await activeSigner.getAddress();
                        } catch (_) {}
                        resolve({ ok: true, signer: activeSigner, billingAddress: addrNow });
                    } catch (e) {
                        const d = diagnoseEvmError(e, { nativeSymbol });
                        showDiagnosis(d.code, {
                            badge: d.badge,
                            causes: d.causes,
                        });
                        resolve({ ok: false });
                    }
                },
                onCancel: () => resolve({ ok: false })
            });
        });
    }

    async processServiceFeePayment(signer, amountCrypto, symbol) {
        // Converter para Wei/BigNumber
        const amountStr = amountCrypto.toFixed(18); // Evitar notação científica
        const amountWei = ethers.utils.parseEther(amountStr);

        // Feedback UI
        const btn = document.getElementById("btnConfirmDeployFee");
        if (btn) {
            btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processando Taxa...`;
            btn.disabled = true;
        }

        try {
            // Usa o endereço da configuração
            const tx = await signer.sendTransaction({
                to: PAYMENT_CONFIG.RECEIVER_WALLET,
                value: amountWei
            });
            
            // Aguardar confirmação (pelo menos 1 bloco) para garantir que a taxa foi paga
            if (btn) btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Confirmando Taxa...`;
            
            await tx.wait(1);
            return true;
        } catch (e) {
            throw e;
        }
    }

    showModal(data) {
        // Remover modal anterior se existir
        const oldModal = document.getElementById("deployFeeModal");
        if (oldModal) oldModal.remove();

        // Template HTML
        const addr = data.billingAddress ? String(data.billingAddress) : "";
        const shortAddr = addr && addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : (addr || "—");
        const modalHtml = `
        <div class="modal fade" id="deployFeeModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content text-bg-dark border-secondary">
                    <div class="modal-header border-secondary">
                        <h5 class="modal-title"><i class="bi bi-rocket-takeoff me-2"></i>Implementar Contrato</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        
                        <!-- Seleção de País -->
                        <div class="mb-3">
                            <label class="form-label text-muted small">País*</label>
                            <select class="form-select bg-dark text-light border-secondary" id="feeCountrySelect">
                                <option value="BR" selected>🇧🇷 Brazil</option>
                                <option value="US">🇺🇸 United States</option>
                                <option value="EU">🇪🇺 Europe</option>
                                <option value="OT">🏳️ Outro</option>
                            </select>
                            <div class="form-text text-muted small">Escolha seu país para fins de cobrança.</div>
                        </div>

                        <!-- Checkboxes Legais -->
                        <div class="mb-3">
                            <div class="form-check mb-2">
                                <input class="form-check-input" type="checkbox" id="checkNonEU">
                                <label class="form-check-label small text-muted" for="checkNonEU">
                                    Declaro que não sou residente da UE e sou responsável pelos impostos locais (IVA/VAT) se aplicável.
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="checkTerms">
                                <label class="form-check-label small text-muted" for="checkTerms">
                                    Concordo com a entrega do conteúdo digital e aceito a perda do direito de desistência após o início. *
                                </label>
                            </div>
                        </div>

                        <hr class="border-secondary">

                        <!-- Resumo Financeiro -->
                        <div class="text-muted small mb-1">Carteira de cobrança</div>
                        <div class="mb-3" id="feeBillingSelectWrap" style="display:none;">
                            <select class="form-select bg-dark text-light border-secondary" id="feeBillingSelect" aria-label="Selecionar carteira de cobrança"></select>
                            <div class="form-text text-muted small">Escolha a carteira que vai pagar a taxa e o gás (se você autorizou múltiplas contas no MetaMask).</div>
                        </div>
                        
                        <div class="mb-3">
                            <div class="d-flex align-items-center justify-content-between">
                                <div class="text-info">Taxa de serviço:</div>
                                <div class="text-info text-end" style="min-width: 90px;">($<span id="feeServiceFeeUsdValue">${data.serviceFeeUSD.toFixed(2)}</span>)</div>
                                <div class="text-info text-end fw-semibold" style="min-width: 140px;"><span id="feeServiceFeeValue">${data.serviceFeeCrypto.toFixed(6)}</span>${data.symbol}</div>
                            </div>
                            <div class="d-flex align-items-center justify-content-between mt-1">
                                <div class="text-warning">Gás estimado:</div>
                                <div class="text-warning text-end" style="min-width: 90px;">($<span id="feeGasUsdValue">${data.gasCostUSD.toFixed(2)}</span>)</div>
                                <div class="text-warning text-end fw-semibold" style="min-width: 140px;"><span id="feeGasValue">${data.gasCostCrypto.toFixed(6)}</span>${data.symbol}</div>
                            </div>
                            <div class="d-flex align-items-center justify-content-between mt-2 pt-2 border-top border-secondary">
                                <div class="text-muted text-uppercase fw-bold">Total estimado:</div>
                                <div style="min-width: 90px;"></div>
                                <div class="text-muted text-end fw-bold" style="min-width: 140px;"><span id="feeTotalValue">${data.totalCostCrypto.toFixed(11)}</span></div>
                            </div>
                        </div>

                        <div id="feeInsufficientAlert" class="alert alert-danger py-2 small" style="${!data.isBalanceEnough ? "" : "display:none;"}"><i class="bi bi-exclamation-triangle me-1"></i><strong>Saldo insuficiente:</strong> adicione saldo na rede selecionada para continuar.</div>
                        
                        <!-- Aviso Testnet -->
                        ${data.isTestnet ? '<div class="alert alert-warning py-2 small"><i class="bi bi-exclamation-triangle me-1"></i><strong>Modo Testnet:</strong> A cobrança será realizada na moeda de teste da rede. Certifique-se de ter saldo na carteira.<br>A verificação de contrato é exclusiva para redes oficiais.</div>' : ''}

                    </div>
                    <div class="modal-footer border-secondary justify-content-center">
                        <div class="d-flex gap-2 w-100">
                            <button type="button" class="btn btn-outline-secondary w-50 py-2" data-bs-dismiss="modal" id="btnCancelDeployFee">
                                Cancelar
                            </button>
                            <button type="button" class="btn btn-primary w-50 py-2" id="btnConfirmDeployFee" disabled>
                                Implementar 🚀
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modalEl = document.getElementById("deployFeeModal");
        const bsModal = new bootstrap.Modal(modalEl);
        
        // Elementos
        const btnConfirm = document.getElementById("btnConfirmDeployFee");
        const btnCancel = document.getElementById("btnCancelDeployFee");
        const checkTerms = document.getElementById("checkTerms");
        const checkNonEU = document.getElementById("checkNonEU");
        const elBillingSelectWrap = document.getElementById("feeBillingSelectWrap");
        const elBillingSelect = document.getElementById("feeBillingSelect");
        const elService = document.getElementById("feeServiceFeeValue");
        const elServiceUsd = document.getElementById("feeServiceFeeUsdValue");
        const elGas = document.getElementById("feeGasValue");
        const elGasUsd = document.getElementById("feeGasUsdValue");
        const elTotal = document.getElementById("feeTotalValue");
        const elAlert = document.getElementById("feeInsufficientAlert");
        let didConfirm = false;
        let live = { ...data };
        let pendingAccountsChangedRecalc = false;
        let billingWasUserSelected = false;

        const getAccounts = async () => {
            try {
                if (window.ethereum && typeof window.ethereum.request === "function") {
                    const accounts = await window.ethereum.request({ method: "eth_accounts" });
                    if (Array.isArray(accounts)) return accounts.filter(Boolean);
                }
            } catch (_) {}
            return [];
        };

        const renderBillingSelect = async () => {
            if (!elBillingSelectWrap || !elBillingSelect) return;
            const accounts = await getAccounts();
            if (!accounts || accounts.length < 1) {
                elBillingSelectWrap.style.display = "none";
                return;
            }
            elBillingSelectWrap.style.display = "";
            elBillingSelect.disabled = accounts.length <= 1;
            const current = live.billingAddress ? String(live.billingAddress).toLowerCase() : "";
            elBillingSelect.innerHTML = accounts
                .map((a) => {
                    const s = a && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
                    const sel = current && a.toLowerCase() === current ? "selected" : "";
                    return `<option value="${a}" ${sel}>${s} — … ${live.symbol}</option>`;
                })
                .join("");

            try {
                if (!window.ethereum || !ethers?.providers?.Web3Provider) return;
                const providerNow = new ethers.providers.Web3Provider(window.ethereum);
                const balances = await Promise.all(
                    accounts.map(async (a) => {
                        try {
                            const bWei = await providerNow.getBalance(a);
                            const b = parseFloat(ethers.utils.formatEther(bWei));
                            return Number.isFinite(b) ? b : null;
                        } catch (_) {
                            return null;
                        }
                    })
                );
                const html = accounts
                    .map((a, i) => {
                        const s = a && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
                        const sel = current && a.toLowerCase() === current ? "selected" : "";
                        const b = balances[i];
                        const bTxt = b === null ? "—" : b.toFixed(4);
                        return `<option value="${a}" ${sel}>${s} — ${bTxt} ${live.symbol}</option>`;
                    })
                    .join("");
                elBillingSelect.innerHTML = html;
            } catch (_) {}
        };

        // Validação dos checkboxes
        const validate = () => {
            btnConfirm.disabled = !(checkTerms.checked && checkNonEU.checked && live.isBalanceEnough);
        };

        const applyLive = () => {
            try {
                if (elService) elService.textContent = Number(live.serviceFeeCrypto).toFixed(6);
                if (elServiceUsd) elServiceUsd.textContent = Number(live.serviceFeeUSD).toFixed(2);
                if (elGas) elGas.textContent = Number(live.gasCostCrypto).toFixed(6);
                if (elGasUsd) elGasUsd.textContent = Number(live.gasCostUSD).toFixed(2);
                if (elTotal) elTotal.textContent = Number(live.totalCostCrypto).toFixed(11);
                if (elAlert) elAlert.style.display = live.isBalanceEnough ? "none" : "";
            } catch (_) {}
            validate();
        };

        checkTerms.addEventListener("change", validate);
        checkNonEU.addEventListener("change", validate);

        if (elBillingSelect) {
            elBillingSelect.addEventListener("change", async () => {
                const selected = elBillingSelect.value;
                try {
                    if (typeof live.setBillingAddressOverride === "function") {
                        billingWasUserSelected = true;
                        const updated = await live.setBillingAddressOverride(selected);
                        live = { ...live, ...updated };
                        applyLive();
                        await renderBillingSelect();
                    }
                } catch (_) {}
            });
        }

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

        // Ação Confirmar
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

        // Evento de fechamento (Cancelamento)
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
        renderBillingSelect();

        try {
            if (window.ethereum && typeof window.ethereum.on === "function") {
                const onAccountsChanged = async (nextAccounts) => {
                    if (pendingAccountsChangedRecalc) return;
                    pendingAccountsChangedRecalc = true;
                    try {
                        const accounts = Array.isArray(nextAccounts) ? nextAccounts.filter(Boolean).map((a) => String(a)) : await getAccounts();
                        const hasAccount = (addr) => {
                            const n = String(addr || "").toLowerCase();
                            if (!n) return false;
                            return accounts.some((a) => String(a || "").toLowerCase() === n);
                        };

                        let updated = null;
                        if (billingWasUserSelected && typeof live.setBillingAddressOverride === "function") {
                            const sel = String(elBillingSelect?.value || live.billingAddress || "").trim();
                            if (sel && hasAccount(sel)) {
                                updated = await live.setBillingAddressOverride(sel);
                            } else {
                                billingWasUserSelected = false;
                                updated = await live.setBillingAddressOverride(null);
                            }
                        } else if (typeof live.recalc === "function") {
                            updated = await live.recalc();
                        } else if (typeof live.setBillingAddressOverride === "function") {
                            updated = await live.setBillingAddressOverride(null);
                        }

                        if (updated) live = { ...live, ...updated };
                        applyLive();
                        await renderBillingSelect();
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

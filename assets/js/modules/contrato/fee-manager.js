
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
     * @returns {Promise<boolean>} true se confirmado e pago, false se cancelado
     */
    async confirmAndPay(signer, network, estimatedGasLimit) {
        // 1. Verificar se é Testnet
        const isTestnet = this.nm.isTestNetwork(network.chainId);
        
        // Se a config diz para não cobrar em testnet, retornamos true direto (apenas se não quiser simular)
        // Mas a config diz CHARGE_ON_TESTNET (default true para teste de fluxo)
        if (isTestnet && !PAYMENT_CONFIG.CHARGE_ON_TESTNET) {
            return true;
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
                onConfirm: async () => {
                    // Lógica de Pagamento ("Duas Cobranças")
                    try {
                        if (!isBalanceEnough) {
                            showDiagnosis("INSUFFICIENT_FUNDS", {
                                badge: `Saldo atual: ${balanceCrypto.toFixed(4)} ${nativeSymbol}`,
                                causes: ["Saldo insuficiente para pagar taxa e gás.", "Adicione saldo na rede selecionada e tente novamente."],
                            });
                            resolve(false);
                            return;
                        }
                        // 1ª Cobrança: Taxa de Serviço (Transferência)
                        if (serviceFeeCrypto > 0) {
                            await this.processServiceFeePayment(signer, serviceFeeCrypto, nativeSymbol);
                        }
                        resolve(true); // Prosseguir para o deploy (2ª cobrança/gas)
                    } catch (e) {
                        const d = diagnoseEvmError(e, { nativeSymbol });
                        showDiagnosis(d.code, {
                            badge: d.badge,
                            causes: d.causes,
                        });
                        resolve(false);
                    }
                },
                onCancel: () => resolve(false)
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
                        <div class="d-flex justify-content-between mb-1">
                            <span class="text-muted">Seu saldo:</span>
                            <span class="fw-bold">${data.balanceCrypto.toFixed(4)} ${data.symbol}</span>
                        </div>
                        
                        <div class="d-flex justify-content-between mb-1">
                            <span class="text-info">Taxa de serviço:</span>
                            <span class="text-end">
                                <div>${data.serviceFeeCrypto.toFixed(6)} ${data.symbol}</div>
                                <small class="text-muted">($${data.serviceFeeUSD.toFixed(2)})</small>
                            </span>
                        </div>

                        <div class="d-flex justify-content-between mb-3">
                            <span class="text-warning">Gás estimado:</span>
                            <span class="text-end">
                                <div>${data.gasCostCrypto.toFixed(6)} ${data.symbol}</div>
                                <small class="text-muted">($${data.gasCostUSD.toFixed(2)})</small>
                            </span>
                        </div>

                        <div class="d-flex justify-content-between mb-3">
                            <span class="text-muted">Total estimado:</span>
                            <span class="fw-bold">${data.totalCostCrypto.toFixed(6)} ${data.symbol}</span>
                        </div>

                        ${!data.isBalanceEnough ? `<div class="alert alert-danger py-2 small"><i class="bi bi-exclamation-triangle me-1"></i><strong>Saldo insuficiente:</strong> adicione saldo na rede selecionada para continuar.</div>` : ''}
                        
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
        let didConfirm = false;

        // Validação dos checkboxes
        const validate = () => {
            btnConfirm.disabled = !(checkTerms.checked && checkNonEU.checked && data.isBalanceEnough);
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
    }
}

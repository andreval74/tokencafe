
import { PriceService } from "../../shared/price-service.js";
import { NetworkManager } from "../../shared/network-manager.js";

const SERVICE_FEE_USD = 85.00;
const DEV_WALLET_ADDRESS = "0xYourDevWalletAddressHere"; // TODO: Substituir pelo endereço real

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
        // 1. Verificar se é Testnet (opcional: pular taxa ou cobrar em token de teste)
        // Por padrão, vamos cobrar para manter o fluxo "Two Charges" consistente, 
        // mas em testnet o valor em USD é simbólico (tokens sem valor real).
        const isTestnet = this.nm.isTestNetwork(network.chainId);
        
        // 2. Obter dados financeiros
        const nativeSymbol = PriceService.getNativeSymbol(network.chainId);
        const nativePrice = await PriceService.getNativeCoinPrice(network.chainId);
        
        // Taxa de Serviço ($85)
        // Se preço não disponível (0), fallback para um valor fixo seguro ou erro?
        // Vamos assumir 1 ETH = $2000 como fallback muito conservador se falhar, ou alertar.
        const safePrice = nativePrice > 0 ? nativePrice : 2000; 
        
        // Calculo da taxa de serviço em crypto
        // Valor USD / Preço Unitário = Quantidade Crypto
        // Ex: 85 / 2000 = 0.0425 ETH
        const serviceFeeCrypto = SERVICE_FEE_USD / safePrice;
        
        // Estimativa de Gas
        let gasPrice = await signer.getGasPrice();
        // Custo Gas = GasLimit * GasPrice
        const gasCostWei = estimatedGasLimit.mul(gasPrice);
        const gasCostCrypto = parseFloat(ethers.utils.formatEther(gasCostWei));
        const gasCostUSD = gasCostCrypto * safePrice;

        // Saldo do Usuário
        const balanceWei = await signer.getBalance();
        const balanceCrypto = parseFloat(ethers.utils.formatEther(balanceWei));

        // 3. Renderizar Modal
        return new Promise((resolve) => {
            this.showModal({
                symbol: nativeSymbol,
                serviceFeeUSD: SERVICE_FEE_USD,
                serviceFeeCrypto,
                gasCostUSD,
                gasCostCrypto,
                balanceCrypto,
                isTestnet,
                onConfirm: async () => {
                    // Lógica de Pagamento ("Duas Cobranças")
                    try {
                        // 1ª Cobrança: Taxa de Serviço (Transferência)
                        if (serviceFeeCrypto > 0) {
                            await this.processServiceFeePayment(signer, serviceFeeCrypto, nativeSymbol);
                        }
                        resolve(true); // Prosseguir para o deploy (2ª cobrança/gas)
                    } catch (e) {
                        console.error("Erro no pagamento da taxa:", e);
                        alert("Pagamento da taxa falhou ou foi rejeitado. O contrato não será implantado.");
                        resolve(false);
                    }
                },
                onCancel: () => resolve(false)
            });
        });
    }

    async processServiceFeePayment(signer, amountCrypto, symbol) {
        // Converter para Wei/BigNumber
        // Cuidado com precisão. ethers.utils.parseEther aceita string.
        const amountStr = amountCrypto.toFixed(18); // Evitar notação científica
        const amountWei = ethers.utils.parseEther(amountStr);

        // Feedback
        const btn = document.getElementById("btnConfirmDeployFee");
        if (btn) {
            btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processando Taxa...`;
            btn.disabled = true;
        }

        try {
            const tx = await signer.sendTransaction({
                to: DEV_WALLET_ADDRESS,
                value: amountWei
            });
            
            // Aguardar confirmação (pelo menos 1 bloco) para garantir que a taxa foi paga
            // User UX: "Aguardando confirmação da taxa..."
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
                        
                        <!-- Aviso Testnet -->
                        ${data.isTestnet ? '<div class="alert alert-warning py-1 small"><i class="bi bi-exclamation-triangle me-1"></i>Modo Testnet: Valores simulados.</div>' : ''}

                    </div>
                    <div class="modal-footer border-secondary justify-content-center">
                        <button type="button" class="btn btn-primary w-100 py-2" id="btnConfirmDeployFee" disabled>
                            Implementar 🚀
                        </button>
                    </div>
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modalEl = document.getElementById("deployFeeModal");
        const bsModal = new bootstrap.Modal(modalEl);
        
        // Elementos
        const btnConfirm = document.getElementById("btnConfirmDeployFee");
        const checkTerms = document.getElementById("checkTerms");
        const checkNonEU = document.getElementById("checkNonEU");

        // Validação dos checkboxes
        const validate = () => {
            // Apenas Terms é obrigatório pelo asterisco na imagem, mas vamos exigir ambos para segurança jurídica se quiser
            // Imagem mostra asterisco vermelho apenas no segundo e no label geral? Não, asterisco vermelho no texto do segundo.
            // Texto diz "* - Consentimento obrigatório."
            // Vamos exigir o checkTerms. checkNonEU parece ser declaração fiscal, importante também.
            btnConfirm.disabled = !(checkTerms.checked && checkNonEU.checked);
        };

        checkTerms.addEventListener("change", validate);
        checkNonEU.addEventListener("change", validate);

        // Ação Confirmar
        btnConfirm.addEventListener("click", () => {
            data.onConfirm();
            // Não fecha modal imediatamente, espera processamento. 
            // O processamento vai alterar o botão para spinner.
            // Se sucesso, o modal será fechado externamente ou redirecionado.
            // Aqui podemos apenas esconder se quisermos, mas melhor manter aberto com spinner.
        });

        // Evento de fechamento (Cancelamento)
        modalEl.addEventListener('hidden.bs.modal', () => {
            // Se foi fechado e não confirmado (verificamos se já foi processado?
            // A Promise espera resolve. Se o usuário fecha, é cancelamento.
            // Precisamos garantir que onCancel só seja chamado se não estiver processando.
            // Mas simples: se o modal fecha, chamamos onCancel. Se já resolveu, a promise ignora.
            data.onCancel();
            modalEl.remove();
        });

        bsModal.show();
        
        // Hack para resolver promise ao fechar se não confirmado
        // (A lógica de onConfirm deve lidar com o fechamento do modal ou atualização de UI)
    }
}

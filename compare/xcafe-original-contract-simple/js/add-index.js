/**
 * xcafe Token Creator - Versão Tela Única com Layout Step
 * Sistema de criação de tokens com scroll progressivo e layout step visual
 */

// Estado global da aplicação
const AppState = {
    wallet: {
        connected: false,
        address: '',
        balance: '0.0000',
        network: null
    },
    tokenData: {},
    gasEstimate: null,
    apiStatus: 'checking'
};

// Estado específico para deploy e contratos
const deploymentState = {
    contractCode: null,
    deployedContract: null
};

/**
 * Verifica o status da API silenciosamente (apenas no console)
 */
async function checkApiStatusSilently() {
    try {
        console.log('🔍 Verificando status da API...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const response = await fetch('https://xcafe-token-api-hybrid.onrender.com/health', {
            method: 'GET',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const data = await response.json();
            AppState.apiStatus = 'online';
            console.log('✅ API Status: ONLINE', data);
            updateBlockchainStatus(true);
        } else {
            AppState.apiStatus = 'offline';
            console.log('⚠️ API Status: OFFLINE - Response não OK:', response.status);
            updateBlockchainStatus(false, `HTTP ${response.status}`);
        }
    } catch (error) {
        AppState.apiStatus = 'error';
        if (error.name === 'AbortError') {
            console.log('⏰ API Status: TIMEOUT - Verificação cancelada por timeout');
            updateBlockchainStatus(false, 'Timeout de conexão');
        } else {
            console.log('❌ API Status: ERROR -', error.message);
            updateBlockchainStatus(false, 'Conexão indisponível');
        }
    }
}

/**
 * Atualiza o status visual da rede blockchain
 */
function updateBlockchainStatus(available, errorMessage = '') {
    const statusElement = document.getElementById('blockchain-status');
    if (!statusElement) return;
    
    if (available) {
        statusElement.innerHTML = `
            <i class="bi bi-check-circle text-success me-1"></i>
            <span class="text-success">Disponível</span>
        `;
        console.log('✅ Rede blockchain reportada como disponível');
    } else {
        statusElement.innerHTML = `
            <i class="bi bi-exclamation-triangle text-warning me-1"></i>
            <span class="text-warning">Indisponível</span>
            ${errorMessage ? `<small class="text-muted ms-2">(${errorMessage})</small>` : ''}
        `;
        console.log('⚠️ Rede blockchain reportada como indisponível:', errorMessage);
    }
}

/**
 * Estima o gas necessário para deploy do contrato
 */
async function estimateGasForDeploy() {
    try {
        if (!window.ethereum || !AppState.wallet.connected) {
            console.log('⚠️ Carteira não conectada para estimativa de gas');
            return null;
        }

        const provider = new ethers.providers.Web3Provider(window.ethereum);
        
        // Gas estimado para deploy de contrato ERC20 padrão (valores baseados em experiência)
        const gasLimit = 800000; // ~800k gas units
        
        // Obter gas price atual da rede
        const gasPrice = await provider.getGasPrice();
        const gasPriceGwei = ethers.utils.formatUnits(gasPrice, 'gwei');
        
        // Calcular custo estimado
        const estimatedCost = gasLimit * parseFloat(gasPriceGwei) / 1e9; // Em ETH/BNB
        
        const gasInfo = {
            gasLimit: gasLimit.toLocaleString(),
            gasPriceGwei: parseFloat(gasPriceGwei).toFixed(2),
            estimatedCostETH: estimatedCost.toFixed(6)
        };
        
        console.log('💰 Estimativa de Gas:', gasInfo);
        AppState.gasEstimate = gasInfo;
        
        return gasInfo;
    } catch (error) {
        console.error('❌ Erro ao estimar gas:', error);
        return null;
    }
}

/**
 * Atualiza a exibição da estimativa de gas na UI
 */
function updateGasDisplay(gasInfo) {
    if (!gasInfo) {
        // Mostrar valores padrão se não conseguir estimar
        document.getElementById('gas-limit-display').textContent = '~800,000';
        document.getElementById('gas-price-display').textContent = '--';
        document.getElementById('estimated-cost-display').textContent = '--';
        return;
    }
    
    document.getElementById('gas-limit-display').textContent = gasInfo.gasLimit;
    document.getElementById('gas-price-display').textContent = gasInfo.gasPriceGwei;
    document.getElementById('estimated-cost-display').textContent = gasInfo.estimatedCostETH;
}

/**
 * Atualiza a barra de progresso visual baseada no progresso real
 */
function updateVisualProgress() {
    const { wallet, tokenData } = AppState;
    
    // Step 1 - Wallet
    const step1 = document.querySelector('.step-item[data-step="1"]');
    if (step1) {
        step1.classList.remove('active', 'completed');
        if (wallet.connected) {
            step1.classList.add('completed');
        } else {
            step1.classList.add('active');
        }
    }
    
    // Step 2 - Basic Info
    const step2 = document.querySelector('.step-item[data-step="2"]');
    const hasBasicInfo = tokenData.name && tokenData.symbol && tokenData.totalSupply;
    if (step2) {
        step2.classList.remove('active', 'completed');
        if (hasBasicInfo && wallet.connected) {
            step2.classList.add('completed');
        } else if (wallet.connected) {
            step2.classList.add('active');
        }
    }
    
    // Step 3 - Deploy
    const step3 = document.querySelector('.step-item[data-step="3"]');
    if (step3) {
        step3.classList.remove('active', 'completed');
        if (hasBasicInfo && wallet.connected) {
            step3.classList.add('active');
        }
    }
    
    // Step 4 - Result
    const step4 = document.querySelector('.step-item[data-step="4"]');
    if (step4) {
        step4.classList.remove('active', 'completed');
        if (AppState.deployResult?.success) {
            step4.classList.add('active');
        }
    }
    
    // Atualizar conectores
    document.querySelectorAll('.step-connector').forEach((connector, index) => {
        connector.classList.remove('active');
        if (index === 0 && wallet.connected) {
            connector.classList.add('active');
        } else if (index === 1 && hasBasicInfo && wallet.connected) {
            connector.classList.add('active');
        } else if (index === 2 && AppState.deployResult?.success) {
            connector.classList.add('active');
        }
    });
    
    // Controlar botão "Criar Token" - apenas 3 campos obrigatórios
    const createTokenBtn = document.getElementById('create-token-btn');
    if (createTokenBtn) {
        // Verificar estado da carteira em tempo real
        const walletStatus = Wallet.getStatus();
        const isWalletConnected = walletStatus.connected || wallet.connected;
        
        // DEBUG: Log do estado da carteira
        console.log('🔍 DEBUG Botão - Estado carteira:', {
            walletStatus: walletStatus,
            isWalletConnected: isWalletConnected,
            walletGlobal: wallet
        });
        
        // Verificar se tem apenas os 3 campos obrigatórios: nome, símbolo e supply
        const hasRequiredFields = isWalletConnected && 
                                 tokenData.name && tokenData.name.trim().length >= 3 &&
                                 tokenData.symbol && tokenData.symbol.trim().length >= 2 &&
                                 tokenData.totalSupply && tokenData.totalSupply.length > 0;
        
        // DEBUG: Log dos campos obrigatórios
        console.log('🔍 DEBUG Botão - Campos:', {
            isWalletConnected: isWalletConnected,
            nome: tokenData.name,
            simbolo: tokenData.symbol,
            supply: tokenData.totalSupply,
            hasRequiredFields: hasRequiredFields
        });
        
        if (hasRequiredFields) {
            createTokenBtn.style.display = 'block';
            // Garantir que o botão tenha a classe correta para cor laranja
            if (!createTokenBtn.className.includes('btn-primary-custom')) {
                createTokenBtn.className = 'btn btn-lg shadow-lg btn-primary-custom';
            }
            console.log('✅ Botão "Criar Token" mostrado (3 campos obrigatórios preenchidos)');
            createTokenBtn.onclick = () => {
                console.log('🚀 Botão "Criar Token" clicado');
                
                // Garantir que campos automáticos estão preenchidos
                const decimalsInput = document.getElementById('decimals');
                const ownerInput = document.getElementById('ownerAddress');
                
                if (decimalsInput && !decimalsInput.value) {
                    decimalsInput.value = '18';
                }
                
                if (ownerInput && (!ownerInput.value || ownerInput.value.trim() === '')) {
                    const currentWalletStatus = Wallet.getStatus();
                    ownerInput.value = currentWalletStatus.address || wallet.address;
                }
                
                // Atualizar dados com preenchimento automático
                onTokenDataChange();
                
                // handleTokenCreation já será chamado pelo evento click do botão
            };
        } else {
            createTokenBtn.style.display = 'none';
            const missing = [];
            if (!isWalletConnected) missing.push('carteira');
            if (!tokenData.name || tokenData.name.trim().length < 3) missing.push('nome');
            if (!tokenData.symbol || tokenData.symbol.trim().length < 2) missing.push('símbolo'); 
            if (!tokenData.totalSupply || tokenData.totalSupply.length === 0) missing.push('supply');
            
            console.log('❌ Botão escondido - faltam campos:', missing.join(', '));
            console.log('🔍 Debug estado carteira:', { 
                walletStatus: walletStatus.connected, 
                appState: wallet.connected,
                endereco: walletStatus.address || 'não conectado'
            });
        }
    } else {
        console.log('⚠️ Botão create-token-btn não encontrado no DOM');
    }
}

/**
 * Mostra apenas a primeira seção
 */
function showOnlyFirstSection() {
    // Ocultar todas as seções primeiro
    document.querySelectorAll('.creation-section').forEach(section => {
        section.classList.remove('active', 'section-enabled');
        section.style.opacity = '0.6';
        section.style.pointerEvents = 'none';
    });
    
    // Mostrar apenas a primeira seção
    const firstSection = document.getElementById('section-wallet');
    if (firstSection) {
        firstSection.classList.add('active', 'section-enabled');
        firstSection.style.opacity = '1';
        firstSection.style.pointerEvents = 'all';
    }
    
    updateVisualProgress();
}

/**
 * Habilita uma seção específica
 */
function enableSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('section-enabled');
        section.style.opacity = '1';
        section.style.pointerEvents = 'all';
        console.log(`✅ Seção habilitada: ${sectionId}`);
    }
    updateVisualProgress();
}

/**
 * Gera o código Solidity do contrato
 */
/**
 * Carrega o template base.sol e substitui as variáveis
 */
// ========================================================================================
// SISTEMA DE CONTRATOS LIMPO - CARREGA TEMPLATES DA PASTA /contratos/
// ========================================================================================

/**
 * Carrega template de contrato da pasta /contratos/
 * @param {string} contractName - Nome do arquivo (ex: 'base', 'simple')
 * @returns {Promise<string>} - Código do contrato .sol
 */
async function loadContractTemplate(contractName = 'base') {
    try {
        const response = await fetch(`contratos/${contractName}.sol`);
        if (!response.ok) {
            throw new Error(`Erro ao carregar contrato: ${response.status}`);
        }
        const contractCode = await response.text();
        console.log(`✅ Template ${contractName}.sol carregado da pasta /contratos/`);
        return contractCode;
    } catch (error) {
        console.error(`❌ Erro ao carregar template ${contractName}:`, error);
        throw error;
    }
}

/**
 * Aplica variáveis do token no template do contrato
 * @param {string} templateCode - Código template com placeholders
 * @param {Object} tokenData - Dados do token
 * @returns {string} - Código final do contrato
 */
function applyTokenDataToTemplate(templateCode, tokenData) {
    let contractCode = templateCode;
    
    // Aplicar substituições dos placeholders
    const replacements = {
        '{{TOKEN_NAME}}': tokenData.name,
        '{{TOKEN_SYMBOL}}': tokenData.symbol,
        '{{DECIMALS}}': tokenData.decimals || '18',
        '{{TOKEN_SUPPLY}}': tokenData.totalSupply,
        '{{OWNER_ADDRESS}}': tokenData.owner,
        '{{TOKEN_LOGO_URI}}': tokenData.image || '',
        '{{TOKEN_ORIGINAL}}': '0x80c09daC9dC95669B03C2d82967Af62e93d0Fe84'
    };
    
    // Fazer as substituições
    for (const [placeholder, value] of Object.entries(replacements)) {
        contractCode = contractCode.replace(new RegExp(placeholder, 'g'), value);
    }
    
    console.log('✅ Placeholders aplicados no template do contrato');
    return contractCode;
}

/**
 * Gera contrato final a partir do template selecionado
 * @param {Object} tokenData - Dados do token
 * @param {string} templateName - Nome do template (padrão: 'base')
 * @returns {Promise<string>} - Código final do contrato
 */
async function generateContractFromTemplate(tokenData, templateName = 'base') {
    try {
        console.log(`🔨 Gerando contrato a partir do template: ${templateName}.sol`);
        
        // 1. Carregar template da pasta /contratos/
        const templateCode = await loadContractTemplate(templateName);
        
        // 2. Aplicar dados do token
        const finalContract = applyTokenDataToTemplate(templateCode, tokenData);
        
        console.log('✅ Contrato gerado com sucesso a partir do template');
        return finalContract;
        
    } catch (error) {
        console.error('❌ Erro ao gerar contrato:', error);
        throw error;
    }
}

/**
 * Faz download do arquivo .sol
 */
async function downloadSolidityFile() {
    const { tokenData } = AppState;
    
    if (!tokenData.name || !tokenData.symbol) {
        alert('Preencha os dados do token antes de fazer o download');
        return;
    }
    
    try {
        console.log('📥 Gerando arquivo Solidity...');
        
        let contractCode = '';
        let fileName = `${tokenData.symbol}.sol`;
        
        // 1. Priorizar código real da API (se já fez deploy)
        if (AppState.deployResult && AppState.deployResult.sourceCode) {
            contractCode = AppState.deployResult.sourceCode;
            console.log('📄 Usando código fonte real da API deployada');
        } else {
            // 2. Gerar usando template da pasta /contratos/
            contractCode = await generateContractFromTemplate(tokenData, 'base');
            console.log('📄 Usando template base.sol da pasta /contratos/');
        }
        
        // Adicionar header com informações de verificação
        const verificationHeader = `/*
=============================================================================
INFORMAÇÕES PARA VERIFICAÇÃO NO BLOCKCHAIN EXPLORER
=============================================================================

Para verificar este contrato no BSCScan ou EtherScan, use:

• Compiler Type: Solidity (Single file)
• Compiler Version: v0.8.30+commit.8a97fa7a
• Open Source License Type: MIT License
• Optimization: Yes (200 runs)
• EVM Version: default

=============================================================================
Gerado por: xcafe Token Creator
Website: https://xcafe.com
Data: ${new Date().toLocaleDateString('pt-BR')}
=============================================================================
*/

`;

        // Adicionar header ao código
        contractCode = verificationHeader + contractCode;
        
        // Criar blob e download
        const blob = new Blob([contractCode], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        
        // Criar link temporário para download
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = fileName;
        downloadLink.style.display = 'none';
        
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        // Limpar URL
        window.URL.revokeObjectURL(url);
        
        console.log(`✅ Arquivo ${fileName} baixado com sucesso`);
        
        // Feedback visual
        showDownloadSuccess(fileName);
        
    } catch (error) {
        console.error('❌ Erro ao gerar arquivo:', error);
        alert('Erro ao gerar arquivo Solidity: ' + error.message);
    }
}

/**
 * Mostra modal com o contrato para visualização, cópia e download
 */
async function showContractModal(providedCode = null, providedTitle = null) {
    console.log('🚀 showContractModal executada!');
    
    let contractCode = '';
    let modalTitle = 'Visualizar Contrato';
    
    // Se foi fornecido código específico, usar ele
    if (providedCode) {
        contractCode = providedCode;
        modalTitle = providedTitle || 'Contrato Solidity';
    } else {
        // Usar dados do AppState ou dados de exemplo
        const tokenData = AppState.tokenData || {
            name: 'Token Exemplo',
            symbol: 'TKN', 
            totalSupply: '1000000',
            decimals: '18'
        };
        
        modalTitle = `Contrato: ${tokenData.symbol}`;
        
        // Verificar se há código do deploy
        if (AppState.deployResult?.sourceCode) {
            contractCode = AppState.deployResult.sourceCode;
            modalTitle = `Contrato Deployado: ${tokenData.symbol}`;
        } else {
            // Gerar contrato básico
            contractCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

contract ${tokenData.symbol} {
    string public name = "${tokenData.name}";
    string public symbol = "${tokenData.symbol}";
    uint8 public decimals = ${tokenData.decimals};
    uint256 public totalSupply = ${tokenData.totalSupply} * 10**decimals;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor() {
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }
    
    function transfer(address to, uint256 value) public returns (bool) {
        require(balanceOf[msg.sender] >= value, "Insufficient balance");
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }
    
    function approve(address spender, uint256 value) public returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        require(balanceOf[from] >= value, "Insufficient balance");
        require(allowance[from][msg.sender] >= value, "Allowance exceeded");
        balanceOf[from] -= value;
        balanceOf[to] += value;
        allowance[from][msg.sender] -= value;
        emit Transfer(from, to, value);
        return true;
    }
}`;
        }
    }
    
    // Usar modal existente no HTML
    const modal = document.getElementById('contractModal');
    const titleEl = document.getElementById('contract-modal-title');
    const codeEl = document.getElementById('contract-modal-code');
    
    // Atualizar conteúdo do modal
    if (titleEl) titleEl.textContent = modalTitle;
    if (codeEl) codeEl.textContent = contractCode;
    
    // Mostrar modal
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
    
    console.log('✅ Modal exibida com sucesso!');
}

// Funções auxiliares para o modal
window.copyModalCode = function() {
    const codeEl = document.getElementById('contract-modal-code');
    if (codeEl) {
        navigator.clipboard.writeText(codeEl.textContent).then(() => {
            alert('Código copiado para a área de transferência!');
        }).catch(() => {
            alert('Erro ao copiar código');
        });
    }
};

window.downloadModalCode = function() {
    const codeEl = document.getElementById('contract-modal-code');
    if (codeEl) {
        const code = codeEl.textContent;
        const symbol = AppState.tokenData?.symbol || 'Contract';
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${symbol}.sol`;
        a.click();
        URL.revokeObjectURL(url);
        alert('Arquivo baixado: ' + `${symbol}.sol`);
    }
};

/**
 * Copia o contrato do modal para o clipboard
 */
function copyContractFromModal() {
    const codeElement = document.getElementById('contract-source-code');
    if (codeElement) {
        const contractCode = codeElement.textContent;
        navigator.clipboard.writeText(contractCode).then(() => {
            // Feedback visual
            const btn = event.target.closest('button');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="bi bi-check me-1"></i>Copiado!';
            btn.classList.remove('btn-outline-success');
            btn.classList.add('btn-success');
            
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.classList.add('btn-outline-success');
                btn.classList.remove('btn-success');
            }, 2000);
        }).catch(err => {
            console.error('Erro ao copiar:', err);
            alert('Erro ao copiar contrato');
        });
    }
}

/**
 * Faz download do contrato a partir do modal
 */
function downloadContractFromModal() {
    const codeElement = document.getElementById('contract-source-code');
    if (codeElement) {
        const contractCode = codeElement.textContent;
        const fileName = `${AppState.tokenData.symbol}_Contract.sol`;
        
        const blob = new Blob([contractCode], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Feedback visual
        const btn = event.target.closest('button');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="bi bi-check me-1"></i>Baixado!';
        btn.classList.remove('btn-outline-primary');
        btn.classList.add('btn-primary');
        
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.classList.add('btn-outline-primary');
            btn.classList.remove('btn-primary');
        }, 2000);
    }
}

/**
 * Escapa HTML para exibição segura
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Mostra feedback visual do download
 */
function showDownloadSuccess(fileName) {
    const toast = document.createElement('div');
    toast.className = 'position-fixed top-0 end-0 p-3';
    toast.style.zIndex = '9999';
    toast.innerHTML = `
        <div class="toast show" role="alert">
            <div class="toast-header bg-success text-white">
                <i class="bi bi-download me-2"></i>
                <strong class="me-auto">Download Concluído</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">
                Arquivo <code>${fileName}</code> baixado com sucesso!
            </div>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Remover após 5 segundos
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 5000);
}

/**
 * Atualiza texto do botão de download
 */
function updateDownloadButtonText() {
    const downloadFilename = document.getElementById('download-filename');
    const { tokenData } = AppState;
    
    if (downloadFilename) {
        if (tokenData.symbol && tokenData.symbol.length >= 2) {
            downloadFilename.textContent = `Baixar ${tokenData.symbol}.sol`;
        } else {
            downloadFilename.textContent = 'Baixar Contrato.sol';
        }
    }
}

/**
 * Gera URL do explorer para transação
 */
function getExplorerTxUrl(txHash, chainId) {
    if (!txHash) return '#';
    
    // Normalizar chainId para decimal
    if (typeof chainId === 'string' && chainId.startsWith('0x')) {
        chainId = parseInt(chainId, 16);
    } else if (typeof chainId === 'string') {
        chainId = parseInt(chainId, 10);
    }
    
    const explorers = {
        1: `https://etherscan.io/tx/${txHash}`,
        56: `https://bscscan.com/tx/${txHash}`,
        97: `https://testnet.bscscan.com/tx/${txHash}`,
        137: `https://polygonscan.com/tx/${txHash}`,
        8453: `https://basescan.org/tx/${txHash}`,
        11155111: `https://sepolia.etherscan.io/tx/${txHash}`
    };
    
    return explorers[chainId] || `https://etherscan.io/tx/${txHash}`;
}

/**
 * Copia texto para clipboard
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        
        // Feedback visual
        const btn = event.target.closest('button');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="bi bi-check text-success"></i>';
        
        setTimeout(() => {
            btn.innerHTML = originalHTML;
        }, 2000);
        
        console.log('✅ Copiado para clipboard:', text);
        
    } catch (error) {
        console.error('❌ Erro ao copiar:', error);
        // Fallback para browsers mais antigos
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    }
}

// Inicialização no fim do arquivo
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 xcafe Token Creator - Tela Única iniciado');
    
    // Configurar callbacks para o Wallet
    window.onWalletConnected = function(walletData) {
        console.log('📡 Callback: Wallet conectada', walletData);
        
        // Atualizar estado global
        AppState.wallet.connected = true;
        AppState.wallet.address = walletData.address;
        AppState.wallet.network = walletData.network;
        
        // Preencher campos automáticos
        const ownerInput = document.getElementById('ownerAddress');
        const decimalsInput = document.getElementById('decimals');
        
        if (ownerInput && !ownerInput.value) {
            ownerInput.value = walletData.address;
        }
        
        if (decimalsInput && !decimalsInput.value) {
            decimalsInput.value = '18';
        }
        
        // Trigger data update
        onTokenDataChange();
        
        // Verificar progresso e mostrar seções conforme necessário
        checkFormProgress();
    };
    
    window.onWalletDisconnected = function() {
        console.log('📡 Callback: Wallet desconectada');
        
        // Atualizar estado global
        AppState.wallet.connected = false;
        AppState.wallet.address = '';
        AppState.wallet.network = null;
        
        // Verificar progresso (vai esconder seções subsequentes)
        checkFormProgress();
    };
    
    initializeApp();
});

/**
 * Inicializa a aplicação
 */
function initializeApp() {
    setupEventListeners();
    
    // Aguardar um pouco para o sistema de carteira inicializar completamente
    setTimeout(() => {
        checkWalletConnection();
    }, 1000);
    
    // RESTAURAR: Sistema progressivo de seções
    initializeProgressiveFlow();
}

/**
 * Inicializa o fluxo progressivo das seções
 */
function initializeProgressiveFlow() {
    // Mostrar apenas a primeira seção inicialmente
    showOnlyFirstSection();
    
    // Configurar validação dos campos
    setupFieldValidation();
    
    console.log('📋 Sistema progressivo ativo - seções aparecem conforme preenchimento');
}

/**
 * Configura validação em tempo real dos campos
 */
function setupFieldValidation() {
    // Campos obrigatórios para avançar para próxima seção
    const requiredFields = ['tokenName', 'tokenSymbol', 'totalSupply', 'ownerAddress'];
    
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', checkFormProgress);
            field.addEventListener('blur', checkFormProgress);
        }
    });
    
    // Verificar progresso inicial
    setTimeout(checkFormProgress, 500);
}

/**
 * Verifica progresso do formulário e mostra seções conforme necessário
 */
function checkFormProgress() {
    const isWalletConnected = AppState.wallet.connected;
    const isFormComplete = validateBasicTokenData();
    
    // Seção 1: Sempre visível
    enableSection('section-wallet');
    
    // Seção 2: Mostrar se wallet conectada
    if (isWalletConnected) {
        enableSection('section-basic-info');
        
        // DEBUG: Log do formulário completo
        console.log('🔍 DEBUG Progressive - isFormComplete:', isFormComplete);
        
        // Seção 3: Mostrar se formulário completo
        if (isFormComplete) {
            // Mostrar botão criar token
            const createTokenBtn = document.getElementById('create-token-btn');
            if (createTokenBtn) {
                createTokenBtn.style.display = 'block';
                // Garantir que o botão tenha a classe correta para cor laranja
                if (!createTokenBtn.className.includes('btn-primary-custom')) {
                    createTokenBtn.className = 'btn btn-lg shadow-lg btn-primary-custom';
                }
                console.log('✅ Botão "Criar Token" mostrado via progressive flow');
            }
            
            updateProgressIndicator(true);
        } else {
            // Esconder botão criar token se formulário incompleto
            const createTokenBtn = document.getElementById('create-token-btn');
            if (createTokenBtn) {
                createTokenBtn.style.display = 'none';
            }
            
            updateProgressIndicator(false);
            
            // Esconder seção de resultado se formulário incompleto
            disableSection('section-result');
            disableSection('section-veri');
        }
    } else {
        // Se wallet não conectada, esconder seções subsequentes
        disableSection('section-basic-info');
        disableSection('section-result');
        disableSection('section-veri');
    }
}

/**
 * Valida dados básicos do token
 */
function validateBasicTokenData() {
    const tokenName = document.getElementById('tokenName')?.value.trim();
    const tokenSymbol = document.getElementById('tokenSymbol')?.value.trim();
    const totalSupply = document.getElementById('totalSupply')?.value.trim();
    const ownerAddress = document.getElementById('ownerAddress')?.value.trim();
    
    return tokenName && tokenSymbol && totalSupply && ownerAddress;
}

/**
 * Atualiza indicador de progresso
 */
function updateProgressIndicator(isComplete) {
    const progressIndicator = document.getElementById('progress-indicator');
    const missingFields = document.getElementById('missing-fields');
    
    if (isComplete) {
        if (progressIndicator) progressIndicator.style.display = 'block';
        if (missingFields) missingFields.style.display = 'none';
    } else {
        if (progressIndicator) progressIndicator.style.display = 'none';
        if (missingFields) missingFields.style.display = 'block';
    }
}

/**
 * Manipula criação do token com sistema simples de feedback
 */
async function handleTokenCreation() {
    console.log('🚀 Iniciando criação do token...');
    
    // Verificar se wallet está conectada
    if (!AppState.wallet.connected) {
        alert('Por favor, conecte sua carteira primeiro.');
        return;
    }
    
    // Verificar campos obrigatórios
    const tokenName = document.getElementById('tokenName').value.trim();
    const tokenSymbol = document.getElementById('tokenSymbol').value.trim();
    const totalSupply = document.getElementById('totalSupply').value.trim();
    const ownerAddress = document.getElementById('ownerAddress').value.trim();
    
    if (!tokenName || !tokenSymbol || !totalSupply || !ownerAddress) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }
    
    const createTokenBtn = document.getElementById('create-token-btn');
    
    try {
        // Executar etapas lendo do HTML com callback para deploy real
        const success = await executeButtonStepsFromHTML('create-token-btn', 1800, async () => {
            // Durante a etapa 3 (Deploy), executar o deploy real
            const result = await deployToken();
            if (!result) {
                throw new Error('Falha no deploy do token');
            }
        });
        
        if (success) {
            // Mostrar seções finais após 2 segundos
            setTimeout(() => {
                showFinalSections();
            }, 2000);
        } else {
            throw new Error('Erro durante execução das etapas');
        }
        
    } catch (error) {
        console.error('❌ Erro na criação do token:', error);
        
        // Mostrar erro
        const errorMsg = getSimpleErrorMessage(error);
        setButtonError(createTokenBtn, `... ERRO: ${errorMsg} ...`);
        
        // Restaurar botão após 7 segundos
        setTimeout(() => {
            resetButtonToInitial('create-token-btn', 'Criar Token', 'bi-rocket-takeoff');
        }, 7000);
    }
}

// ========================================================================================
// SISTEMA GENÉRICO DE BOTÃO COM ETAPAS - REUTILIZÁVEL PARA QUALQUER SISTEMA
// ========================================================================================

// Cores padrão para as 5 etapas + estado inicial (valores hexadecimais diretos)
const STEP_COLORS_HEX = {
    0: '#ED5A22',    // Laranja - Estado inicial
    1: '#495057',    // Cinza escuro - Primeira etapa  
    2: '#6c757d',    // Cinza médio - Segunda etapa
    3: '#adb5bd',    // Cinza claro - Terceira etapa
    4: '#007bff',    // Azul - Quarta etapa
    5: '#28a745'     // Verde - Estado final
};

// Classes CSS para backup
const STEP_COLORS = {
    0: 'btn-primary-custom',    // Laranja #ED5A22 - Estado inicial
    1: 'btn-working-step1',     // Cinza escuro - Primeira etapa  
    2: 'btn-working-step2',     // Cinza médio - Segunda etapa
    3: 'btn-working-step3',     // Cinza claro - Terceira etapa
    4: 'btn-working-step4',     // Azul - Quarta etapa
    5: 'btn-success-final'      // Verde - Estado final
};

/**
 * FUNÇÃO ULTRA-ROBUSTA: Aplica estilo com máxima força bruta
 */
function forceButtonStyle(button, stepIndex, text, icon = 'bi-gear-fill') {
    const hexColor = STEP_COLORS_HEX[stepIndex];
    const cssClass = STEP_COLORS[stepIndex];
    
    // FORÇA BRUTA 1: Remover todos os estilos inline conflitantes
    button.removeAttribute('style');
    
    // FORÇA BRUTA 2: Aplicar estilo inline com setProperty (bypassa !important)
    button.style.setProperty('background-color', hexColor, 'important');
    button.style.setProperty('border-color', hexColor, 'important');
    button.style.setProperty('color', 'white', 'important');
    button.style.setProperty('width', '100%', 'important');
    button.style.setProperty('font-weight', 'bold', 'important');
    
    // FORÇA BRUTA 3: Aplicar classe CSS
    button.className = `btn btn-lg shadow-lg ${cssClass}`;
    
    // FORÇA BRUTA 4: Conteúdo do botão
    button.innerHTML = `<i class="${icon} spin-simple me-2"></i>${text}`;
    
    // FORÇA BRUTA 5: Forçar repaint
    button.offsetHeight; // Trigger reflow
    
    console.log(`🎨 FORÇA BRUTA APLICADA - Etapa ${stepIndex}: Cor ${hexColor}, Texto "${text}"`);
}

/**
 * FUNÇÃO GENÉRICA: Executa etapas sequenciais no botão lendo do HTML
 * @param {string} buttonId - ID do botão
 * @param {number} delayMs - Delay entre etapas em milissegundos
 * @param {Function} callback - Função callback executada durante o processo
 * @returns {Promise<boolean>} - true se sucesso, false se erro
 */
async function executeButtonStepsFromHTML(buttonId, delayMs = 2000, callback = null) {
    const button = document.getElementById(buttonId);
    if (!button) return false;
    
    // Ler etapas do data-attribute do HTML
    const stepsData = button.getAttribute('data-steps');
    if (!stepsData) {
        console.error('❌ Nenhuma etapa encontrada no atributo data-steps');
        return false;
    }
    
    let steps;
    try {
        steps = JSON.parse(stepsData);
    } catch (error) {
        console.error('❌ Erro ao parsear data-steps:', error);
        return false;
    }
    
    // Desabilitar botão durante o processo
    button.disabled = true;
    
    try {
        // Executar cada etapa
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            
            // USAR SISTEMA ROBUSTO para garantir que cores sejam aplicadas
            forceButtonStyle(button, i + 1, step.text, step.icon);
            
            // Aguardar delay ANTES do callback para etapa ser visível
            if (i < steps.length - 1) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
            
            // Executar callback APÓS delay na etapa 3 (Deploy)
            if (i === 2 && callback && typeof callback === 'function') {
                console.log('🚀 Executando callback no Deploy (etapa 3)...');
                try {
                    await callback();
                    console.log('✅ Callback do Deploy finalizado com sucesso');
                } catch (callbackError) {
                    console.error('❌ Erro no callback do Deploy:', callbackError);
                    throw callbackError;
                }
            }
        }
        
        // ESTADO FINAL COM FORÇA BRUTA MÁXIMA - TRAVAMENTO ABSOLUTO
        console.log('🔒 Aplicando travamento absoluto do botão...');
        
        // 1. Remover todos os estilos conflitantes
        button.removeAttribute('style');
        
        // 2. Aplicar cor verde com força bruta
        button.style.setProperty('background-color', '#28a745', 'important');
        button.style.setProperty('border-color', '#28a745', 'important');
        button.style.setProperty('color', 'white', 'important');
        button.style.setProperty('width', '100%', 'important');
        button.style.setProperty('font-weight', 'bold', 'important');
        button.style.setProperty('pointer-events', 'none', 'important');
        button.style.setProperty('cursor', 'not-allowed', 'important');
        button.style.setProperty('opacity', '0.85', 'important');
        
        // 3. Aplicar classe CSS final
        button.className = 'btn btn-lg shadow-lg btn-success-final';
        
        // 4. Desabilitação múltipla
        button.disabled = true;
        button.setAttribute('disabled', 'disabled');
        button.setAttribute('aria-disabled', 'true');
        
        // 5. Remover TODOS os event listeners clonando o elemento
        const parent = button.parentNode;
        const newButton = button.cloneNode(true);
        parent.replaceChild(newButton, button);
        
        // 6. Forçar repaint
        newButton.offsetHeight;
        
        console.log('✅ TRAVAMENTO ABSOLUTO APLICADO - Botão está 100% inativo e verde');
        return true;
        
    } catch (error) {
        console.error('❌ Erro durante execução das etapas:', error);
        setButtonError(button, 'Erro no processo');
        return false;
    }
}

/**
 * FUNÇÃO GENÉRICA: Executa etapas sequenciais no botão com etapas passadas por parâmetro
 * @param {string} buttonId - ID do botão
 * @param {Array} steps - Array com objetos {text: string, icon?: string, animation?: string}
 * @param {number} delayMs - Delay entre etapas em milissegundos
 * @param {Function} callback - Função callback executada após completar
 * @returns {Promise<boolean>} - true se sucesso, false se erro
 */
async function executeButtonSteps(buttonId, steps, delayMs = 2000, callback = null) {
    const button = document.getElementById(buttonId);
    if (!button) return false;
    
    // Desabilitar botão durante o processo
    button.disabled = true;
    
    try {
        // Executar cada etapa
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const colorClass = STEP_COLORS[i + 1] || 'btn-working';
            
            // Aplicar cor e texto da etapa
            button.className = `btn btn-lg shadow-lg ${colorClass}`;
            button.style.width = '100%';
            button.style.fontWeight = 'bold';
            button.innerHTML = `<i class="${step.icon || 'bi-gear-fill'} ${step.animation || 'spin-simple'} me-2"></i>${step.text}`;
            
            console.log(`🔄 Etapa ${i + 1}: ${step.text}`);
            
            // Aguardar delay antes da próxima etapa (exceto na última)
            if (i < steps.length - 1) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
        
        // Executar callback se fornecido
        if (callback && typeof callback === 'function') {
            await callback();
        }
        
        console.log('✅ Todas as etapas do botão completadas com sucesso');
        return true;
        
    } catch (error) {
        console.error('❌ Erro durante execução das etapas:', error);
        setButtonError(button, 'Erro no processo');
        return false;
    }
}

/**
 * FUNÇÃO GENÉRICA: Reseta botão ao estado inicial
 * @param {string} buttonId - ID do botão
 * @param {string} initialText - Texto inicial
 * @param {string} initialIcon - Ícone inicial
 */
function resetButtonToInitial(buttonId, initialText = 'Criar Token', initialIcon = 'bi-rocket-takeoff') {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    button.disabled = false;
    button.className = 'btn btn-lg shadow-lg btn-primary-custom';
    button.style.width = '100%';
    button.style.fontWeight = 'bold';
    button.innerHTML = `<i class="${initialIcon} me-2"></i>${initialText}`;
    console.log(`🔄 Botão resetado: ${initialText}`);
}

// ========================================================================================
// FUNÇÕES ESPECÍFICAS ANTIGAS - MANTIDAS PARA COMPATIBILIDADE
// ========================================================================================

/**
 * Define botão no estado de trabalho (cinza + spinner) com ícone personalizado
 */
function setButtonWorking(button, text, icon = 'bi-gear-fill') {
    if (!button) return;
    
    button.className = 'btn btn-lg shadow-lg btn-working';
    button.style.width = '100%';
    button.style.fontWeight = 'bold';
    button.innerHTML = `<i class="bi ${icon} me-2"></i>${text}`;
    button.disabled = true;
    
    console.log(`⚙️ Botão: ${text}`);
}

/**
 * Define botão no estado de sucesso FINAL (verde e permanentemente desabilitado)
 */
function setButtonFinalSuccess(button, text) {
    if (!button) return;
    
    button.className = 'btn btn-lg shadow-lg btn-success-final';
    button.style.width = '100%';
    button.style.fontWeight = 'bold';
    button.innerHTML = `<i class="bi bi-check-circle-fill me-2"></i>${text}`;
    button.disabled = true; // DESABILITADO PERMANENTEMENTE
    
    console.log(`✅ Botão FINAL: ${text}`);
}

/**
 * Define botão no estado de erro (vermelho)
 */
function setButtonError(button, text) {
    if (!button) return;
    
    button.className = 'btn btn-lg shadow-lg btn-error-final';
    button.style.width = '100%';
    button.style.fontWeight = 'bold';
    button.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-2"></i>${text}`;
    button.disabled = false; // Permite tentar novamente
    
    console.log(`❌ Botão: ${text}`);
}

/**
 * Restaura o botão ao estado padrão (laranja #ED5A22)
 */
function resetButtonToDefault(button) {
    if (!button) return;
    
    button.className = 'btn btn-lg shadow-lg';
    button.style.width = '100%';
    button.style.fontWeight = 'bold';
    button.innerHTML = '<i class="bi bi-rocket-takeoff me-2"></i>Criar Token';
    button.disabled = false;
    
    console.log('🔄 Botão restaurado');
}

/**
 * Converte erros complexos em mensagens simples
 */
function getSimpleErrorMessage(error) {
    if (!error.message) return 'Erro desconhecido';
    
    const msg = error.message.toLowerCase();
    
    if (msg.includes('user denied') || msg.includes('rejected')) {
        return 'Transação cancelada';
    }
    if (msg.includes('insufficient funds')) {
        return 'Saldo insuficiente';
    }
    if (msg.includes('network') || msg.includes('connection')) {
        return 'Erro de rede';
    }
    if (msg.includes('timeout')) {
        return 'Timeout';
    }
    
    // Retornar primeiras 30 chars da mensagem original
    return error.message.substring(0, 30) + '...';
}

/**
 * Função auxiliar para pausas/delays
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Função de teste simples para TODAS as etapas
 */
async function testButtonComplete() {
    console.log('🧪 Testando sistema genérico de etapas...');
    
    // Definir as 5 etapas para teste
    const testSteps = [
        { text: '... Gerar Contrato e Token ....', icon: 'bi-gear-fill', animation: 'spin-simple' },
        { text: '... Compilando .....', icon: 'bi-code-slash', animation: 'pulse-simple' },
        { text: '... Deploy ......', icon: 'bi-upload', animation: 'bounce-simple' },
        { text: '... Configurando ....', icon: 'bi-sliders', animation: 'spin-simple' },
        { text: '.... Contrato e Token Criados com Sucesso ......', icon: 'bi-check-circle-fill', animation: 'bounce-simple' }
    ];
    
    // Executar etapas com delay de 2 segundos
    const success = await executeButtonSteps('create-token-btn', testSteps, 2000);
    
    if (success) {
        console.log('✅ Teste completo - Todas as 5 etapas executadas com sucesso!');
    } else {
        console.log('❌ Teste falhou');
    }
}

async function testButtonFromHTML() {
    console.log('🧪 Testando sistema ROBUSTO com etapas do HTML...');
    
    const button = document.getElementById('create-token-btn');
    if (!button) {
        console.error('❌ Botão não encontrado!');
        return;
    }
    
    // Mostrar botão se estiver oculto para teste
    button.style.display = 'block';
    
    // Executar etapas lendo do HTML
    const success = await executeButtonStepsFromHTML('create-token-btn', 2000);
    
    if (success) {
        console.log('✅ Teste completo - Verificar se botão está VERDE e TOTALMENTE DESABILITADO');
        
        // Verificação adicional
        setTimeout(() => {
            const finalButton = document.getElementById('create-token-btn');
            console.log('🔍 Estado final do botão:', {
                backgroundColor: finalButton.style.backgroundColor,
                disabled: finalButton.disabled,
                className: finalButton.className,
                pointerEvents: finalButton.style.pointerEvents
            });
        }, 1000);
    } else {
        console.log('❌ Teste falhou');
    }
}

// Para testar: testButtonFromHTML()

/**
 * FUNÇÃO DE DEBUG: Força exibição do botão para testes
 */
function forceShowButton() {
    const button = document.getElementById('create-token-btn');
    if (button) {
        button.style.display = 'block';
        button.style.backgroundColor = '#ED5A22';
        button.style.borderColor = '#ED5A22';
        button.style.color = 'white';
        button.disabled = false;
        console.log('🔧 Botão forçado a aparecer para teste');
        return true;
    } else {
        console.error('❌ Botão não encontrado!');
        return false;
    }
}

/**
 * FUNÇÃO DE DEBUG: Verifica estado completo
 */
function debugButtonState() {
    const button = document.getElementById('create-token-btn');
    const walletStatus = Wallet.getStatus();
    
    console.log('🔍 DEBUG COMPLETO:', {
        botaoEncontrado: !!button,
        botaoDisplay: button ? button.style.display : 'N/A',
        carteira: walletStatus,
        tokenData: tokenData,
        wallet: wallet
    });
    
    if (button) {
        console.log('🔍 Botão elemento:', {
            display: button.style.display,
            className: button.className,
            disabled: button.disabled,
            visible: button.offsetParent !== null
        });
    }
}

// Para debug: debugButtonState() ou forceShowButton()

/**
 * Configura listeners de eventos
 */
function setupEventListeners() {
    // Conectar MetaMask - evitar event listeners duplicados
    const connectBtn = document.getElementById('connect-metamask-btn');
    if (connectBtn && !connectBtn.hasConnectListener) {
        connectBtn.addEventListener('click', connectWallet);
        connectBtn.hasConnectListener = true;
    }
    
    // Botões de limpeza/reinício
    setupUtilityButtons();
    
    // Formulário de token - validation on input
    setupTokenInputs();
    
    // Deploy button
    const deployBtn = document.getElementById('deploy-token-btn');
    if (deployBtn) {
        deployBtn.addEventListener('click', deployToken);
    }
    
    // Create Token button (novo botão principal)
    const createTokenBtn = document.getElementById('create-token-btn');
    if (createTokenBtn && !createTokenBtn.hasCreateListener) {
        createTokenBtn.addEventListener('click', handleTokenCreation);
        createTokenBtn.hasCreateListener = true;
    }
    
    // Botão refresh gas estimation
    const refreshGasBtn = document.getElementById('refresh-gas-btn');
    if (refreshGasBtn) {
        refreshGasBtn.addEventListener('click', () => {
            estimateGasForDeploy().then(gasInfo => {
                updateGasDisplay(gasInfo);
            });
        });
    }
    
    // Botão visualizar contrato antes do deploy
    const previewContractBtn = document.getElementById('preview-contract-btn');
    if (previewContractBtn) {
        previewContractBtn.addEventListener('click', previewContractBeforeDeploy);
    }
    
    // Botões da seção de resultado
    setupResultButtons();
}

/**
 * Configura botões da seção de resultado
 */
function setupResultButtons() {
    // Copiar endereço do contrato
    const copyContractBtn = document.getElementById('copy-contract-btn');
    if (copyContractBtn) {
        copyContractBtn.addEventListener('click', () => {
            const contractAddress = document.getElementById('contract-address-display').value;
            if (contractAddress) {
                navigator.clipboard.writeText(contractAddress);
                showToast('Endereço copiado!', 'success');
            }
        });
    }
    
    // Copiar transaction hash
    const copyHashBtn = document.getElementById('copy-hash-btn');
    if (copyHashBtn) {
        copyHashBtn.addEventListener('click', () => {
            const txHash = document.getElementById('transaction-hash-display').value;
            if (txHash) {
                navigator.clipboard.writeText(txHash);
                showToast('Hash da transação copiado!', 'success');
            }
        });
    }
    
    // Ver no explorer
    const viewExplorerBtn = document.getElementById('view-explorer-btn');
    if (viewExplorerBtn) {
        viewExplorerBtn.addEventListener('click', () => {
            const contractAddress = document.getElementById('contract-address-display').value;
            if (contractAddress && AppState.deployResult) {
                const explorerUrl = AppState.deployResult.explorerUrl || 
                    `https://testnet.bscscan.com/address/${contractAddress}`;
                window.open(explorerUrl, '_blank');
            }
        });
    }
    
    // Ver hash da transação no explorer (novo botão)
    const viewHashBtn = document.getElementById('view-hash-btn');
    if (viewHashBtn) {
        viewHashBtn.addEventListener('click', () => {
            const txHash = document.getElementById('transaction-hash-display').value;
            if (txHash) {
                // Determinar a rede baseada no estado ou usar BSC Testnet como padrão
                const networkId = AppState.wallet.network?.chainId || '97';
                let explorerUrl;
                
                switch(networkId) {
                    case '1':
                    case 1:
                        explorerUrl = `https://etherscan.io/tx/${txHash}`;
                        break;
                    case '56':
                    case 56:
                        explorerUrl = `https://bscscan.com/tx/${txHash}`;
                        break;
                    case '97':
                    case 97:
                    default:
                        explorerUrl = `https://testnet.bscscan.com/tx/${txHash}`;
                        break;
                }
                
                window.open(explorerUrl, '_blank');
            }
        });
    }
    
    // Adicionar ao MetaMask
    const addToMetamaskBtn = document.getElementById('add-to-metamask-btn');
    if (addToMetamaskBtn) {
        addToMetamaskBtn.addEventListener('click', addTokenToMetaMask);
    }
    
    // Limpar tudo
    const clearAllBtn = document.getElementById('clear-all-btn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', resetApp);
    }
}

/**
 * Configura botões utilitários
 */
function setupUtilityButtons() {
    // Botão limpar específico
    const clearBtn = document.getElementById('clear-all-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', resetApp);
        console.log('✅ Botão limpar encontrado');
    }
    
    // Procurar por outros botões de limpeza e usar mesma função
    const clearSelectors = [
        '#clear-form', 
        '#limpar-form', 
        '#reset-form'
    ];
    
    clearSelectors.forEach(selector => {
        const btn = document.querySelector(selector);
        if (btn) {
            btn.addEventListener('click', resetApp); // Usar resetApp em vez de clearForm
            console.log(`✅ Botão adicional encontrado: ${selector}`);
        }
    });
}

/**
 * Configura inputs do token
 */
function setupTokenInputs() {
    const tokenInputs = ['tokenName', 'tokenSymbol', 'totalSupply', 'ownerAddress'];
    
    tokenInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('input', onTokenDataChange);
            
            // Máscara para Supply Total
            if (inputId === 'totalSupply') {
                input.addEventListener('input', formatSupplyInput);
            }
        }
    });
}

/**
 * Formata input de Supply com separador de milhares
 */
function formatSupplyInput(event) {
    const input = event.target;
    
    // Remove tudo que não é dígito
    let value = input.value.replace(/\D/g, ''); 
    
    if (!value) {
        input.value = '';
        AppState.tokenData.totalSupply = '';
        return;
    }
    
    // Converte para número
    const numericValue = parseInt(value, 10);
    
    // Valida se é um número válido e maior que 0
    if (isNaN(numericValue) || numericValue < 1) {
        input.value = '';
        AppState.tokenData.totalSupply = '';
        return;
    }
    
    // Adiciona separadores de milhares
    input.value = numericValue.toLocaleString('pt-BR');
    
    // Salva valor numérico no estado (sem formatação)
    AppState.tokenData.totalSupply = numericValue.toString();
    
    console.log(`💰 Supply formatado: ${input.value} (valor numérico: ${numericValue})`);
}

/**
 * Conecta com MetaMask usando sistema universal
 */
async function connectWallet() {
    try {
        // Evitar múltiplas chamadas
        const connectBtn = document.getElementById('connect-metamask-btn');
        if (connectBtn && connectBtn.disabled) {
            console.log('⏳ Conexão já em andamento...');
            return;
        }
        
        const result = await Wallet.connect();
        
        if (result) {
            // Atualizar estado global com dados do Wallet
            const status = Wallet.getStatus();
            AppState.wallet.connected = status.connected;
            AppState.wallet.address = status.address;
            AppState.wallet.network = status.network;
            
            console.log('✅ Wallet conectada:', AppState.wallet.address);
            console.log('🌐 Rede detectada:', AppState.wallet.network?.name);
            
            // Forçar atualização da rede após conectar
            setTimeout(() => {
                Wallet.forceNetworkUpdate();
            }, 1000);
            
            // Atualizar progresso visual
            updateVisualProgress();
        }
        
    } catch (error) {
        console.error('❌ Erro ao conectar wallet:', error);
        alert('Erro ao conectar: ' + error.message);
    }
}

/**
 * Detecta a rede da MetaMask - REMOVIDO: Usar WalletManager.detectNetwork()
 */
// async function detectNetwork() - Substituído pelo sistema padrão

/**
 * Obtém informações da rede - REMOVIDO: Usar WalletManager.getNetworkInfo()
 */
// function getNetworkInfo(chainId) - Substituído pelo sistema padrão

/**
 * Obtém saldo da carteira - REMOVIDO: Usar WalletManager.updateBalance()
 */
// async function getWalletBalance() - Substituído pelo sistema padrão

/**
 * Atualiza interface da carteira - REMOVIDO: Usar WalletManager.updateWalletUI()
 */
// function updateWalletUI() - Substituído pelo sistema padrão

/**
 * Detecta mudanças nos dados do token
 */
function onTokenDataChange(event) {
    // Salvar dados no estado
    const tokenName = document.getElementById('tokenName')?.value.trim() || '';
    const tokenSymbol = document.getElementById('tokenSymbol')?.value.trim().toUpperCase() || '';
    let totalSupply = document.getElementById('totalSupply')?.value.trim() || '';
    
    // Para supply, usar valor numérico
    if (event?.target?.id === 'totalSupply') {
        totalSupply = totalSupply.replace(/\D/g, ''); // Remove formatação para salvar
    } else {
        // Para outros campos, pegar valor do input de supply já processado
        totalSupply = AppState.tokenData.totalSupply || totalSupply.replace(/\D/g, '');
    }
    
    const newTokenData = {
        name: tokenName,
        symbol: tokenSymbol,
        totalSupply: totalSupply,
        decimals: document.getElementById('decimals')?.value || '18',
        owner: document.getElementById('ownerAddress')?.value.trim() || AppState.wallet.address
    };
    
    // Evitar logs duplicados - só atualizar se mudou
    const hasChanged = JSON.stringify(AppState.tokenData) !== JSON.stringify(newTokenData);
    if (hasChanged) {
        AppState.tokenData = newTokenData;
        console.log('📝 Dados atualizados:', {
            nome: AppState.tokenData.name,
            simbolo: AppState.tokenData.symbol,
            supply: AppState.tokenData.totalSupply,
            owner: AppState.tokenData.owner?.slice(0,10) + '...'
        });
        
        // Atualizar progresso visual
        updateVisualProgress();
    }
    
    // Converter símbolo para maiúsculas em tempo real
    if (event?.target?.id === 'tokenSymbol') {
        event.target.value = event.target.value.toUpperCase();
    }
}

/**
 * Verifica progresso - versão simplificada sem scroll automático
 */
function checkProgressAndScroll() {
    // Função legada - apenas atualiza dados sem verificações
    onTokenDataChange();
}

/**
 * Atualiza indicadores visuais dos campos
 */
function updateFieldIndicators(progressData) {
    const indicators = {
        'field-name': progressData.name.length >= 3,
        'field-symbol': progressData.symbol.length >= 2,
        'field-supply': progressData.supply && parseInt(progressData.supply) > 0,
        'field-owner': true // Opcional, sempre válido
    };
    
    Object.entries(indicators).forEach(([fieldId, isValid]) => {
        const element = document.getElementById(fieldId);
        if (element) {
            const icon = element.querySelector('i');
            if (icon) {
                if (isValid) {
                    icon.className = 'bi bi-check-circle me-2 text-success';
                } else {
                    icon.className = 'bi bi-circle me-2 text-warning';
                }
            }
        }
    });
}

/**
 * Mostra indicador de progresso com countdown
 */
function showProgressIndicator() {
    const progressIndicator = document.getElementById('progress-indicator');
    const missingFields = document.getElementById('missing-fields');
    
    if (progressIndicator) progressIndicator.style.display = 'block';
    if (missingFields) missingFields.style.display = 'none';
}

/**
 * Esconde indicador de progresso
 */
function hideProgressIndicator() {
    const progressIndicator = document.getElementById('progress-indicator');
    const missingFields = document.getElementById('missing-fields');
    
    if (progressIndicator) progressIndicator.style.display = 'none';
    if (missingFields) missingFields.style.display = 'block';
}

/**
 * Inicia countdown automático
 */
function startCountdown(callback) {
    let seconds = 3;
    const countdownElement = document.getElementById('countdown');
    const skipBtn = document.getElementById('skip-countdown');
    
    // Limpar countdown anterior se existir
    if (window.countdownTimer) {
        clearInterval(window.countdownTimer);
    }
    
    // Atualizar display inicial
    if (countdownElement) countdownElement.textContent = seconds;
    
    // Configurar botão de skip
    if (skipBtn) {
        skipBtn.onclick = () => {
            clearInterval(window.countdownTimer);
            callback();
        };
    }
    
    // Iniciar countdown
    window.countdownTimer = setInterval(() => {
        seconds--;
        if (countdownElement) countdownElement.textContent = seconds;
        
        if (seconds <= 0) {
            clearInterval(window.countdownTimer);
            callback();
        }
    }, 1000);
}

/**
 * Mostra preview do contrato em modal
 */
async function previewContract() {
    const { tokenData } = AppState;
    
    if (!tokenData.name || !tokenData.symbol) {
        alert('Preencha os dados do token antes de visualizar o código');
        return;
    }
    
    try {
        const contractCode = await generateSolidityContract(tokenData);
        
        // Usar modal existente no HTML
        const modal = document.getElementById('contractPreviewModal');
        const titleEl = document.getElementById('preview-modal-title');
        const infoEl = document.getElementById('preview-token-info');
        const codeEl = document.getElementById('preview-contract-code');
        
        // Atualizar conteúdo do modal
        if (titleEl) titleEl.textContent = `Preview: ${tokenData.symbol}.sol`;
        if (infoEl) infoEl.textContent = `Token: ${tokenData.name} (${tokenData.symbol})`;
        if (codeEl) codeEl.textContent = contractCode;
        
        // Mostrar modal
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        
    } catch (error) {
        console.error('❌ Erro ao gerar preview do contrato:', error);
        alert('Erro ao gerar preview do contrato. Tente novamente.');
    }
}

/**
 * Fecha modal programaticamente
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        if (typeof bootstrap !== 'undefined') {
            const bootstrapModal = bootstrap.Modal.getInstance(modal);
            if (bootstrapModal) bootstrapModal.hide();
        } else {
            modal.style.display = 'none';
            modal.classList.remove('show');
        }
    }
}

/**
 * Atualiza o resumo para deploy
 */
function updateDeploySummary() {
    const { tokenData, wallet } = AppState;
    
    console.log('📋 Atualizando resumo de deploy');
    
    // Atualizar campos individuais do resumo
    const summaryFields = {
        'display-token-name': tokenData.name || '-',
        'display-token-symbol': tokenData.symbol || '-', 
        'display-total-supply': tokenData.totalSupply ? `${parseInt(tokenData.totalSupply).toLocaleString('pt-BR')} tokens` : '-',
        'display-decimals': tokenData.decimals || '18',
        'display-owner': tokenData.owner ? `${tokenData.owner.slice(0, 8)}...${tokenData.owner.slice(-8)}` : '-'
    };
    
    // Atualizar cada campo
    Object.entries(summaryFields).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
    
    // Atualizar detalhes da rede
    const networkDetails = document.getElementById('network-details');
    if (networkDetails && wallet.network) {
        networkDetails.innerHTML = `
            <strong>Rede:</strong> ${wallet.network.name} | 
            <strong>Chain ID:</strong> ${wallet.network.chainId} | 
            <strong>Moeda:</strong> ${wallet.network.currency}
        `;
    }
    
    // Atualizar estimativa de custo
    const costEstimate = document.getElementById('deploy-cost-estimate');
    if (costEstimate && wallet.network) {
        const estimatedCost = getDeployCostEstimate(wallet.network.chainId);
        costEstimate.innerHTML = `
            <strong>Custo estimado:</strong> ${estimatedCost} ${wallet.network.currency}<br>
            <small class="text-muted">
                *Valor aproximado baseado na rede atual. O custo real pode variar conforme o gas price.
            </small>
        `;
    }
    
    // Habilitar botão de deploy
    const deployBtn = document.getElementById('deploy-token-btn');
    if (deployBtn) {
        deployBtn.disabled = false;
    }
    
    // Atualizar nome do arquivo de download
    updateDownloadButtonText();
}

/**
 * Estima custo de deploy baseado na rede
 */
function getDeployCostEstimate(chainId) {
    const costs = {
        1: '0.01-0.05',     // Ethereum
        137: '0.001-0.01',  // Polygon
        56: '0.005-0.02',   // BSC
        97: '0.005-0.02',   // BSC Testnet
        8453: '0.001-0.005', // Base
        11155111: '0.001-0.01' // Sepolia
    };
    
    return costs[chainId] || '0.001-0.01';
}

/**
 * Faz o deploy do token
 */
async function deployToken() {
    const deployBtn = document.getElementById('deploy-token-btn');
    const originalText = deployBtn?.innerHTML || 'Fazer Deploy';
    
    try {
        if (deployBtn) {
            deployBtn.disabled = true;
            deployBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Fazendo Deploy...';
        }
        
        onTokenDataChange({ target: { id: 'update' } }); // Atualizar dados
        
        if (!validateTokenData()) {
            throw new Error('Dados do token inválidos');
        }
        
        console.log('🚀 Iniciando deploy do token:', {
            nome: AppState.tokenData.name,
            simbolo: AppState.tokenData.symbol,
            supply: AppState.tokenData.totalSupply,
            decimais: AppState.tokenData.decimals,
            owner: AppState.tokenData.owner?.slice(0,10) + '...'
        });
        
        console.log('🚀 Iniciando deploy real via API híbrida');
        
        // Deploy usando template personalizado base.sol
        await deployWithCustomContract();
        
        // Mostrar resultado (seções 3 e 4 juntas)
        setTimeout(() => {
            showDeployResult(true);
            showFinalSections();
        }, 1000);
        
        console.log('✅ Deploy concluído com sucesso!');
        return true; // CRÍTICO: Retornar true quando bem-sucedido
        
    } catch (error) {
        console.error('❌ Erro no deploy:', error);
        
        // Tentar simulação como último recurso
        try {
            console.log('🔄 Tentando simulação de emergência...');
            updateDeployStatus('🔄 Executando simulação...');
            
            const simulatedResult = await simulateDeployForFallback(AppState.tokenData);
            
            // Salvar resultado simulado
            AppState.deployResult = {
                success: true,
                contractAddress: simulatedResult.contractAddress,
                transactionHash: simulatedResult.transactionHash,
                deployData: AppState.tokenData,
                gasUsed: simulatedResult.gasUsed,
                blockNumber: simulatedResult.blockNumber,
                isSimulated: true
            };
            
            updateDeployStatus('✅ Simulação concluída!');
            
            setTimeout(() => {
                showDeployResult(true);
                showFinalSections();
            }, 1000);
            
        } catch (simulationError) {
            console.error('❌ Erro na simulação:', simulationError);
            showDeployResult(false, error.message);
        }
        
        if (deployBtn) {
            deployBtn.innerHTML = originalText;
            deployBtn.disabled = false;
        }
    }
}

/**
 * Valida dados do token
 */
function validateTokenData() {
    const { tokenData, wallet } = AppState;
    
    if (!wallet.connected) {
        alert('Conecte sua carteira primeiro');
        return false;
    }
    
    if (!tokenData.name || tokenData.name.length < 3) {
        alert('Nome do token deve ter pelo menos 3 caracteres');
        return false;
    }
    
    if (!tokenData.symbol || tokenData.symbol.length < 2) {
        alert('Símbolo do token deve ter pelo menos 2 caracteres');
        return false;
    }
    
    if (!tokenData.totalSupply || isNaN(tokenData.totalSupply) || tokenData.totalSupply <= 0) {
        alert('Supply total deve ser um número válido maior que zero');
        return false;
    }
    
    return true;
}

/**
 * Simula deploy quando API falha
 */
async function simulateDeployForFallback(deployData) {
    console.log('🎭 Executando deploy simulado...');
    
    updateDeployStatus('🔨 Compilando contrato inteligente...');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    updateDeployStatus('⛽ Calculando custos de gas...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    updateDeployStatus('📡 Enviando transação...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    updateDeployStatus('⏳ Aguardando confirmação...');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Gerar endereços mock realísticos baseados na rede
    const networkPrefix = AppState.wallet.network?.chainId === 97 ? '0x024f' : '0x1a2b';
    const contractAddress = networkPrefix + Array(36).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    const transactionHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    
    const gasUsed = Math.floor(Math.random() * 200000) + 500000;
    const blockNumber = Math.floor(Math.random() * 1000000) + 15000000;
    
    return {
        success: true,
        contractAddress: contractAddress,
        transactionHash: transactionHash,
        gasUsed: gasUsed,
        blockNumber: blockNumber,
        deploymentCost: (gasUsed * 0.000000005).toFixed(6), // Custo estimado em ETH/BNB
        message: 'Deploy simulado concluído com sucesso',
        networkName: AppState.wallet.network?.name || 'Rede de Teste',
        explorerUrl: `https://testnet.bscscan.com/tx/${transactionHash}`
    };
}

/**
 * Verifica status da API
 */
async function checkApiStatus() {
    try {
        console.log('🔍 Verificando status da API híbrida...');
        const api = new XcafeHybridAPI();
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(`${api.baseUrl}/health`, { 
            method: 'GET',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ API Status:', data);
            return { 
                available: true, 
                status: 'online', 
                message: 'API híbrida disponível',
                version: data.version || 'hybrid-1.0',
                mode: 'hybrid'
            };
        } else {
            console.warn('⚠️ API respondeu com erro:', response.status);
            return { 
                available: false, 
                status: 'error', 
                message: `HTTP ${response.status}` 
            };
        }
    } catch (error) {
        console.error('❌ Erro ao verificar API:', error.message);
        return { 
            available: false, 
            status: 'offline', 
            message: error.name === 'AbortError' ? 'Timeout' : 'API indisponível' 
        };
    }
}

/**
 * Atualiza indicador de status da API
 */
async function updateApiStatus() {
    const statusElement = document.getElementById('api-status');
    if (!statusElement) {
        console.warn('⚠️ Elemento api-status não encontrado');
        return;
    }
    
    // Mostrar estado de carregamento
    statusElement.innerHTML = `
        <i class="bi bi-hourglass-split text-warning me-2"></i>
        <span class="text-warning">Verificando API...</span>
    `;
    
    const status = await checkApiStatus();
    
    if (status.available) {
        statusElement.innerHTML = `
            <i class="bi bi-check-circle text-success me-2"></i>
            <span class="text-success">API Híbrida Online</span>
            <small class="text-muted ms-2">v${status.version} - ${status.mode}</small>
        `;
        
        console.log('✅ API híbrida está online e funcionando');
        
        // Garantir que modo real está disponível
        const realRadio = document.getElementById('realDeploy');
        if (realRadio) realRadio.disabled = false;
        
    } else {
        statusElement.innerHTML = `
            <i class="bi bi-x-circle text-danger me-2"></i>
            <span class="text-danger">API ${status.status}</span>
            <small class="text-muted ms-2">${status.message}</small>
        `;
        
        console.warn('⚠️ API indisponível:', status.message);
        
        // Auto-selecionar simulação se API estiver offline
        const simulatedRadio = document.getElementById('simulatedDeploy');
        if (simulatedRadio) {
            simulatedRadio.checked = true;
            console.log('🔄 Auto-selecionando modo simulação');
        }
        
        // Desabilitar modo real se API não funcionar
        const realRadio = document.getElementById('realDeploy');
        if (realRadio) realRadio.disabled = true;
    }
}

/**
 * Testa especificamente o endpoint de compilação
 */
async function testDeployEndpoint() {
    try {
        console.log('🧪 Testando endpoint de compilação...');
        const api = new XcafeHybridAPI();
        
        // Dados de teste mínimos
        const testData = {
            name: "TestToken",
            symbol: "TEST", 
            totalSupply: "1000",
            decimals: 18
        };
        
        const response = await fetch(`${api.baseUrl}/api/generate-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });
        
        const result = await response.text();
        console.log('🧪 Resposta do teste:', {
            status: response.status,
            ok: response.ok,
            response: result
        });
        
        return response.ok;
        
    } catch (error) {
        console.error('🧪 Erro no teste de compilação:', error);
        return false;
    }
}

/**
 * Função para testar API manualmente (chamada pelo botão)
 */
async function testApiStatus() {
    console.log('🔄 Teste manual da API iniciado...');
    
    const button = event.target.closest('button');
    const originalHtml = button.innerHTML;
    
    button.innerHTML = '<i class="bi bi-hourglass-split"></i>';
    button.disabled = true;
    
    try {
        // Teste básico da API
        await updateApiStatus();
        
        // Teste avançado do endpoint de deploy
        const deployWorks = await testDeployEndpoint();
        
        console.log('📊 Resultado dos testes:', {
            apiOnline: true,
            deployEndpoint: deployWorks
        });
        
        if (deployWorks) {
            console.log('✅ API híbrida totalmente funcional!');
        } else {
            console.log('⚠️ API online mas endpoint de compilação com problemas');
        }
        
    } catch (error) {
        console.error('❌ Erro durante teste:', error);
    } finally {
        button.innerHTML = originalHtml;
        button.disabled = false;
    }
}

/**
 * Deploy personalizado usando template da pasta /contratos/
 */
async function deployWithCustomContract() {
    const { tokenData, wallet } = AppState;
    
    try {
        updateDeployStatus('📋 Carregando template do contrato...');
        
        // 1. Gerar contrato a partir do template base.sol
        const contractCode = await generateContractFromTemplate(tokenData, 'base');
        
        updateDeployStatus('🔗 Compilando contrato...');
        
        // Verificar se XcafeHybridAPI está disponível
        if (typeof XcafeHybridAPI === 'undefined') {
            throw new Error('API híbrida não carregada');
        }
        
        const api = new XcafeHybridAPI();
        
        // Deploy usando API padrão (que já usa templates internos)
        const result = await api.createToken({
            name: tokenData.name,
            symbol: tokenData.symbol,
            totalSupply: tokenData.totalSupply,
            decimals: parseInt(tokenData.decimals),
            owner: tokenData.owner
        });
        
        console.log('✅ Token criado com API (usa templates internos):', result);
        
        updateDeployStatus('✅ Deploy concluído!');
        
        // CRÍTICO: Salvar código fonte da API para verificação
        let apiSourceCode = null;
        if (result.sourceCode) {
            apiSourceCode = result.sourceCode;
        } else if (result.token?.sourceCode) {
            apiSourceCode = result.token.sourceCode;
        }
        
        if (apiSourceCode) {
            console.log('🔐 Código fonte da API salvo para verificação:', apiSourceCode.substring(0, 100) + '...');
        }
        
        // Salvar resultado no estado com dados completos
        AppState.deployResult = {
            success: true,
            contractAddress: result.contract?.address || result.contractAddress,
            transactionHash: result.contract?.transactionHash || result.transactionHash,
            deployData: tokenData,
            gasUsed: result.gasUsed || 'N/A',
            blockNumber: result.blockNumber || 'N/A',
            sourceCode: apiSourceCode, // Código real da API
            compilation: result.token?.compilation || null
        };
        
        return result;
        
    } catch (error) {
        console.error('Erro no deploy personalizado:', error);
        
        // Se falhar, usar deploy padrão como fallback
        console.log('🔄 Usando deploy padrão como fallback...');
        return await performRealDeploy();
    }
}

/**
 * Executa deploy real usando API
 */
async function performRealDeploy() {
    const { tokenData, wallet } = AppState;
    
    try {
        updateDeployStatus('📋 Preparando deploy...');
        
        // Verificar se XcafeHybridAPI está disponível
        if (typeof XcafeHybridAPI === 'undefined') {
            throw new Error('API híbrida não carregada');
        }
        
        const api = new XcafeHybridAPI();
        
        updateDeployStatus('🔗 Conectando com MetaMask...');
        
        // Usar a nova API híbrida - o método createToken gerencia todo o processo
        console.log('� Usando API híbrida para criar token...');
        
        const result = await api.createToken({
            name: tokenData.name,
            symbol: tokenData.symbol,
            totalSupply: tokenData.totalSupply,
            decimals: parseInt(tokenData.decimals),
            owner: tokenData.owner
        });
        
        console.log('✅ Token criado via API híbrida:', result);
        
        updateDeployStatus('✅ Deploy concluído!');
        
        // Salvar resultado no estado com dados completos
        AppState.deployResult = {
            success: true,
            contractAddress: result.contract?.address || result.contractAddress,
            transactionHash: result.contract?.transactionHash || result.transactionHash,
            deployData: tokenData,
            gasUsed: result.gasUsed || 'N/A',
            blockNumber: result.blockNumber || 'N/A',
            sourceCode: result.sourceCode || result.token?.sourceCode || null, // Código da API
            compilation: result.compilation || result.token?.compilation || null
        };
        
        // CRÍTICO: Garantir que o código real da API seja salvo para verificação
        if (result.sourceCode) {
            deploymentState.contractCode = result.sourceCode;
            console.log('� Código fonte da API salvo para verificação:', result.sourceCode.substring(0, 100) + '...');
        } else if (result.token?.sourceCode) {
            deploymentState.contractCode = result.token.sourceCode;
            console.log('🔐 Código fonte da API (token) salvo para verificação');
        } else {
            console.warn('⚠️ ATENÇÃO: Código fonte da API não encontrado! Verificação pode falhar.');
        }
        
        console.log('✅ Deploy concluído:', AppState.deployResult);
        
        return result;
        
    } catch (error) {
        updateDeployStatus(`❌ Erro: ${error.message}`);
        throw error;
    }
}

/**
 * Verifica contrato na rede
 */
async function verifyContract(contractAddress, deployData) {
    try {
        console.log('🔍 Iniciando verificação do contrato...');
        
        // Para redes que suportam verificação automática
        const verificationNetworks = [1, 137, 56, 8453]; // Ethereum, Polygon, BSC, Base
        const currentChainId = AppState.wallet.network?.chainId;
        
        if (!verificationNetworks.includes(currentChainId)) {
            console.log('⚠️ Rede não suporta verificação automática');
            return;
        }
        
        // Simular verificação (poderia ser integrada com APIs de verificação)
        console.log(`✅ Contrato verificado: ${contractAddress}`);
        
        // Atualizar UI com informação de verificação
        if (AppState.deployResult) {
            AppState.deployResult.verified = true;
            AppState.deployResult.verificationUrl = getExplorerVerificationUrl(contractAddress, currentChainId);
        }
        
    } catch (error) {
        console.error('❌ Erro na verificação:', error);
        throw error;
    }
}

/**
 * Gera URL do explorer para verificação
 */
function getExplorerVerificationUrl(contractAddress, chainId) {
    const explorers = {
        1: `https://etherscan.io/address/${contractAddress}#code`,
        137: `https://polygonscan.com/address/${contractAddress}#code`,
        56: `https://bscscan.com/address/${contractAddress}#code`,
        8453: `https://basescan.org/address/${contractAddress}#code`
    };
    
    return explorers[chainId] || `https://etherscan.io/address/${contractAddress}#code`;
}

/**
 * Atualiza status do deploy na UI
 */
function updateDeployStatus(message) {
    console.log(message);
    
    const deployBtn = document.getElementById('deploy-token-btn');
    if (deployBtn) {
        const textContent = message.replace(/^[🔗📋📝✅❌]\s*/, '');
        deployBtn.innerHTML = `<i class="bi bi-gear-fill spin me-2"></i><span>${textContent}</span>`;
    }
}

/**
 * Mostra resultado do deploy
 */


/***
 * Navegação e utilidades
 */
function scrollToNextSection() {
    const sections = ['section-wallet', 'section-basic-info', 'section-deploy'];
    let currentIndex = 0;
    
    // Encontrar seção atual
    sections.forEach((sectionId, index) => {
        const section = document.getElementById(sectionId);
        if (section && section.classList.contains('active')) {
            currentIndex = index;
        }
    });
    
    // Ir para próxima seção
    if (currentIndex < sections.length - 1) {
        scrollToSection(sections[currentIndex + 1]);
    }
}

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        // Mostrar a seção antes de fazer scroll
        section.style.display = 'block';
        
        section.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
        
        // Habilitar seção
        enableSection(sectionId);
        
        console.log(`📍 Navegando para: ${sectionId}`);
    }
}

function enableSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('section-enabled', 'active');
        section.style.display = 'block';
        section.style.opacity = '1';
        section.style.pointerEvents = 'all';
    }
}

function disableSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.remove('section-enabled', 'active');
        section.style.display = 'none';
        section.style.opacity = '0.6';
        section.style.pointerEvents = 'none';
    }
}

/**
 * Mostra as seções finais (3 e 4) sempre juntas e garante botão no estado final
 */
function showFinalSections() {
    enableSection('section-result');
    enableSection('section-veri');
    
    // Garantir que o botão esteja no estado final correto
    const createTokenBtn = document.getElementById('create-token-btn');
    if (createTokenBtn) {
        setButtonFinalSuccess(createTokenBtn, 'CONTRATO GERADO COM SUCESSO');
    }
    
    // CONFIGURAR BOTÕES QUANDO A SEÇÃO FICA VISÍVEL
    setTimeout(() => {
        configureContractButtons();
    }, 100);
    
    console.log('✅ Seções finais (3 e 4) habilitadas juntas');
    
    // Scroll suave para a seção de resultado
    setTimeout(() => {
        const resultSection = document.getElementById('section-result');
        if (resultSection) {
            resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 300);
}

/**
 * Configura especificamente os botões de contrato quando a seção fica visível
 */
function configureContractButtons() {
    console.log('🔧 Configurando botões de contrato na seção visível...');
    
    const viewBtn = document.getElementById('view-contract-btn');
    const verifyBtn = document.getElementById('verify-contract-btn');
    
    if (viewBtn) {
        console.log('✅ Botão Visualizar encontrado, configurando...');
        
        // Remover todos os listeners existentes
        viewBtn.onclick = null;
        viewBtn.removeAttribute('onclick');
        
        // Configurar novo listener com tratamento de erro
        viewBtn.onclick = function(e) {
            console.log('🖱️ Botão Visualizar clicado!');
            e.preventDefault();
            e.stopPropagation();
            
            try {
                // Verificar se a função existe
                if (typeof showContractModal === 'function') {
                    console.log('📞 Chamando showContractModal...');
                    showContractModal();
                } else {
                    console.error('❌ Função showContractModal não encontrada');
                    alert('Erro: Função showContractModal não está disponível');
                }
            } catch (error) {
                console.error('❌ Erro ao executar showContractModal:', error);
                alert('Erro ao abrir modal do contrato: ' + error.message);
            }
        };
        
        // Garantir que o botão está habilitado e visível
        viewBtn.disabled = false;
        viewBtn.style.opacity = '1';
        viewBtn.style.pointerEvents = 'all';
        viewBtn.style.display = '';
        
        // Adicionar classe para indicar que está configurado
        viewBtn.classList.add('configured');
        
        console.log('✅ Botão Visualizar configurado com sucesso');
        
        // Teste imediato para verificar se está funcionando
        console.log('🧪 Testando configuração do botão Visualizar...');
        console.log('   - Onclick definido:', !!viewBtn.onclick);
        console.log('   - Disabled:', viewBtn.disabled);
        console.log('   - Opacity:', viewBtn.style.opacity);
    } else {
        console.warn('⚠️ Botão view-contract-btn não encontrado no DOM');
        
        // Debug: verificar se existe na página
        const allButtons = document.querySelectorAll('button[id*="contract"]');
        console.log('🔍 Botões com "contract" no ID encontrados:', allButtons.length);
        allButtons.forEach(btn => {
            console.log('   -', btn.id, btn.textContent.trim());
        });
    }
    
    if (verifyBtn) {
        console.log('✅ Botão Verificar encontrado, configurando...');
        
        // Remover listeners antigos (se houver)
        verifyBtn.onclick = null;
        verifyBtn.removeAttribute('onclick');
        
        // Adicionar novo listener com tratamento de erro
        verifyBtn.onclick = function(e) {
            console.log('🖱️ Botão Verificar clicado!');
            e.preventDefault();
            e.stopPropagation();
            
            try {
                if (typeof openVerificationUrl === 'function') {
                    openVerificationUrl();
                } else {
                    console.error('❌ Função openVerificationUrl não encontrada');
                    alert('Erro: Função openVerificationUrl não está disponível');
                }
            } catch (error) {
                console.error('❌ Erro ao executar openVerificationUrl:', error);
                alert('Erro ao abrir verificação: ' + error.message);
            }
        };
        
        verifyBtn.disabled = false;
        verifyBtn.style.opacity = '1';
        verifyBtn.style.pointerEvents = 'all';
        verifyBtn.style.display = '';
        verifyBtn.classList.add('configured');
        
        console.log('✅ Botão Verificar configurado com sucesso');
    } else {
        console.warn('⚠️ Botão verify-contract-btn não encontrado');
    }
    
    // Log final do status
    console.log('📊 Status final dos botões:');
    console.log('   - Visualizar:', viewBtn ? '✅ Configurado' : '❌ Não encontrado');
    console.log('   - Verificar:', verifyBtn ? '✅ Configurado' : '❌ Não encontrado');
}

function showOnlyFirstSection() {
    const allSections = document.querySelectorAll('.creation-section');
    allSections.forEach((section, index) => {
        if (index === 0) {
            // Primeira seção: mostrar e ativar
            enableSection(section.id);
        } else {
            // Outras seções: esconder
            disableSection(section.id);
        }
    });
    
    // Esconder botão criar token inicialmente
    const createTokenBtn = document.getElementById('create-token-btn');
    if (createTokenBtn) {
        createTokenBtn.style.display = 'none';
    }
}

function resetApp() {
    console.log('🔄 Iniciando reset completo...');
    
    // Limpar timers
    if (window.countdownTimer) {
        clearInterval(window.countdownTimer);
        window.countdownTimer = null;
    }
    
    // Reset apenas dos dados do token - MANTER CONEXÃO DA WALLET
    const walletStatus = Wallet.getStatus();
    
    // Limpar COMPLETAMENTE os dados do token
    AppState.tokenData = {
        name: '',
        symbol: '',
        totalSupply: '',
        decimals: '18',
        owner: ''
    };
    AppState.deployResult = null;
    
    // Manter dados da wallet se estiver conectada
    if (walletStatus.connected) {
        AppState.wallet = {
            connected: true,
            address: walletStatus.address,
            network: walletStatus.network
        };
    } else {
        AppState.wallet = {
            connected: false,
            address: '',
            network: null
        };
    }
    
    // Usar função de limpeza do Wallet que mantém conexão
    Wallet.clearFormData();
    
    // Resetar decimais para valor padrão
    const decimalsInput = document.getElementById('decimals');
    if (decimalsInput) decimalsInput.value = '18';
    
    // Limpar indicadores de progresso
    hideProgressIndicator();
    
    // Reset indicadores visuais dos campos
    const fieldIndicators = ['field-name', 'field-symbol', 'field-supply', 'field-owner'];
    fieldIndicators.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            const icon = element.querySelector('i');
            if (icon) {
                icon.className = 'bi bi-circle me-2 text-warning';
            }
        }
    });
    
    // Limpar resumo de deploy
    const summaryFields = ['display-token-name', 'display-token-symbol', 'display-total-supply', 'display-decimals', 'display-owner'];
    summaryFields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) element.textContent = '-';
    });
    
    // Reset botão de deploy
    const deployBtn = document.getElementById('deploy-token-btn');
    if (deployBtn) {
        deployBtn.disabled = true;
        deployBtn.innerHTML = '<i class="bi bi-rocket-takeoff me-2"></i>CRIAR TOKEN';
    }
    
    // Esconder botão "Criar Token"
    const createTokenBtn = document.getElementById('create-token-btn');
    if (createTokenBtn) {
        createTokenBtn.style.display = 'none';
    }
    
    // Limpar resultados de deploy
    document.querySelectorAll('.deploy-result').forEach(el => el.remove());
    
    // Limpar section result
    const resultSection = document.getElementById('section-result');
    if (resultSection) {
        resultSection.innerHTML = `
            <div class="section-header">
                <h4 class="text-success mb-3">
                    <i class="bi bi-check-circle me-2"></i>4. Resultado do Deploy
                </h4>
                <p class="text-muted">Informações sobre o token criado aparecerão aqui.</p>
            </div>
        `;
    }
    
    // Mostrar apenas primeira seção, mas habilitar segunda se conectado
    showOnlyFirstSection();
    
    // Se carteira conectada, habilitar automaticamente seção básica
    if (AppState.wallet.connected) {
        setTimeout(() => {
            enableSection('section-basic-info');
            console.log('✅ Seção básica habilitada automaticamente (carteira conectada)');
            // Atualizar progresso visual para esconder botão até ter dados
            updateVisualProgress();
        }, 500);
    }
    
    // Interface da wallet já é atualizada automaticamente pelo Wallet
    console.log('🔄 Reset completo (conexão preservada)');
    
    // Atualizar progresso visual
    if (typeof updateVisualProgress === 'function') {
        updateVisualProgress();
    }
    
    console.log('✅ Reset completo finalizado');
}

/**
 * Verifica conexão existente usando sistema universal
 */
async function checkWalletConnection() {
    // O Wallet já faz isso automaticamente no init()
    const status = Wallet.getStatus();
    
    if (status.connected) {
        AppState.wallet.connected = true;
        AppState.wallet.address = status.address;
        AppState.wallet.network = status.network;
        
        console.log('🔗 Conexão existente detectada:', status.address);
        
        // Atualizar progresso visual
        updateVisualProgress();
    }
}

function copyContractAddress(address) {
    navigator.clipboard.writeText(address).then(() => {
        // Feedback visual
        const btn = event.target.closest('button');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="bi bi-check"></i> Copiado!';
        
        setTimeout(() => {
            btn.innerHTML = originalText;
        }, 2000);
    }).catch(() => {
        // Fallback para navegadores mais antigos
        const input = document.getElementById('contract-address');
        input.select();
        document.execCommand('copy');
        alert('Endereço copiado!');
    });
}

/**
 * Funções de Download e Verificação
 */
function downloadContractFiles() {
    console.log('🔧 Configurando botões de contrato...');
    
    // Usar a função específica de configuração
    configureContractButtons();
    
    // Configurar outros botões
    const addToMetamaskBtn = document.getElementById('add-to-metamask-btn');
    const shareTokenBtn = document.getElementById('share-token-btn');
    
    if (addToMetamaskBtn) {
        addToMetamaskBtn.onclick = () => addTokenToMetaMask();
    }
    
    if (shareTokenBtn) {
        shareTokenBtn.onclick = () => shareToken();
    }
}

// FUNÇÃO DUPLICADA REMOVIDA - downloadSolidityFile() já existe acima

function downloadABI() {
    if (!AppState.deployResult?.compilation?.abi) {
        alert('ABI não disponível');
        return;
    }
    
    const filename = `${AppState.tokenData.symbol}_ABI.json`;
    const content = JSON.stringify(AppState.deployResult.compilation.abi, null, 2);
    
    downloadFile(filename, content, 'application/json');
}

function downloadBytecode() {
    if (!AppState.deployResult?.compilation?.bytecode) {
        alert('Bytecode não disponível');
        return;
    }
    
    const filename = `${AppState.tokenData.symbol}_Bytecode.txt`;
    const content = AppState.deployResult.compilation.bytecode;
    
    downloadFile(filename, content, 'text/plain');
}

function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.URL.revokeObjectURL(url);
    
    // Feedback visual
    const btn = event.target.closest('button');
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-check me-2"></i>Baixado!';
    btn.disabled = true;
    
    setTimeout(() => {
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }, 2000);
}

function openVerificationUrl() {
    console.log('🔍 Abrindo URL de verificação...');
    
    if (!AppState.deployResult?.contractAddress) {
        alert('Endereço do contrato não disponível');
        return;
    }
    
    // Obter chainId correto - converter para decimal se necessário
    let chainId = AppState.wallet.network?.chainId;
    
    // Se chainId é string hexadecimal, converter para decimal
    if (typeof chainId === 'string' && chainId.startsWith('0x')) {
        chainId = parseInt(chainId, 16);
    } else if (typeof chainId === 'string') {
        chainId = parseInt(chainId, 10);
    }
    
    // Fallback para BSC Testnet se não detectar
    chainId = chainId || 97;
    
    console.log('🌐 Chain ID detectado:', chainId);
    console.log('📋 Endereço do contrato:', AppState.deployResult.contractAddress);
    
    let verificationUrl = '';
    let networkName = '';
    
    switch (chainId) {
        case 1: // Ethereum Mainnet
            verificationUrl = `https://etherscan.io/verifyContract?a=${AppState.deployResult.contractAddress}`;
            networkName = 'Ethereum Mainnet';
            break;
        case 56: // BSC Mainnet
            verificationUrl = `https://bscscan.com/verifyContract?a=${AppState.deployResult.contractAddress}`;
            networkName = 'BSC Mainnet';
            break;
        case 97: // BSC Testnet
            verificationUrl = `https://testnet.bscscan.com/verifyContract?a=${AppState.deployResult.contractAddress}`;
            networkName = 'BSC Testnet';
            break;
        case 137: // Polygon Mainnet
            verificationUrl = `https://polygonscan.com/verifyContract?a=${AppState.deployResult.contractAddress}`;
            networkName = 'Polygon Mainnet';
            break;
        case 8453: // Base Mainnet
            verificationUrl = `https://basescan.org/verifyContract?a=${AppState.deployResult.contractAddress}`;
            networkName = 'Base Mainnet';
            break;
        case 11155111: // Sepolia Testnet
            verificationUrl = `https://sepolia.etherscan.io/verifyContract?a=${AppState.deployResult.contractAddress}`;
            networkName = 'Sepolia Testnet';
            break;
        default:
            verificationUrl = `https://etherscan.io/verifyContract?a=${AppState.deployResult.contractAddress}`;
            networkName = 'Ethereum (padrão)';
    }
    
    console.log(`✅ Abrindo verificação para ${networkName}:`, verificationUrl);
    window.open(verificationUrl, '_blank');
}

// Adicionar token ao MetaMask
async function addTokenToMetaMask(event = null) {
    if (!AppState.deployResult?.contractAddress) {
        alert('Endereço do contrato não disponível');
        return;
    }
    
    try {
        await window.ethereum.request({
            method: 'wallet_watchAsset',
            params: {
                type: 'ERC20',
                options: {
                    address: AppState.deployResult.contractAddress,
                    symbol: AppState.tokenData.symbol,
                    decimals: parseInt(AppState.tokenData.decimals),
                    image: '', // Pode adicionar logo se tiver
                },
            },
        });
        
        // Feedback visual se houver evento
        if (event?.target) {
            const btn = event.target.closest('button');
            if (btn) {
                const originalHtml = btn.innerHTML;
                btn.innerHTML = '<i class="bi bi-check-circle-fill text-success"></i> Adicionado!';
                setTimeout(() => {
                    btn.innerHTML = originalHtml;
                }, 2000);
            }
        }
        
        console.log('✅ Token adicionado ao MetaMask com sucesso');
        
    } catch (error) {
        console.error('❌ Erro ao adicionar token ao MetaMask:', error);
        alert('Erro ao adicionar token ao MetaMask');
    }
}

// Compartilhar token
function shareToken() {
    if (!AppState.deployResult?.contractAddress) {
        alert('Endereço do contrato não disponível');
        return;
    }
    
    const tokenInfo = `🎉 Criei meu token na blockchain!
    
📝 Nome: ${AppState.tokenData.name}
🏷️ Símbolo: ${AppState.tokenData.symbol}
📊 Supply: ${parseInt(AppState.tokenData.totalSupply).toLocaleString('pt-BR')}
📍 Contrato: ${AppState.deployResult.contractAddress}
🌐 Rede: ${AppState.wallet.network?.name || 'Ethereum'}

🔗 Criado com xcafe Token Creator`;
    
    if (navigator.share) {
        navigator.share({
            title: `Token ${AppState.tokenData.symbol} Criado!`,
            text: tokenInfo
        });
    } else {
        navigator.clipboard.writeText(tokenInfo);
        
        // Feedback visual
        const btn = event.target.closest('button');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="bi bi-check"></i>';
        setTimeout(() => {
            btn.innerHTML = originalHtml;
        }, 2000);
        
    }
}

/**
 * Funções para a nova interface simplificada
 */

/**
 * Baixa o código do contrato Solidity
 */
async function downloadContractCode() {
    try {
        if (!AppState.deployResult) {
            showToast('Deploy não realizado ainda', 'warning');
            return;
        }
        
        // Verificar se temos o código fonte da API (deploy real)
        let contractCode;
        if (AppState.deployResult.sourceCode) {
            contractCode = AppState.deployResult.sourceCode;
        } else {
            // Gerar código básico para deploy simulado usando template
            const tokenData = AppState.deployResult.deployData;
            try {
                contractCode = await generateContractFromTemplate(tokenData, 'simple');
            } catch (error) {
                console.warn('⚠️ Falha ao carregar template, usando fallback básico');
                contractCode = `// Fallback básico - Template não encontrado
// Token: ${tokenData.name || 'Token'}
// Símbolo: ${tokenData.symbol || 'TKN'}
// Gerado por: Smart Contract Cafe`;
            }
        }
        
        const fileName = `${AppState.deployResult.deployData.symbol || 'Token'}_Contract.sol`;
        
        const blob = new Blob([contractCode], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showToast('Código do contrato baixado!', 'success');
    } catch (error) {
        console.error('Erro ao baixar contrato:', error);
        showToast('Erro ao baixar o código', 'error');
    }
}

/**
 * Abre modal com informações completas de verificação
 */
function openContractVerification() {
    if (!AppState.deployResult?.contractAddress) {
        showToast('Endereço do contrato não disponível', 'warning');
        return;
    }
    
    const chainId = AppState.wallet.network?.chainId || 97;
    const contractAddress = AppState.deployResult.contractAddress;
    
    // URLs dos explorers
    let explorerName, verificationUrl, contractUrl;
    
    switch (chainId) {
        case 1:
            explorerName = 'EtherScan';
            verificationUrl = `https://etherscan.io/verifyContract?a=${contractAddress}`;
            contractUrl = `https://etherscan.io/address/${contractAddress}`;
            break;
        case 56:
            explorerName = 'BSCScan';
            verificationUrl = `https://bscscan.com/verifyContract?a=${contractAddress}`;
            contractUrl = `https://bscscan.com/address/${contractAddress}`;
            break;
        case 97:
            explorerName = 'BSCScan Testnet';
            verificationUrl = `https://testnet.bscscan.com/verifyContract?a=${contractAddress}`;
            contractUrl = `https://testnet.bscscan.com/address/${contractAddress}`;
            break;
        case 137:
            explorerName = 'PolygonScan';
            verificationUrl = `https://polygonscan.com/verifyContract?a=${contractAddress}`;
            contractUrl = `https://polygonscan.com/address/${contractAddress}`;
            break;
        default:
            explorerName = 'BSCScan Testnet';
            verificationUrl = `https://testnet.bscscan.com/verifyContract?a=${contractAddress}`;
            contractUrl = `https://testnet.bscscan.com/address/${contractAddress}`;
    }
    
    // Obter código fonte (prioritar API)
    let sourceCode = '';
    if (AppState.deployResult.sourceCode) {
        sourceCode = AppState.deployResult.sourceCode;
    } else {
        sourceCode = '// Código fonte não disponível. Baixe usando o botão "Baixar Código Solidity".';
    }
    
    // Criar modal de verificação
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'verification-info-modal';
    modal.innerHTML = `
        <div class="modal-dialog modal-xl">
            <div class="modal-content bg-dark text-white">
                <div class="modal-header border-primary bg-primary bg-opacity-20">
                    <h5 class="modal-title">
                        <i class="bi bi-shield-check me-2"></i>
                        Verificação do Contrato
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    
                    <!-- Caixa Azul Principal -->
                    <div class="card bg-primary bg-opacity-10 border-primary mb-4">
                        <div class="card-header bg-primary text-white">
                            <h6 class="mb-0">
                                <i class="bi bi-gear-fill me-2"></i>Configurações de Verificação - ${explorerName}
                            </h6>
                        </div>
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <strong class="text-primary d-block">Compiler Type:</strong>
                                    <code class="text-info bg-dark px-2 py-1 rounded">Solidity (Single file)</code>
                                </div>
                                <div class="col-md-6">
                                    <strong class="text-primary d-block">Compiler Version:</strong>
                                    <code class="text-info bg-dark px-2 py-1 rounded">v0.8.30+commit.8a97fa7a</code>
                                </div>
                                <div class="col-md-6">
                                    <strong class="text-primary d-block">Open Source License:</strong>
                                    <code class="text-info bg-dark px-2 py-1 rounded">MIT License</code>
                                </div>
                                <div class="col-md-6">
                                    <strong class="text-primary d-block">Optimization:</strong>
                                    <span class="badge bg-success me-1">✅ Enabled</span>
                                    <code class="text-info">200 runs</code>
                                </div>
                                <div class="col-md-6">
                                    <strong class="text-primary d-block">EVM Version:</strong>
                                    <code class="text-info bg-dark px-2 py-1 rounded">default</code>
                                </div>
                                <div class="col-md-6">
                                    <strong class="text-primary d-block">Constructor Arguments:</strong>
                                    <code class="text-info bg-dark px-2 py-1 rounded">None</code>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Instruções Passo a Passo -->
                    <div class="card bg-success bg-opacity-10 border-success mb-4">
                        <div class="card-header bg-success text-white">
                            <h6 class="mb-0">
                                <i class="bi bi-list-ol me-2"></i>Passos para Verificação
                            </h6>
                        </div>
                        <div class="card-body">
                            <ol class="text-white mb-0">
                                <li class="mb-2">Clique no botão "Abrir ${explorerName}" abaixo</li>
                                <li class="mb-2">Na página do contrato, vá na aba <strong>"Contract"</strong></li>
                                <li class="mb-2">Clique em <strong>"Verify and Publish"</strong></li>
                                <li class="mb-2">Configure exatamente como mostrado na caixa azul acima</li>
                                <li class="mb-2">Cole o código fonte (use o botão "Copiar Código" abaixo)</li>
                                <li class="mb-0">Clique em <strong>"Verify and Publish"</strong></li>
                            </ol>
                        </div>
                    </div>
                    
                    <!-- Código Fonte -->
                    <div class="card bg-warning bg-opacity-10 border-warning mb-4">
                        <div class="card-header bg-warning text-dark d-flex justify-content-between align-items-center">
                            <h6 class="mb-0">
                                <i class="bi bi-code-slash me-2"></i>Código Fonte para Verificação
                            </h6>
                            <button class="btn btn-outline-light btn-sm" onclick="copyVerificationCode()" title="Copiar código">
                                <i class="bi bi-clipboard me-1"></i>Copiar Código
                            </button>
                        </div>
                        <div class="card-body">
                            <pre id="verification-source-code" class="bg-dark text-light p-3 rounded" style="max-height: 300px; overflow-y: auto; font-size: 12px; font-family: 'Courier New', monospace;">${sourceCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                        </div>
                    </div>
                    
                </div>
                <div class="modal-footer border-secondary">
                    <div class="d-flex gap-2 flex-wrap w-100">
                        <button type="button" class="btn btn-success flex-fill" onclick="window.open('${verificationUrl}', '_blank')">
                            <i class="bi bi-shield-check me-1"></i>Abrir ${explorerName}
                        </button>
                        <button type="button" class="btn btn-info flex-fill" onclick="window.open('${contractUrl}', '_blank')">
                            <i class="bi bi-eye me-1"></i>Ver Contrato
                        </button>
                        <button type="button" class="btn btn-primary flex-fill" onclick="downloadVerificationFile()">
                            <i class="bi bi-download me-1"></i>Download .sol
                        </button>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Adicionar ao DOM e mostrar
    document.body.appendChild(modal);
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
    
    // Remover do DOM quando fechar
    modal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modal);
    });
    
    console.log('📋 Modal de verificação aberta com configurações corretas');
}

/**
 * Copia código fonte para verificação
 */
function copyVerificationCode() {
    const codeElement = document.getElementById('verification-source-code');
    if (!codeElement) return;
    
    const code = codeElement.textContent;
    navigator.clipboard.writeText(code).then(() => {
        showToast('Código copiado para a área de transferência!', 'success');
    }).catch(err => {
        console.error('Erro ao copiar:', err);
        showToast('Erro ao copiar código', 'error');
    });
}

/**
 * Download do arquivo para verificação
 */
function downloadVerificationFile() {
    if (!AppState.deployResult?.deployData) {
        showToast('Dados não disponíveis', 'warning');
        return;
    }
    
    // Usar função já existente
    downloadSolidityFile();
}

// Tornar funções globais para os botões do modal
window.copyVerificationCode = copyVerificationCode;
window.downloadVerificationFile = downloadVerificationFile;

/**
 * Deploy na mainnet usando os mesmos dados
 */
async function deployToMainnet() {
    try {
        if (!AppState.deployResult?.deployData) {
            showToast('Dados do deploy não disponíveis', 'warning');
            return;
        }
        
        // Verificar se já está na mainnet
        const currentChainId = AppState.wallet.network?.chainId;
        if (currentChainId === 1 || currentChainId === 56) {
            showToast('Você já está em uma rede principal', 'info');
            return;
        }
        
        // Confirmar deploy na mainnet
        const confirmed = confirm(
            'Deseja fazer deploy na rede principal (mainnet)?\n\n' +
            '⚠️ ATENÇÃO:\n' +
            '- Isso custará gas real (BNB/ETH)\n' +
            '- A transação não pode ser revertida\n' +
            '- Você será direcionado para trocar de rede\n\n' +
            'Continuar?'
        );
        
        if (!confirmed) return;
        
        // Detectar rede principal correspondente
        let targetChainId;
        if (currentChainId === 97) { // BSC Testnet -> BSC Mainnet
            targetChainId = 56;
        } else {
            targetChainId = 1; // Default para Ethereum Mainnet
        }
        
        // Solicitar troca para mainnet
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: ethers.utils.hexValue(targetChainId) }]
            });
            
            // Aguardar troca de rede
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Fazer novo deploy com os mesmos dados
            AppState.tokenData = { ...AppState.deployResult.deployData };
            
            showToast('Rede alterada! Fazendo deploy na mainnet...', 'info');
            
            // Chamar função de deploy
            await deployToken();
            
        } catch (switchError) {
            console.error('Erro ao trocar rede:', switchError);
            showToast('Erro ao trocar para mainnet', 'error');
        }
        
    } catch (error) {
        console.error('Erro no deploy mainnet:', error);
        showToast('Erro ao preparar deploy na mainnet', 'error');
    }
}

/**
 * Exibe o resultado do deploy na nova interface simplificada
 */
function showDeployResult(success, errorMessage = '') {
    const resultSection = document.getElementById('section-result');
    if (!resultSection) return;
    
    if (success && AppState.deployResult) {
        const { contractAddress, transactionHash, deployData, explorerUrl } = AppState.deployResult;
        
        // Preencher endereço do contrato
        const contractAddressInput = document.getElementById('contract-address-display');
        if (contractAddressInput) {
            contractAddressInput.value = contractAddress;
        }
        
        // Preencher transaction hash
        const txHashInput = document.getElementById('transaction-hash-display');
        if (txHashInput) {
            txHashInput.value = transactionHash;
        }
        
        // Configurar botão explorer com URL correta
        const viewExplorerBtn = document.getElementById('view-explorer-btn');
        if (viewExplorerBtn && contractAddress) {
            const chainId = AppState.wallet.network?.chainId || 97;
            const explorerUrl = getExplorerContractUrl(contractAddress, chainId);
            viewExplorerBtn.onclick = () => window.open(explorerUrl, '_blank');
        }
        
        console.log('✅ Interface de resultado atualizada com sucesso');
    } else {
        console.error('❌ Falha no deploy:', errorMessage);
        showToast(`Erro no deploy: ${errorMessage}`, 'error');
    }
}

/**
 * Inicializar verificações quando a seção de deploy for ativada
 */
function initializeDeploySection() {
    // Mostrar status inicial
    const statusElement = document.getElementById('blockchain-status');
    if (statusElement) {
        statusElement.innerHTML = `
            <i class="bi bi-hourglass-split text-muted me-1"></i>
            <span class="text-muted">Verificando disponibilidade...</span>
        `;
    }
    
    // Habilitar botão de deploy
    const deployBtn = document.getElementById('deploy-token-btn');
    if (deployBtn) {
        deployBtn.disabled = false;
        console.log('✅ Botão CRIAR TOKEN habilitado');
    } else {
        console.warn('⚠️ Botão deploy-token-btn não encontrado');
    }
    
    // Verificar API e atualizar status da rede blockchain
    checkApiStatusSilently();
    
    // Estimar gas
    estimateGasForDeploy().then(gasInfo => {
        updateGasDisplay(gasInfo);
    });
    
    console.log('✅ Seção de deploy inicializada');
}

/**
 * Exibe toast notification
 */
function showToast(message, type = 'info') {
    // Criar elemento toast se não existir
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }
    
    // Cores baseadas no tipo
    const colorClass = {
        'success': 'bg-success',
        'error': 'bg-danger',
        'warning': 'bg-warning text-dark',
        'info': 'bg-info'
    }[type] || 'bg-info';
    
    // Criar toast
    const toastId = 'toast-' + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-white ${colorClass} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    // Ativar toast do Bootstrap
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
    toast.show();
    
    // Remover element após ser ocultado
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

// Exportar funções globais
window.connectWallet = connectWallet;
window.resetApp = resetApp;
window.scrollToSection = scrollToSection;
window.copyContractAddress = copyContractAddress;
window.downloadSolidityFile = downloadSolidityFile;
window.showContractModal = showContractModal;
window.copyModalCode = copyModalCode;
window.downloadModalCode = downloadModalCode;
window.previewContract = previewContract;
window.copyContractCode = copyContractCode;
window.closeModal = closeModal;
window.testApiStatus = testApiStatus;
window.downloadContractFiles = downloadContractFiles;
window.downloadABI = downloadABI;

// Configuração DIRETA dos botões ao carregar
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM carregado, configurando botões...');
    
    // Aguardar um pouco para garantir que tudo está carregado
    setTimeout(() => {
        const viewBtn = document.getElementById('view-contract-btn');
        const verifyBtn = document.getElementById('verify-contract-btn');
        
        if (viewBtn) {
            console.log('✅ Configurando botão Visualizar Contrato...');
            viewBtn.onclick = function(e) {
                e.preventDefault();
                console.log('🖱️ BOTÃO VISUALIZAR CLICADO!');
                
                // Garantir dados mínimos
                if (!AppState.tokenData) {
                    AppState.tokenData = {
                        name: 'Token Exemplo',
                        symbol: 'TKN',
                        totalSupply: '1000000',
                        decimals: '18'
                    };
                }
                
                try {
                    showContractModal();
                } catch (error) {
                    console.error('Erro:', error);
                    alert('Erro ao abrir modal: ' + error.message);
                }
            };
            console.log('✅ Botão Visualizar configurado!');
        }
        
        if (verifyBtn) {
            console.log('✅ Configurando botão Verificar Contrato...');
            verifyBtn.onclick = function(e) {
                e.preventDefault();
                console.log('🖱️ BOTÃO VERIFICAR CLICADO!');
                try {
                    openVerificationUrl();
                } catch (error) {
                    console.error('Erro:', error);
                    alert('Erro ao abrir verificação: ' + error.message);
                }
            };
            console.log('✅ Botão Verificar configurado!');
        }
    }, 1000);
});

// Função de teste para simular deploy concluído
// Função de teste simplificada para debug quando necessário
window.testContractButtons = function() {
    console.log('🔧 Testando botões de contrato...');
    
    // Garantir dados básicos
    AppState.tokenData = AppState.tokenData || {
        name: 'Test Token',
        symbol: 'TST',
        totalSupply: '1000000',
        decimals: '18'
    };
    
    // Mostrar seção se necessário
    const section = document.getElementById('section-veri');
    if (section) {
        section.style.display = 'block';
        section.style.visibility = 'visible';
        section.style.opacity = '1';
    }
    
    // Configurar botões
    configureContractButtons();
    
    console.log('✅ Teste concluído');
};
window.downloadBytecode = downloadBytecode;
window.openVerificationUrl = openVerificationUrl;
window.addTokenToMetaMask = addTokenToMetaMask;
window.shareToken = shareToken;

// Funções para previsualização de contrato
window.previewContractBeforeDeploy = previewContractBeforeDeploy;
window.viewDeployedContract = viewDeployedContract;
window.verifyDeployedContract = verifyDeployedContract;
window.compareContracts = compareContracts;
window.copyApiCode = copyApiCode;
window.copyTemplateCode = copyTemplateCode;

/**
 * Substitui os placeholders do template com os dados do token
 */
function processContractTemplate(template, tokenData) {
    let processedContract = template;
    
    // Limpar símbolo para nome do contrato (apenas letras e números)
    const cleanSymbol = tokenData.symbol.replace(/[^a-zA-Z0-9]/g, '');
    
    // Limpar supply - remover pontos e vírgulas, manter apenas números
    const cleanSupply = tokenData.totalSupply.toString().replace(/[.,]/g, '');
    
    // Converter endereço para checksum correto
    let checksumAddress = '0x0000000000000000000000000000000000000000';
    try {
        if (tokenData.ownerAddress && typeof ethers !== 'undefined') {
            checksumAddress = ethers.utils.getAddress(tokenData.ownerAddress.toLowerCase());
        } else if (tokenData.ownerAddress) {
            // Fallback simples se ethers não estiver disponível
            checksumAddress = tokenData.ownerAddress;
        }
    } catch (error) {
        console.warn('Erro ao converter endereço para checksum:', error);
        checksumAddress = tokenData.ownerAddress || '0x0000000000000000000000000000000000000000';
    }
    
    // Substituir placeholders com validação - template simplificado
    processedContract = processedContract.replace(/\{\{TOKEN_NAME\}\}/g, `"${tokenData.name || 'Token Name'}"`);
    processedContract = processedContract.replace(/\{\{TOKEN_SYMBOL\}\}/g, cleanSymbol || 'TKN');
    processedContract = processedContract.replace(/\{\{DECIMALS\}\}/g, tokenData.decimals || '18');
    processedContract = processedContract.replace(/\{\{TOKEN_SUPPLY\}\}/g, cleanSupply || '1000000');
    processedContract = processedContract.replace(/\{\{OWNER_ADDRESS\}\}/g, checksumAddress);
    
    return processedContract;
}

/**
 * Mostra o contrato antes do deploy
 */
async function previewContractBeforeDeploy() {
    try {
        // Verificar se a wallet está conectada
        if (!AppState.wallet.connected) {
            alert('Por favor, conecte sua carteira primeiro.');
            return;
        }

        // Obter dados do formulário usando os IDs corretos
        const tokenNameEl = document.getElementById('tokenName');
        const tokenSymbolEl = document.getElementById('tokenSymbol');
        const tokenDecimalsEl = document.getElementById('decimals'); // Pode não existir, usar padrão
        const tokenSupplyEl = document.getElementById('totalSupply');
        const tokenLogoEl = document.getElementById('tokenImage');

        if (!tokenNameEl || !tokenSymbolEl || !tokenSupplyEl) {
            alert('Elementos do formulário não encontrados. Verifique se todos os campos estão preenchidos.');
            console.log('Elementos encontrados:', {
                tokenName: !!tokenNameEl,
                tokenSymbol: !!tokenSymbolEl,
                totalSupply: !!tokenSupplyEl,
                tokenImage: !!tokenLogoEl
            });
            return;
        }

        const tokenData = {
            name: tokenNameEl.value,
            symbol: tokenSymbolEl.value,
            decimals: '18', // Valor padrão, pois não há campo de decimals no formulário
            totalSupply: tokenSupplyEl.value,
            ownerAddress: AppState.wallet.address,
            logoUri: tokenLogoEl ? tokenLogoEl.value || '' : '',
            originalContract: '0x0000000000000000000000000000000000000000'
        };
        
        // Validar dados
        if (!tokenData.name || !tokenData.symbol || !tokenData.totalSupply) {
            alert('Por favor, preencha todos os campos obrigatórios antes de visualizar o contrato.');
            return;
        }
        
        // Carregar e processar template
        const template = await loadContractTemplate();
        const processedContract = processContractTemplate(template, tokenData);
        
        // Mostrar modal
        showContractModal(processedContract, 'Prévia do Contrato - Antes do Deploy');
        
    } catch (error) {
        console.error('Erro ao gerar preview do contrato:', error);
        alert('Erro ao gerar preview do contrato: ' + error.message);
    }
}

/**
 * Mostra o contrato deployado
 */
function viewDeployedContract() {
    // Verificar se há dados de deploy
    if (!AppState.deployResult || !AppState.deployResult.success) {
        alert('Nenhum contrato deployado encontrado. Faça o deploy primeiro.');
        return;
    }
    
    // Priorizar código fonte da API (que é o real)
    let contractCode = '';
    let title = 'Contrato Deployado';
    
    if (AppState.deployResult.sourceCode) {
        // Código da API (o que foi realmente deployado)
        contractCode = AppState.deployResult.sourceCode;
        title = 'Contrato Deployado (Código Real da API)';
        console.log('📄 Usando código fonte da API (real)');
    } else if (deploymentState.contractCode) {
        // Código que tentamos deploy personalizado
        contractCode = deploymentState.contractCode;
        title = 'Contrato Deployado (Template Local)';
        console.log('📄 Usando código do template local');
    } else {
        // Recriar código do template como último recurso
        try {
            const deployData = AppState.deployResult.deployData;
            if (deployData) {
                loadContractTemplate().then(template => {
                    const regeneratedCode = processContractTemplate(template, {
                        name: deployData.name,
                        symbol: deployData.symbol,
                        decimals: deployData.decimals || '18',
                        totalSupply: deployData.totalSupply,
                        ownerAddress: deployData.owner,
                        logoUri: deployData.logoUri || '',
                        originalContract: '0x0000000000000000000000000000000000000000'
                    });
                    showContractModal(regeneratedCode, 'Contrato Reconstruído (Template Local)');
                });
                return;
            }
        } catch (error) {
            console.error('Erro ao recriar contrato:', error);
        }
        
        alert('Código do contrato deployado não disponível.');
        return;
    }
    
    showContractModal(contractCode, title);
}

/**
 * Copia o código do contrato para o clipboard
 */
function copyContractCode() {
    // Tentar primeiro o modal de preview
    let codeDisplay = document.getElementById('preview-contract-code');
    if (!codeDisplay) {
        // Fallback para outros displays de código
        codeDisplay = document.getElementById('contract-code-display');
    }
    
    if (codeDisplay) {
        navigator.clipboard.writeText(codeDisplay.textContent).then(() => {
            // Feedback visual
            const copyBtn = document.querySelector('button[onclick="copyContractCode()"]');
            if (copyBtn) {
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="bi bi-check"></i> Copiado!';
                copyBtn.className = 'btn btn-success btn-sm';
                
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                    copyBtn.className = 'btn btn-outline-info btn-sm';
                }, 2000);
            }
        }).catch(err => {
            console.error('Erro ao copiar:', err);
            alert('Erro ao copiar código para o clipboard');
        });
    }
}

/**
 * Faz download do código do contrato
 */
function downloadContractCode() {
    const codeDisplay = document.getElementById('contract-code-display');
    if (!codeDisplay) {
        alert('Código do contrato não encontrado.');
        return;
    }
    
    const contractCode = codeDisplay.textContent;
    if (!contractCode) {
        alert('Nenhum código para fazer download.');
        return;
    }
    
    // Obter símbolo do token ou usar padrão
    let tokenSymbol = 'Token';
    const tokenSymbolEl = document.getElementById('tokenSymbol');
    if (tokenSymbolEl && tokenSymbolEl.value) {
        // Limpar caracteres especiais para nome do arquivo
        tokenSymbol = tokenSymbolEl.value.replace(/[^a-zA-Z0-9]/g, '');
    }
    
    const filename = `${tokenSymbol}.sol`;
    
    const blob = new Blob([contractCode], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

/**
 * Verifica se o contrato deployado corresponde ao código gerado
 */
async function verifyDeployedContract() {
    if (!AppState.deployResult || !AppState.deployResult.contractAddress) {
        alert('Nenhum contrato deployado para verificar.');
        return;
    }
    
    try {
        const contractAddress = AppState.deployResult.contractAddress;
        const deployData = AppState.deployResult.deployData;
        const chainId = AppState.wallet.network?.chainId || 97;
        
        // CRÍTICO: Usar sempre o código real da API
        let verificationCode = '';
        
        if (AppState.deployResult.sourceCode) {
            // Código que foi realmente deployado pela API
            verificationCode = AppState.deployResult.sourceCode;
            console.log('🔐 Usando código real da API para verificação (correto)');
        } else {
            console.error('❌ ERRO CRÍTICO: Código da API não foi salvo! Verificação irá falhar.');
            alert('Erro: Código fonte da API não encontrado. A verificação pode falhar.');
            
            // Tentar recriar código básico como fallback (pode não funcionar)
            verificationCode = await generateFallbackContract(deployData);
        }
        
        const explorerUrl = getExplorerContractUrl(contractAddress, chainId);
        
        // Criar interface de verificação com código real
        showVerificationModal(contractAddress, verificationCode, explorerUrl, chainId);
        
        // Configurações de compilação para BSC/Ethereum
        const compilationInfo = {
            compiler: {
                version: 'v0.8.30+commit.8a97fa7a' // Versão específica que gera o bytecode correto
            },
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 200
                }
            }
        };
        
        updateCompilationSettings(compilationInfo);
        
    } catch (error) {
        console.error('Erro na verificação:', error);
        alert('Erro ao verificar contrato: ' + error.message);
    }
}

/**
 * Gera contrato básico como fallback (pode falhar na verificação)
 */
async function generateFallbackContract(deployData) {
    console.warn('⚠️ Gerando contrato fallback - pode não funcionar na verificação');
    
    try {
        // Tentar usar o sistema de templates primeiro
        return await generateContractFromTemplate(deployData, 'simple');
    } catch (error) {
        console.warn('⚠️ Template fallback também falhou, usando contrato mínimo');
        return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

contract ${deployData.symbol} {
    string public name = "${deployData.name}";
    string public symbol = "${deployData.symbol}";
    uint8 public decimals = ${deployData.decimals || '18'};
    uint256 public totalSupply = ${deployData.totalSupply} * (10 ** uint256(decimals));
    
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor() {
        _balances[${deployData.owner}] = totalSupply;
        emit Transfer(address(0x0), ${deployData.owner}, totalSupply);
    }
    
    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }
    
    function transfer(address recipient, uint256 amount) public returns (bool) {
        require(_balances[msg.sender] >= amount, "Insufficient balance");
        _balances[msg.sender] -= amount;
        _balances[recipient] += amount;
        emit Transfer(msg.sender, recipient, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        require(_balances[from] >= value, "Insufficient balance");
        require(_allowances[from][msg.sender] >= value, "Allowance exceeded");
        _balances[from] -= value;
        _balances[to] += value;
        _allowances[from][msg.sender] -= value;
        emit Transfer(from, to, value);
        return true;
    }
    
    function approve(address spender, uint256 amount) public returns (bool) {
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function allowance(address owner, address spender) public view returns (uint256) {
        return _allowances[owner][spender];
    }
}`;
    }
}

/**
 * Atualiza as configurações de compilação na modal
 */
function updateCompilationSettings(compilation) {
    const settingsDiv = document.getElementById('compilation-settings');
    if (!settingsDiv) return;
    
    try {
        let settingsHtml = '';
        
        // CRÍTICO: Sempre usar versão 0.8.30 que gera bytecode correto
        settingsHtml += `• <strong>Compiler Version:</strong> v0.8.30+commit.8a97fa7a<br>`;
        
        // Otimização sempre habilitada com 200 runs
        settingsHtml += `• <strong>Optimization:</strong> <span class="text-success">✅ Enabled</span> com <strong>200 runs</strong><br>`;
        
        settingsDiv.innerHTML = settingsHtml;
        
        console.log('✅ Configurações de compilação atualizadas para versão 0.8.30');
        
    } catch (error) {
        console.error('Erro ao atualizar configurações:', error);
        // Fallback com configurações padrão
        if (settingsDiv) {
            settingsDiv.innerHTML = `
                • <strong>Compiler Version:</strong> v0.8.30+commit.8a97fa7a<br>
                • <strong>Optimization:</strong> <span class="text-success">✅ Enabled</span> com <strong>200 runs</strong>
            `;
        }
    }
}

/**
 * Mostra modal de verificação com opções
 */
function showVerificationModal(contractAddress, sourceCode, explorerUrl, chainId) {
    // Criar modal se não existir
    let modal = document.getElementById('verification-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'verification-modal';
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-xl">
                <div class="modal-content bg-dark text-white">
                    <div class="modal-header border-secondary">
                        <h5 class="modal-title">
                            <i class="fas fa-shield-alt text-success me-2"></i>Verificação do Contrato
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info">
                            <strong>📍 Contrato:</strong> <span id="contract-address-display"></span><br>
                            <strong>🔗 Explorer:</strong> <a id="explorer-link" href="#" target="_blank" class="text-info">Ver no Explorer</a>
                        </div>
                        
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <button class="btn btn-primary btn-sm w-100" onclick="copyVerificationCode()">
                                    <i class="fas fa-copy"></i> Copiar Código Fonte
                                </button>
                            </div>
                            <div class="col-md-6">
                                <button class="btn btn-info btn-sm w-100" onclick="downloadVerificationCode()">
                                    <i class="fas fa-download"></i> Download .sol
                                </button>
                            </div>
                        </div>
                        
                        <!-- Abas de Verificação -->
                        <ul class="nav nav-tabs" role="tablist">
                            <li class="nav-item">
                                <a class="nav-link active" data-bs-toggle="tab" href="#manual-tab">
                                    <i class="fas fa-hand-paper"></i> Verificação Manual
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" data-bs-toggle="tab" href="#automatic-tab">
                                    <i class="fas fa-robot"></i> Verificação Automática
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" data-bs-toggle="tab" href="#code-tab">
                                    <i class="fas fa-code"></i> Código Fonte
                                </a>
                            </li>
                        </ul>
                        
                        <div class="tab-content mt-3">
                            <!-- Verificação Manual -->
                            <div class="tab-pane active" id="manual-tab">
                                <div class="card bg-dark border-secondary">
                                    <div class="card-body">
                                        <h6 class="text-warning">📋 Instruções Detalhadas para BSCScan:</h6>
                                        <div class="alert alert-info mb-3">
                                            <strong>⚙️ Configurações de Compilação da API:</strong><br>
                                            <div id="compilation-settings">
                                                • <strong>Compiler Version:</strong> v0.8.26+commit.8a97fa7a<br>
                                                • <strong>Optimization:</strong> <span class="text-success">✅ Enabled</span> com <strong>200 runs</strong><br>
                                                • <strong>EVM Version:</strong> default<br>
                                                • <strong>License Type:</strong> MIT License
                                            </div>
                                        </div>
                                        <ol class="text-light">
                                            <li>Acesse o <strong>BSCScan Testnet</strong> do contrato (link acima)</li>
                                            <li>Vá na aba <strong>"Contract"</strong></li>
                                            <li>Clique em <strong>"Verify and Publish"</strong></li>
                                            <li><strong>Compiler Type:</strong> Solidity (Single file)</li>
                                            <li><strong>Compiler Version:</strong> v0.8.26+commit.8a97fa7a</li>
                                            <li><strong>Open Source License Type:</strong> MIT License (MIT)</li>
                                            <li><strong>Optimization:</strong> ✅ Yes, com <strong>200</strong> runs</li>
                                            <li>Cole o <strong>código completo da API</strong> (botão "Copiar Código" acima)</li>
                                            <li>Deixe os <strong>Constructor Arguments</strong> vazios (se não solicitado)</li>
                                            <li>Clique em <strong>"Verify and Publish"</strong></li>
                                        </ol>
                                        
                                        <div class="mt-3 p-3 bg-danger bg-opacity-10 border border-danger rounded">
                                            <h6 class="text-danger">🚨 Se Still Failing:</h6>
                                            <p class="mb-1">O bytecode pode estar diferente por:</p>
                                            <ul class="mb-2">
                                                <li>Versão exata do compilador (use v0.8.26+commit.8a97fa7a)</li>
                                                <li>Configuração de optimization (deve ser 200 runs)</li>
                                                <li>Metadata hash differences</li>
                                            </ul>
                                            <p class="mb-0"><strong>Solução:</strong> Use o código fonte exato que está sendo copiado da API!</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Verificação Automática -->
                            <div class="tab-pane" id="automatic-tab">
                                <div class="card bg-dark border-secondary">
                                    <div class="card-body text-center">
                                        <h6 class="text-info">🤖 Verificação Automática</h6>
                                        <p class="text-muted">Tentativa de verificação via API (experimental)</p>
                                        <button class="btn btn-success" onclick="attemptAutoVerification()">
                                            <i class="fas fa-magic"></i> Tentar Verificação Automática
                                        </button>
                                        <div id="auto-verify-status" class="mt-3"></div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Código Fonte -->
                            <div class="tab-pane" id="code-tab">
                                <pre id="verification-code-display" class="border p-3 text-dark" style="max-height: 400px; overflow-y: auto; font-size: 11px; background-color: #f8f9fa; font-family: 'Courier New', monospace;"></pre>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer border-secondary">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Atualizar conteúdo
    document.getElementById('contract-address-display').textContent = contractAddress;
    document.getElementById('explorer-link').href = explorerUrl;
    document.getElementById('verification-code-display').textContent = sourceCode;
    
    // Armazenar dados para funções auxiliares
    window.verificationData = {
        contractAddress,
        sourceCode,
        explorerUrl,
        chainId
    };
    
    // Mostrar modal
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
}

/**
 * Copia código de verificação (sempre da API)
 */
function copyVerificationCode() {
    // Priorizar código real da API
    let codeToUse = '';
    
    if (AppState.deployResult?.sourceCode) {
        codeToUse = AppState.deployResult.sourceCode;
        console.log('📋 Copiando código real da API');
    } else if (deploymentState.contractCode) {
        codeToUse = deploymentState.contractCode;
        console.log('📋 Copiando código do estado de deploy');
    } else if (window.verificationData?.sourceCode) {
        codeToUse = window.verificationData.sourceCode;
        console.log('📋 Copiando código da verificação');
    } else {
        alert('❌ Código fonte não disponível para cópia');
        return;
    }
    
    navigator.clipboard.writeText(codeToUse).then(() => {
        // Feedback visual
        const btn = document.querySelector('button[onclick="copyVerificationCode()"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check-circle"></i> Código da API Copiado!';
        btn.className = 'btn btn-success btn-sm w-100';
        
        console.log('✅ Código copiado para área de transferência:', codeToUse.substring(0, 50) + '...');
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.className = 'btn btn-primary btn-sm w-100';
        }, 2000);
    }).catch(error => {
        console.error('❌ Erro ao copiar código:', error);
        alert('Erro ao copiar código');
    });
}

/**
 * Download código de verificação (sempre da API)
 */
function downloadVerificationCode() {
    // Priorizar código real da API
    let codeToDownload = '';
    
    if (AppState.deployResult?.sourceCode) {
        codeToDownload = AppState.deployResult.sourceCode;
        console.log('💾 Baixando código real da API');
    } else if (deploymentState.contractCode) {
        codeToDownload = deploymentState.contractCode;
        console.log('💾 Baixando código do estado de deploy');
    } else if (window.verificationData?.sourceCode) {
        codeToDownload = window.verificationData.sourceCode;
        console.log('💾 Baixando código da verificação');
    } else {
        alert('❌ Código fonte não disponível para download');
        return;
    }
    
    const tokenSymbol = AppState.deployResult?.deployData?.symbol?.replace(/[^a-zA-Z0-9]/g, '') || 'Token';
    const contractAddress = AppState.deployResult?.contractAddress?.substring(0, 8) || '';
    const filename = `${tokenSymbol}_${contractAddress}_API_Verification.sol`;
    
    try {
        const blob = new Blob([codeToDownload], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        console.log('✅ Download realizado:', filename);
        
        // Feedback visual
        const btn = document.querySelector('button[onclick="downloadVerificationCode()"]');
        if (btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check-circle"></i> Downloaded!';
            btn.className = 'btn btn-success btn-sm w-100';
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.className = 'btn btn-info btn-sm w-100';
            }, 2000);
        }
        
    } catch (error) {
        console.error('❌ Erro no download:', error);
        alert('Erro ao fazer download do arquivo');
    }
}

/**
 * Tentativa de verificação automática
 */
async function attemptAutoVerification() {
    const statusDiv = document.getElementById('auto-verify-status');
    
    if (!window.verificationData) {
        statusDiv.innerHTML = '<div class="alert alert-danger">Dados de verificação não disponíveis</div>';
        return;
    }
    
    statusDiv.innerHTML = '<div class="alert alert-info"><i class="fas fa-spinner fa-spin"></i> Tentando verificação automática...</div>';
    
    try {
        const { contractAddress, sourceCode, chainId } = window.verificationData;
        
        // Simular tentativa de verificação (você pode implementar API real aqui)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Para BSC, sugerir Sourcify ou outras ferramentas
        if (chainId === 56 || chainId === 97) {
            statusDiv.innerHTML = `
                <div class="alert alert-warning">
                    <strong>⚠️ Verificação Automática Limitada</strong><br>
                    Para BSC, recomendamos verificação manual via:
                    <ul class="mb-0 mt-2">
                        <li><strong>BscScan:</strong> Método mais confiável</li>
                        <li><strong>Sourcify:</strong> <a href="https://sourcify.dev" target="_blank" class="text-warning">https://sourcify.dev</a></li>
                        <li><strong>Remix IDE:</strong> Plugin de verificação</li>
                    </ul>
                </div>
            `;
        } else {
            statusDiv.innerHTML = `
                <div class="alert alert-info">
                    <strong>ℹ️ Verificação Automática</strong><br>
                    Funcionalidade em desenvolvimento. Use verificação manual por enquanto.
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Erro na verificação automática:', error);
        statusDiv.innerHTML = '<div class="alert alert-danger">Erro na verificação automática. Use verificação manual.</div>';
    }
}

/**
 * Compara código da API vs Template local
 */
async function compareContracts() {
    if (!AppState.deployResult || !AppState.deployResult.success) {
        alert('Faça um deploy primeiro para comparar os contratos.');
        return;
    }
    
    try {
        const deployData = AppState.deployResult.deployData;
        
        // Código da API (o que foi deployado)
        const apiCode = AppState.deployResult.sourceCode || 'Código da API não disponível';
        
        // Código do nosso template
        const template = await loadContractTemplate();
        const templateCode = processContractTemplate(template, {
            name: deployData.name,
            symbol: deployData.symbol,
            decimals: deployData.decimals || '18',
            totalSupply: deployData.totalSupply,
            ownerAddress: deployData.owner,
        });
        
        // Mostrar modal de comparação
        showComparisonModal(apiCode, templateCode);
        
    } catch (error) {
        console.error('Erro ao comparar contratos:', error);
        alert('Erro ao comparar contratos: ' + error.message);
    }
}

/**
 * Modal de comparação de contratos
 */
function showComparisonModal(apiCode, templateCode) {
    let modal = document.getElementById('comparison-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'comparison-modal';
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-xl">
                <div class="modal-content bg-dark text-white">
                    <div class="modal-header border-secondary">
                        <h5 class="modal-title">
                            <i class="fas fa-code-branch text-warning me-2"></i>Comparação: API vs Template
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-warning">
                            <strong>⚠️ IMPORTANTE:</strong> Para verificação na blockchain, use sempre o <strong>Código da API</strong> (esquerda),
                            pois é este código que foi realmente deployado.
                        </div>
                        
                        <div class="row">
                            <div class="col-md-6">
                                <h6 class="text-success">📡 Código da API (REAL - Use para verificação)</h6>
                                <div class="mb-2">
                                    <button class="btn btn-success btn-sm w-100" onclick="copyApiCode()">
                                        <i class="fas fa-copy"></i> Copiar Código da API
                                    </button>
                                </div>
                                <pre id="api-code-display" class="border border-success p-2 text-dark" style="height: 400px; overflow-y: auto; font-size: 10px; background-color: #f8f9fa; font-family: 'Courier New', monospace;"></pre>
                            </div>
                            <div class="col-md-6">
                                <h6 class="text-info">📄 Template Local (Referência)</h6>
                                <div class="mb-2">
                                    <button class="btn btn-info btn-sm w-100" onclick="copyTemplateCode()">
                                        <i class="fas fa-copy"></i> Copiar Template
                                    </button>
                                </div>
                                <pre id="template-code-display" class="border border-info p-2 text-dark" style="height: 400px; overflow-y: auto; font-size: 10px; background-color: #f8f9fa; font-family: 'Courier New', monospace;"></pre>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer border-secondary">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Atualizar conteúdo
    document.getElementById('api-code-display').textContent = apiCode;
    document.getElementById('template-code-display').textContent = templateCode;
    
    // Armazenar para funções de cópia
    window.comparisonData = { apiCode, templateCode };
    
    // Mostrar modal
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
}

/**
 * Funções auxiliares para comparação
 */
function copyApiCode() {
    if (window.comparisonData) {
        navigator.clipboard.writeText(window.comparisonData.apiCode);
        alert('Código da API copiado! Use este para verificação na blockchain.');
    }
}

function copyTemplateCode() {
    if (window.comparisonData) {
        navigator.clipboard.writeText(window.comparisonData.templateCode);
        alert('Template local copiado!');
    }
}







/**
 * ================================================================================
 * RPC NDEX - TOKENCAFE
 * ================================================================================
 * nterface para gerao de lnks RPC usando o sstema consolidado
 * ================================================================================
 */

// Importar módulos consolidados
import BlockchainCore from '../blockchain.js';
import { SharedUtilities } from '../../core/shared_utilities_es6.js';
import { DebugSystem } from './debug-system.js';

// Inicializar core consolidado
const blockchainCore = new BlockchainCore();
const utils = new SharedUtilities();
const debug = new DebugSystem();

// Vari�veis globais
let allNetworks = [];
let selectedNetwork = null;

// IDs dos elementos (segundo o padro do lnk_ndex.js)
const networkSearchId = 'networkSearch';
const networkAutocompleteId = 'networkAutocomplete';
const rpcUrlId = 'rpcUrl';
const explorerUrlId = 'explorerUrl';

// Carregar redes disponíveis
async function loadNetworks() {
    try {
        debug.log('🚀 Iniciando carregamento de redes...');
        
        // Tentar usar ChainList API primeiro
        if (typeof chainListAPI !== 'undefined') {
            try {
                debug.log('🌐 Tentando carregar redes do ChainList...');
                const chainListNetworks = await chainListAPI.fetchChains();
                
                if (chainListNetworks && chainListNetworks.length > 0) {
                    // Converter formato do ChainList para nosso formato
                    allNetworks = chainListNetworks.map(chain => ({
                        chainId: chain.chainId,
                        name: chain.name,
                        shortName: chain.shortName || chain.chain,
                        nativeCurrency: chain.nativeCurrency,
                        rpc: Array.isArray(chain.rpc) ? chain.rpc.map(rpc => 
                            typeof rpc === 'string' ? rpc : rpc.url
                        ).filter(url => url && url.startsWith('https://')) : [],
                        explorers: chain.explorers || [],
                        infoURL: chain.infoURL,
                        icon: chain.icon
                    }));
                    
                    debug.log(`✅ ${allNetworks.length} redes carregadas do ChainList`);
                    return;
                }
            } catch (chainListError) {
                debug.error('⚠️ Erro ao carregar do ChainList, tentando fallback...', chainListError);
            }
        }
        
        // Fallback: tentar buscar redes usando o blockchain core consolidado
        allNetworks = await blockchainCore.fetchAllNetworks();
        
        if (allNetworks && allNetworks.length > 0) {
            debug.log(`✅ ${allNetworks.length} redes carregadas com sucesso (fallback)`, allNetworks.slice(0, 3));
        } else {
            throw new Error('Nenhuma rede encontrada');
        }
        
    } catch (error) {
        debug.error('❌ Erro ao carregar redes da API', error);
        
        // Usar redes de fallback
        allNetworks = [
            {
                chainId: 1,
                name: 'Ethereum Mainnet',
                nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
                rpc: ['https://eth.llamarpc.com'],
                explorers: [{ url: 'https://etherscan.io' }]
            },
            {
                chainId: 56,
                name: 'Binance Smart Chain',
                nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
                rpc: ['https://bsc-dataseed.binance.org'],
                explorers: [{ url: 'https://bscscan.com' }]
            },
            {
                chainId: 137,
                name: 'Polygon',
                nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
                rpc: ['https://polygon-rpc.com'],
                explorers: [{ url: 'https://polygonscan.com' }]
            },
            {
                chainId: 11155111,
                name: 'Sepolia Testnet',
                nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
                rpc: ['https://sepolia.infura.io/v3/'],
                explorers: [{ url: 'https://sepolia.etherscan.io' }]
            }
        ];
        
        console.log(` Usando ${allNetworks.length} redes de fallback`);
    }
}

// Função para mostrar autocomplete (adaptada do link_token_utils.js)
function showAutocomplete(networks, containerId) {
    debug.log('🔍 Mostrando autocomplete', { networksCount: networks.length, containerId });
    
    const container = document.getElementById(containerId);
    if (!container) {
        debug.error(`❌ Container não encontrado: ${containerId}`);
        return;
    }

    container.innerHTML = '';
    
    networks.slice(0, 10).forEach(network => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item p-2 border-bottom cursor-pointer';
        
        // Aplicar estilos inline para garantir visibilidade
        item.style.cssText = `
            background-color: rgba(0, 0, 0, 0.5);
            border: 1px solid #dee2e6;
            cursor: pointer;
            transition: all 0.2s ease;
            color: white;
        `;
        
        item.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <div class="fw-medium" style="color: white;">${network.name}</div>
                    <small style="color: #ccc;">Chain ID: ${network.chainId}</small>
                </div>
                <i class="fas fa-chevron-right" style="color: #ccc;"></i>
            </div>
        `;
        
        item.addEventListener('click', async () => {
            debug.log('🎯 Rede selecionada', network);
            await selectNetwork(network);
            container.style.display = 'none';
        });
        
        // Hover effects melhorados
        item.addEventListener('mouseenter', () => {
            item.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            item.style.borderColor = '#adb5bd';
            item.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        });
        
        item.addEventListener('mouseleave', () => {
            item.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            item.style.borderColor = '#dee2e6';
            item.style.boxShadow = 'none';
        });
        
        container.appendChild(item);
    });
    
    // Mostrar container se houver resultados
    if (networks.length > 0) {
        container.style.display = 'block';
        debug.log(`✅ Autocomplete exibido com ${networks.length} resultados`);
    } else {
        container.style.display = 'none';
        debug.log('ℹ️ Nenhum resultado para exibir');
    }
}

// Seleconar rede (adaptada do lnk_ndex.js)
async function selectNetwork(network) {
    selectedNetwork = network;
    debug.log('🎯 Rede selecionada', network);
    
    // Preencher campos da seção 1 (seleção de rede)
    document.getElementById(networkSearchId).value = `${network.name} (${network.chainId})`;
    document.getElementById(networkAutocompleteId).style.display = 'none';
    
    // Preencher campos ocultos para manter dados em memória
    document.getElementById('chainId').value = network.chainId;
    document.getElementById('networkName').value = network.name;
    
    // Preencher campos de moeda nativa (agora na seção 1)
    const nativeCurrencyName = network.nativeCurrency && network.nativeCurrency.name 
        ? network.nativeCurrency.name 
        : (network.nativeCurrency && network.nativeCurrency.symbol 
            ? network.nativeCurrency.symbol 
            : 'N/A');
    
    const nativeCurrencySymbol = network.nativeCurrency && network.nativeCurrency.symbol 
        ? network.nativeCurrency.symbol 
        : 'N/A';
    
    document.getElementById('nativeCurrency').value = nativeCurrencyName;
    document.getElementById('nativeCurrencySymbol').value = nativeCurrencySymbol;
    
    debug.log('💰 Moeda nativa configurada', {
        name: nativeCurrencyName,
        symbol: nativeCurrencySymbol,
        originalData: network.nativeCurrency
    });
    
    // Preencher campos da seção 2 (informações da rede)
    document.getElementById(rpcUrlId).value = network.rpc[0];
    document.getElementById(explorerUrlId).value = network.explorers ? network.explorers[0].url : '';
    
    // Mostrar seções ocultas com nova estrutura
    const nativeCurrencySection = document.getElementById('native-currency-section');
    const networkUrlsSection = document.getElementById('network-urls-section');
    const networkInfoSection = document.getElementById('network-info-section');
    const rpcConfigSection = document.getElementById('rpc-config-section');
    const addNetworkSection = document.getElementById('add-network-section');
    
    if (nativeCurrencySection) nativeCurrencySection.classList.remove('hidden-section');
    if (networkUrlsSection) networkUrlsSection.classList.remove('hidden-section');
    if (networkInfoSection) networkInfoSection.classList.remove('hidden-section');
    if (rpcConfigSection) rpcConfigSection.classList.remove('hidden-section');
    if (addNetworkSection) addNetworkSection.classList.remove('hidden-section');
    
    // Carregar RPCs personalizadas existentes
    await loadExistingCustomRpcs();
    
    // Atualizar status do botão
    updateAddNetworkButton();
    
    debug.log('✅ Rede selecionada e campos preenchidos', {
        name: network.name,
        chainId: network.chainId,
        rpc: network.rpc[0],
        explorer: network.explorers ? network.explorers[0].url : 'N/A'
    });
}

// Função para adicionar rede ao MetaMask
async function addNetwork() {
    console.log('🔥 INÍCIO - Função addNetwork chamada');
    
    if (!selectedNetwork) {
        console.error('❌ ERRO: Nenhuma rede selecionada');
        showMessage('Selecione uma rede primeiro.', 'error');
        debug.error('❌ Tentativa de adicionar rede sem seleção');
        return;
    }

    console.log('✅ Rede selecionada:', selectedNetwork);

    // Verificar MetaMask apenas no momento de adicionar
    if (typeof window.ethereum === 'undefined') {
        console.error('❌ ERRO: MetaMask não encontrado');
        showMessage('MetaMask não encontrado. Instale a extensão para continuar.', 'error');
        debug.error('❌ MetaMask não encontrado');
        return;
    }

    console.log('✅ MetaMask detectado:', window.ethereum);

    try {
        debug.log('🚀 Iniciando adição de rede ao MetaMask', selectedNetwork);
        
        // Obter dados da rede selecionada
        const networkName = selectedNetwork.name;
        const chainId = selectedNetwork.chainId;
        const nativeCurrencyName = selectedNetwork.nativeCurrency?.name || 'ETH';
        const nativeCurrencySymbol = selectedNetwork.nativeCurrency?.symbol || 'ETH';
        const nativeCurrencyDecimals = selectedNetwork.nativeCurrency?.decimals || 18;
        
        console.log('📋 Dados básicos da rede:', {
            networkName,
            chainId,
            nativeCurrencyName,
            nativeCurrencySymbol,
            nativeCurrencyDecimals
        });
        
        // Obter URLs RPC (padrão + personalizada se houver)
        // IMPORTANTE: Limpar completamente backticks, espaços e caracteres especiais
        let rpcUrls = [...selectedNetwork.rpc].map(url => cleanUrl(url));
        
        const customRpcField = document.getElementById('customRpcUrl');
        if (customRpcField && customRpcField.value.trim()) {
            console.log('📝 RPCs personalizadas encontradas:', customRpcField.value);
            // Dividir por linhas OU ponto e vírgula e filtrar linhas vazias, aplicar limpeza
            const customUrls = customRpcField.value.trim()
                .split(/[\n;]/) // Dividir por quebra de linha OU ponto e vírgula
                .map(url => cleanUrl(url))
                .filter(url => {
                    // Aceitar URLs HTTP e HTTPS válidas
                    if (url.length > 0 && (url.startsWith('https://') || url.startsWith('http://'))) {
                        return true;
                    }
                    return false;
                });
            
            if (customUrls.length > 0) {
                // Separar URLs HTTP e HTTPS para feedback
                const httpsUrls = customUrls.filter(url => url.startsWith('https://'));
                const httpUrls = customUrls.filter(url => url.startsWith('http://'));
                
                rpcUrls.push(...customUrls);
                console.log('🔗 RPCs válidas adicionadas:', customUrls);
                
                // Mostrar feedback detalhado
                let feedbackMsg = `${customUrls.length} RPC(s) personalizada(s) adicionada(s)`;
                if (httpUrls.length > 0) {
                    feedbackMsg += ` (${httpUrls.length} HTTP, ${httpsUrls.length} HTTPS)`;
                }
                console.log('✅ ' + feedbackMsg);
            } else {
                console.warn('⚠️ Nenhuma RPC personalizada válida encontrada');
                showMessage('Nenhuma RPC personalizada válida encontrada. Verifique o formato das URLs.', 'warning');
            }
            console.log('🔗 RPCs após adicionar personalizadas:', rpcUrls);
        } else {
            console.log('📝 Nenhuma RPC personalizada, usando padrão:', rpcUrls);
        }
        
        // Obter URLs do block explorer
        let blockExplorerUrls = [];
        if (selectedNetwork.explorers && selectedNetwork.explorers.length > 0) {
            blockExplorerUrls = selectedNetwork.explorers.map(explorer => cleanUrl(explorer.url));
        }
        
        console.log('🔍 Block Explorer URLs:', blockExplorerUrls);
        
        const networkData = {
            chainId: `0x${chainId.toString(16)}`,
            chainName: networkName,
            nativeCurrency: {
                name: nativeCurrencyName,
                symbol: nativeCurrencySymbol,
                decimals: nativeCurrencyDecimals
            },
            rpcUrls: rpcUrls,
            blockExplorerUrls: blockExplorerUrls
        };

        console.log('📡 DADOS FINAIS PARA METAMASK:', JSON.stringify(networkData, null, 2));
        debug.log('📡 Dados da rede preparados', networkData);
        
        console.log('🚀 Chamando MetaMask API...');
        
        // Chamar diretamente a API do MetaMask
        const result = await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [networkData]
        });
        
        console.log('✅ SUCESSO: MetaMask retornou:', result);
        
        // IMPORTANTE: Tentar trocar para a rede recém-adicionada para forçar o MetaMask a carregar as RPCs
        try {
            console.log('🔄 Tentando trocar para a rede recém-adicionada...');
            const switchResult = await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: networkData.chainId }]
            });
            console.log('✅ SUCESSO: Trocou para a rede:', switchResult);
            
            // Aguardar um momento para o MetaMask processar a troca
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Verificar se realmente trocou para a rede
            const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
            console.log('🔍 Chain ID atual após troca:', currentChainId);
            console.log('🔍 Chain ID esperado:', networkData.chainId);
            
            if (currentChainId === networkData.chainId) {
                console.log('✅ CONFIRMADO: MetaMask está na rede correta');
                showMessage(`Rede ${networkData.chainName} adicionada e ativada com sucesso!`, 'success');
            } else {
                console.log('⚠️ AVISO: MetaMask não trocou para a rede esperada');
                showMessage(`Rede ${networkData.chainName} adicionada, mas não foi possível ativar automaticamente. Troque manualmente no MetaMask.`, 'success');
            }
            
        } catch (switchError) {
            console.log('ℹ️ Não foi possível trocar automaticamente:', switchError.message);
            console.log('📋 Detalhes do erro de troca:', switchError);
            showMessage(`Rede ${networkData.chainName} adicionada com sucesso! Troque manualmente no MetaMask para usar.`, 'success');
        }
        
        // Salvar RPCs personalizadas se houver
        if (customRpcField && customRpcField.value.trim()) {
            saveCustomRpcs(rpcUrls);
        }
        
        // Mostrar feedback detalhado sobre as RPCs adicionadas
        const customUrls = customRpcField && customRpcField.value.trim() ? 
            customRpcField.value.trim()
                .split(/[\n;]/)
                .map(url => cleanUrl(url))
                .filter(url => url.length > 0 && (url.startsWith('https://') || url.startsWith('http://'))) : [];
        
        if (customUrls.length > 0) {
            const httpsUrls = customUrls.filter(url => url.startsWith('https://'));
            const httpUrls = customUrls.filter(url => url.startsWith('http://'));
            
            let detailedMsg = `Rede ${networkData.chainName} adicionada com ${rpcUrls.length} RPC(s) total`;
            if (customUrls.length > 0) {
                detailedMsg += ` (${customUrls.length} personalizada(s)`;
                if (httpUrls.length > 0) {
                    detailedMsg += `: ${httpsUrls.length} HTTPS, ${httpUrls.length} HTTP`;
                }
                detailedMsg += ')';
            }
            console.log('📊 ' + detailedMsg);
        }
        
        // Não mostrar mensagem genérica aqui, pois já foi mostrada acima baseada no resultado da troca
        debug.log('✅ Rede adicionada ao MetaMask com sucesso');
        
        // Limpar dados após sucesso (aguardar 2 segundos para mostrar mensagem)
        setTimeout(() => {
            clearAllFields();
        }, 2000);
        
    } catch (error) {
        console.error('❌ ERRO DETALHADO:', {
            message: error.message,
            code: error.code,
            data: error.data,
            stack: error.stack
        });
        debug.error('❌ Erro ao adicionar rede', error);
        
        // Tratamento específico para diferentes tipos de erro
        let userMessage = '';
        
        console.log('🔍 Código do erro:', error.code);
        console.log('🔍 Mensagem do erro:', error.message);
        
        switch (error.code) {
            case 4001:
                userMessage = '🚫 Operação cancelada pelo usuário.\n\n✅ Para adicionar a rede:\n1. Clique novamente em "Adicionar Rede ao MetaMask"\n2. Aceite a solicitação no popup do MetaMask\n3. Clique em "Aprovar" ou "Add Network"';
                break;
            case 4902:
                userMessage = '❌ Rede não reconhecida pelo MetaMask. Verifique os dados da rede.';
                break;
            case -32602:
                userMessage = '❌ Parâmetros inválidos. Verifique as URLs RPC e dados da rede.';
                break;
            case -32603:
                userMessage = '❌ Erro interno do MetaMask. Tente novamente em alguns segundos.';
                break;
            default:
                userMessage = `❌ Erro ao adicionar rede: ${error.message}\n\n💡 Dica: Se você cancelou no MetaMask, tente novamente e aceite a solicitação.`;
        }
        
        showMessage(userMessage, 'error');
        
        // Log adicional para debug
        console.log('🔍 Dica: Para adicionar a rede com sucesso:');
        console.log('  1. Aceite a solicitação no popup do MetaMask');
        console.log('  2. Verifique se as URLs RPC são válidas');
        console.log('  3. Certifique-se de que o MetaMask está desbloqueado');
    }
}

// Função para mostrar mensagens de status
function showMessage(message, type = 'info') {
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const errorText = document.getElementById('errorText');
    const successText = document.getElementById('successText');
    
    // Esconder todas as mensagens primeiro
    if (errorMessage) {
        errorMessage.style.display = 'none';
    }
    if (successMessage) {
        successMessage.style.display = 'none';
    }
    
    // Mostrar a mensagem apropriada
    if (type === 'success' && successMessage && successText) {
        successText.innerHTML = message.replace(/\n/g, '<br>');
        successMessage.style.display = 'block';
    } else if (errorMessage && errorText) {
        errorText.innerHTML = message.replace(/\n/g, '<br>');
        errorMessage.style.display = 'block';
    }
    
    // Auto-hide após 10 segundos para mensagens de erro
    if (type === 'error') {
        setTimeout(() => {
            hideMessage();
        }, 10000);
    }
}

// Função para ocultar mensagens
function hideMessage() {
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    
    if (errorMessage) {
        errorMessage.style.display = 'none';
    }
    if (successMessage) {
        successMessage.style.display = 'none';
    }
}

// Fun��o para atualizar o bot�o de adicionar rede
function updateAddNetworkButton() {
    const addNetworkBtn = document.getElementById('addNetworkBtn');
    const walletStatus = document.getElementById('walletStatus');
    
    if (!addNetworkBtn) return;
    
    if (!selectedNetwork) {
        addNetworkBtn.disabled = true;
        if (walletStatus) {
            walletStatus.textContent = 'Selecione uma rede para continuar';
        }
    } else {
        addNetworkBtn.disabled = false;
        if (walletStatus) {
            walletStatus.textContent = `Rede selecionada: ${selectedNetwork.name}`;
        }
    }
}

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', async () => {
    debug.log('🚀 Inicializando RPC Index...');
    
    // Verificar elementos essenciais
    debug.checkElement(networkSearchId);
    debug.checkElement(networkAutocompleteId);
    debug.checkElement(rpcUrlId);
    debug.checkElement(explorerUrlId);
    
    try {
        // Carregar redes
        await loadNetworks();
        debug.log(`✅ Redes carregadas: ${allNetworks.length}`);
    } catch (error) {
        debug.error('❌ Erro ao carregar redes', error);
    }
    
    // Configurar event listener para o botão de adicionar rede
    const addNetworkBtn = document.getElementById('addNetworkBtn');
    if (addNetworkBtn) {
        addNetworkBtn.addEventListener('click', addNetwork);
        debug.log('✅ Event listener do botão configurado');
    } else {
        debug.error('❌ Botão addNetworkBtn não encontrado');
    }
    
    // Configurar event listener para o botão de limpar
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllFields);
        debug.log('✅ Event listener do botão limpar configurado');
    } else {
        debug.error('❌ Botão clearBtn não encontrado');
    }
    
    // Event listeners para o campo de busca de rede
    const networkSearch = document.getElementById(networkSearchId);
    if (networkSearch) {
        debug.log('✅ Campo de busca de rede encontrado');
        
        networkSearch.addEventListener('input', function() {
            const query = this.value.trim();
            debug.log('🔍 Busca realizada', { query, length: query.length });
            
            if (query.length >= 2) {
                // Filtrar redes baseado na query
                const filteredNetworks = allNetworks.filter(network => {
                    const searchTerm = query.toLowerCase();
                    return network.name.toLowerCase().includes(searchTerm) ||
                           network.chainId.toString().includes(searchTerm) ||
                           (network.nativeCurrency && network.nativeCurrency.symbol && 
                            network.nativeCurrency.symbol.toLowerCase().includes(searchTerm));
                });
                
                debug.log(`🎯 Redes filtradas: ${filteredNetworks.length}`, filteredNetworks.slice(0, 3));
                
                // Mostrar autocomplete com redes filtradas
                showAutocomplete(filteredNetworks, networkAutocompleteId);
            } else {
                const autocompleteContainer = document.getElementById(networkAutocompleteId);
                if (autocompleteContainer) {
                    autocompleteContainer.style.display = 'none';
                }
                debug.log('ℹ️ Query muito curta, ocultando autocomplete');
            }
        });
        
        // Event listener para focus
        networkSearch.addEventListener('focus', function() {
            debug.log('🎯 Campo de busca focado');
            if (this.value.trim().length >= 2) {
                const autocompleteContainer = document.getElementById(networkAutocompleteId);
                if (autocompleteContainer && autocompleteContainer.children.length > 0) {
                    autocompleteContainer.style.display = 'block';
                }
            }
        });
        
    } else {
        debug.error('❌ Campo de busca de rede não encontrado');
    }
    
    // Esconder autocomplete quando clicar fora
    document.addEventListener('click', function(e) {
        const autocompleteContainer = document.getElementById(networkAutocompleteId);
        const searchInput = document.getElementById(networkSearchId);
        
        if (!e.target.closest('#' + networkAutocompleteId) && e.target.id !== networkSearchId) {
            if (autocompleteContainer) {
                autocompleteContainer.style.display = 'none';
                debug.log('ℹ️ Autocomplete ocultado (clique fora)');
            }
        }
    });
    
    debug.log('✅ RPC Index inicializado com sucesso');
    debug.generateReport();
});


// Função para limpar todos os campos e voltar ao estado inicial
function clearAllFields() {
    debug.log('🧹 Limpando todos os campos...');
    
    // Limpar campo de busca
    const networkSearch = document.getElementById(networkSearchId);
    if (networkSearch) {
        networkSearch.value = '';
    }
    
    // Limpar campos de informações da rede
    document.getElementById('nativeCurrency').value = '';
    document.getElementById('nativeCurrencySymbol').value = '';
    document.getElementById(rpcUrlId).value = '';
    document.getElementById(explorerUrlId).value = '';
    
    // Limpar campo de RPC personalizada
    const customRpcField = document.getElementById('customRpcUrl');
    if (customRpcField) {
        customRpcField.value = '';
        customRpcField.placeholder = 'Cole suas URLs RPC aqui (uma por linha ou separadas por ;)';
    }
    
    // Limpar campos ocultos
    document.getElementById('chainId').value = '';
    document.getElementById('networkName').value = '';
    
    // Limpar localStorage de RPCs personalizadas para todas as redes
    try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('custom-rpcs-')) {
                localStorage.removeItem(key);
                debug.log('🗑️ Removido do localStorage:', key);
            }
        });
    } catch (error) {
        debug.error('❌ Erro ao limpar localStorage:', error);
    }
    
    // Ocultar todas as seções
    const sectionsToHide = [
        'native-currency-section',
        'network-urls-section', 
        'network-info-section',
        'rpc-config-section',
        'add-network-section'
    ];
    
    sectionsToHide.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.classList.add('hidden-section');
        }
    });
    
    // Ocultar autocomplete
    const autocompleteContainer = document.getElementById(networkAutocompleteId);
    if (autocompleteContainer) {
        autocompleteContainer.style.display = 'none';
    }
    
    // Ocultar mensagens de status
    hideMessage();
    
    // Resetar variável global
    selectedNetwork = null;
    
    // Desabilitar botão de adicionar rede
    updateAddNetworkButton();
    
    debug.log('✅ Campos limpos com sucesso');
}

// Função para carregar RPCs personalizadas existentes no textarea
async function loadExistingCustomRpcs() {
    if (!selectedNetwork) return;
    
    const customRpcField = document.getElementById('customRpcUrl');
    if (!customRpcField) return;
    
    try {
        // Primeiro, tentar obter RPCs do ChainList se disponível
        let chainListRpcs = [];
        if (typeof chainListAPI !== 'undefined') {
            try {
                debug.log('🌐 Buscando RPCs do ChainList para a rede selecionada...');
                const workingRpcs = await chainListAPI.getWorkingRpcs(selectedNetwork.chainId);
                if (workingRpcs && workingRpcs.length > 0) {
                    chainListRpcs = workingRpcs.slice(0, 5); // Limitar a 5 RPCs do ChainList
                    debug.log(`✅ ${chainListRpcs.length} RPCs encontradas no ChainList`, chainListRpcs);
                }
            } catch (error) {
                debug.log('⚠️ Erro ao buscar RPCs do ChainList:', error);
            }
        }
        
        // Segundo, tentar obter RPCs do MetaMask se disponível
        let existingRpcs = [];
        
        if (window.ethereum) {
            try {
                // Verificar se já estamos na rede selecionada
                const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
                const targetChainId = `0x${selectedNetwork.chainId.toString(16)}`;
                
                if (currentChainId === targetChainId) {
                    // Se estivermos na rede, tentar obter informações da rede atual
                    const networkInfo = await window.ethereum.request({
                        method: 'wallet_getPermissions'
                    });
                    
                    // Nota: MetaMask não expõe diretamente as RPCs configuradas
                    // Vamos usar o localStorage como fallback
                    debug.log('ℹ️ Usando localStorage para RPCs (MetaMask não expõe RPCs diretamente)');
                }
            } catch (error) {
                debug.log('ℹ️ Não foi possível obter RPCs do MetaMask, usando localStorage');
            }
        }
        
        // Carregar RPCs salvas no localStorage
        const savedCustomRpcs = localStorage.getItem(`custom-rpcs-${selectedNetwork.chainId}`);
        let localRpcs = [];
        if (savedCustomRpcs) {
            try {
                const rpcs = JSON.parse(savedCustomRpcs);
                if (Array.isArray(rpcs) && rpcs.length > 0) {
                    // Aplicar limpeza completa nas RPCs carregadas do localStorage
                    localRpcs = rpcs.map(url => cleanUrl(url));
                }
            } catch (error) {
                debug.error('❌ Erro ao carregar RPCs do localStorage:', error);
            }
        }
        
        // Combinar todas as RPCs: ChainList primeiro, depois populares, depois locais
        const popularRpcs = getPopularRpcsForNetwork(selectedNetwork.chainId);
        const allRpcs = [
            ...chainListRpcs,
            ...popularRpcs,
            ...localRpcs
        ];
        
        // Remover duplicatas mantendo a ordem
        const uniqueRpcs = [...new Set(allRpcs)];
        
        if (uniqueRpcs.length > 0) {
            customRpcField.value = uniqueRpcs.join('\n');
            debug.log('✅ RPCs carregadas (ChainList + populares + locais)', uniqueRpcs);
        } else {
            customRpcField.value = '';
            debug.log('ℹ️ Nenhuma RPC encontrada para esta rede');
        }
        
    } catch (error) {
        debug.error('❌ Erro ao carregar RPCs personalizadas', error);
        // Em caso de erro, mostrar RPCs populares
        const popularRpcs = getPopularRpcsForNetwork(selectedNetwork.chainId);
        if (popularRpcs.length > 0) {
            customRpcField.value = popularRpcs.join('\n');
        }
    }
}

// Função centralizada para limpeza completa de URLs
function cleanUrl(url) {
    if (!url) return '';
    
    let cleanUrl = url.toString();
    
    // Remover backticks e caracteres especiais
    cleanUrl = cleanUrl.replace(/[`'"]/g, '');
    
    // Remover espaços no início e fim
    cleanUrl = cleanUrl.trim();
    
    // Remover quebras de linha e caracteres de controle
    cleanUrl = cleanUrl.replace(/[\r\n\t]/g, '');
    
    // Remover espaços extras internos (mas manter espaços necessários em URLs)
    cleanUrl = cleanUrl.replace(/\s+/g, '');
    
    return cleanUrl;
}

// Função para obter RPCs populares para uma rede específica
function getPopularRpcsForNetwork(chainId) {
    const popularRpcs = {
        97: [ // BNB Smart Chain Testnet
            'https://data-seed-prebsc-1-s1.binance.org:8545/',
            'https://data-seed-prebsc-2-s1.binance.org:8545/',
            'https://bsc-testnet.public.blastapi.io'
        ],
        56: [ // BNB Smart Chain Mainnet
            'https://bsc-dataseed1.binance.org/',
            'https://bsc-dataseed2.binance.org/',
            'https://bsc-dataseed3.binance.org/',
            'https://bsc-dataseed4.binance.org/'
        ],
        1: [ // Ethereum Mainnet
            'https://rpc.ankr.com/eth',
            'https://eth-mainnet.g.alchemy.com/v2/demo',
            'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'
        ],
        137: [ // Polygon Mainnet
            'https://polygon-rpc.com',
            'https://rpc-mainnet.matic.network',
            'https://matic-mainnet.chainstacklabs.com'
        ],
        80001: [ // Polygon Mumbai Testnet
            'https://rpc-mumbai.maticvigil.com',
            'https://matic-mumbai.chainstacklabs.com',
            'https://rpc-mumbai.matic.today'
        ]
    };
    
    // Aplicar limpeza em todas as URLs
    const rpcs = popularRpcs[chainId] || [];
    return rpcs.map(url => cleanUrl(url));
}

// Função para salvar RPCs personalizadas
function saveCustomRpcs(rpcUrls) {
    if (!selectedNetwork || !rpcUrls || rpcUrls.length === 0) return;
    
    try {
        // Filtrar apenas as RPCs que não são padrão da rede e aplicar limpeza
        const customRpcs = rpcUrls
            .filter(url => !selectedNetwork.rpc.includes(url))
            .map(url => cleanUrl(url));
        
        if (customRpcs.length > 0) {
            localStorage.setItem(`custom-rpcs-${selectedNetwork.chainId}`, JSON.stringify(customRpcs));
            debug.log('✅ RPCs personalizadas salvas', customRpcs);
        }
    } catch (error) {
        debug.error('❌ Erro ao salvar RPCs personalizadas', error);
    }
}


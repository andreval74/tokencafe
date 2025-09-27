// js/link-index.js
// Versão simplificada do gerador de link - apenas link compartilhável
import TokenLinkUtils from './link-token-utils.js';
import LinkCore from './link-core.js';

// Inicializar utilitários
const linkUtils = new TokenLinkUtils();
const linkCore = new LinkCore();

// Inicializar chains
linkUtils.autoUpdateChainsJson();

// Variáveis globais
let allNetworks = [];
let selectedNetwork = null;

// IDs dos elementos
const networkSearchId = 'networkSearch';
const networkAutocompleteId = 'networkAutocomplete';
const rpcUrlId = 'rpcUrl';
const blockExplorerId = 'blockExplorer';
const tokenAddressId = 'tokenAddress';
const tokenNameId = 'tokenName';
const tokenSymbolId = 'tokenSymbol';
const tokenDecimalsId = 'tokenDecimals';
const tokenImageId = 'tokenImage';
const btnTokenSearchId = 'btnTokenSearch';
const btnCopyLinkId = 'btnCopyLink';
const btnShareLinkId = 'btnShareLink';
const generatedLinkId = 'generatedLink';
const tokenLoadingId = 'tokenLoading';
const generatedLinkContainerId = 'generatedLinkContainer';

function selectNetwork(network) {
	selectedNetwork = network;
	document.getElementById(rpcUrlId).value = network.rpc[0];
	document.getElementById(blockExplorerId).value = network.explorers ? network.explorers[0].url : '';
	document.getElementById(networkSearchId).value = `${network.name} (${network.chainId})`;
	document.getElementById(networkAutocompleteId).style.display = 'none';
	
	// Mostrar status da rede selecionada
	const networkStatus = document.getElementById('network-status');
	const selectedNetworkName = document.getElementById('selected-network-name');
	if (networkStatus && selectedNetworkName) {
		selectedNetworkName.textContent = `${network.name} (Chain ID: ${network.chainId})`;
		networkStatus.style.display = 'block';
	}
	
	// Liberar próxima etapa (seção do token)
	linkCore.showNextSection('token-section');
}

async function fetchTokenDataAndFill() {
	const tokenAddress = document.getElementById(tokenAddressId).value.trim();
	const rpcUrl = document.getElementById(rpcUrlId).value.trim();
	
	if (!tokenAddress || !selectedNetwork) {
		linkCore.utils.showToast('Selecione uma rede e insira o endereço do token', 'warning');
		return;
	}
	
	if (!linkCore.validateTokenAddress(tokenAddress)) {
		linkCore.utils.showToast('Endereço de token inválido', 'error');
		return;
	}
	
	const loadingElement = document.getElementById(tokenLoadingId);
	const btnSearch = document.getElementById(btnTokenSearchId);
	
	try {
		// Mostrar loading
		if (loadingElement) loadingElement.style.display = 'block';
		if (btnSearch) btnSearch.disabled = true;
		
		// Buscar dados do token
		const tokenData = await linkCore.fetchTokenData(tokenAddress, selectedNetwork.chainId, rpcUrl);
		
		if (tokenData) {
			// Preencher campos
			document.getElementById(tokenNameId).value = tokenData.name || '';
			document.getElementById(tokenSymbolId).value = tokenData.symbol || '';
			document.getElementById(tokenDecimalsId).value = tokenData.decimals || '18';
			document.getElementById(tokenImageId).value = tokenData.image || '';
			
			linkCore.utils.showToast('Dados do token carregados com sucesso!', 'success');
			
			// Liberar próxima etapa
			linkCore.showNextSection('generate-section');
		}
		
	} catch (error) {
		console.error('❌ Erro ao buscar token:', error);
		linkCore.utils.showToast(`Erro ao buscar token: ${error.message}`, 'error');
	} finally {
		// Ocultar loading
		if (loadingElement) loadingElement.style.display = 'none';
		if (btnSearch) btnSearch.disabled = false;
	}
}

function generateLink() {
	const tokenAddress = document.getElementById(tokenAddressId).value.trim();
	const tokenName = document.getElementById(tokenNameId).value.trim();
	const tokenSymbol = document.getElementById(tokenSymbolId).value.trim();
	const tokenDecimals = document.getElementById(tokenDecimalsId).value.trim();
	const tokenImage = document.getElementById(tokenImageId).value.trim();
	
	if (!tokenAddress || !selectedNetwork) {
		linkCore.utils.showToast('Preencha todos os campos obrigatórios', 'warning');
		return;
	}
	
	try {
		const link = linkCore.generateTokenLink({
			address: tokenAddress,
			name: tokenName,
			symbol: tokenSymbol,
			decimals: tokenDecimals,
			image: tokenImage,
			chainId: selectedNetwork.chainId,
			rpcUrl: document.getElementById(rpcUrlId).value.trim(),
			blockExplorer: document.getElementById(blockExplorerId).value.trim()
		});
		
		// Exibir o link gerado
		const linkOutput = document.getElementById('generated-link');
		if (linkOutput) {
			linkOutput.value = link;
		}
		
		linkCore.utils.showToast('Link gerado com sucesso!', 'success');
		
	} catch (error) {
		console.error('❌ Erro ao gerar link:', error);
		linkCore.utils.showToast(`Erro ao gerar link: ${error.message}`, 'error');
	}
}

function copyLink() {
	const linkField = document.getElementById('generated-link');
	if (linkField && linkField.value) {
		linkCore.copyToClipboard(linkField.value);
	}
}

function shareLink() {
	const linkField = document.getElementById('generated-link');
	if (linkField && linkField.value) {
		linkCore.shareLink(linkField.value);
	}
}

function clearForm() {
	linkCore.clearForm();
	selectedNetwork = null;
	
	// Ocultar seções
	const sections = ['token-section', 'generate-section'];
	sections.forEach(sectionId => {
		const section = document.getElementById(sectionId);
		if (section) section.style.display = 'none';
	});
}

// Funções para controlar etapas progressivas
function showNextSection(sectionId) {
	const section = document.getElementById(sectionId);
	if (section) {
		section.style.display = 'block';
		// Scroll suave para a nova seção
		setTimeout(() => {
			section.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}, 100);
	}
}

function hideAllSectionsAfter(sectionId) {
	const sections = ['token-section', 'generate-section'];
	const currentIndex = sections.indexOf(sectionId);
	
	if (currentIndex !== -1) {
		for (let i = currentIndex + 1; i < sections.length; i++) {
			const section = document.getElementById(sections[i]);
			if (section) {
				section.style.display = 'none';
			}
		}
	}
}

function clearAllSteps() {
	// Limpar formulário completamente
	clearForm();
	
	// Ocultar seções posteriores à primeira
	document.getElementById('token-section').style.display = 'none';
	document.getElementById('generate-section').style.display = 'none';
	
	// Ocultar status
	const networkStatus = document.getElementById('network-status');
	const tokenStatus = document.getElementById('token-status');
	const generatedLinkContainer = document.getElementById(generatedLinkContainerId);
	const tokenLoading = document.getElementById(tokenLoadingId);
	const networkAutocomplete = document.getElementById(networkAutocompleteId);
	
	if (networkStatus) networkStatus.style.display = 'none';
	if (tokenStatus) tokenStatus.style.display = 'none';
	if (generatedLinkContainer) generatedLinkContainer.style.display = 'none';
	if (tokenLoading) tokenLoading.style.display = 'none';
	if (networkAutocomplete) networkAutocomplete.style.display = 'none';
	
	// Resetar completamente as variáveis de estado
	selectedNetwork = null;
	
	// Scroll para o topo
	setTimeout(() => {
		document.getElementById('network-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
	}, 100);
}

// Funções para os novos botões
function previewGeneratedLink() {
	const link = document.getElementById(generatedLinkId).value;
	if (link) {
		// Abrir na mesma aba para preview
		window.open(link, '_self');
	}
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
	allNetworks = await linkUtils.fetchAllNetworks();
	
	// Configurar callback de seleção de rede
	linkUtils.selectNetwork = selectNetwork;
	
	// Event listeners
	const networkSearch = document.getElementById(networkSearchId);
	if (networkSearch) {
		networkSearch.addEventListener('input', async function() {
			const query = this.value.trim();
			if (query.length >= 2) {
				// Filtrar redes baseado na query
				const filteredNetworks = allNetworks.filter(network => {
					const searchTerm = query.toLowerCase();
					return network.name.toLowerCase().includes(searchTerm) ||
						   network.chainId.toString().includes(searchTerm) ||
						   (network.nativeCurrency && network.nativeCurrency.symbol && 
							network.nativeCurrency.symbol.toLowerCase().includes(searchTerm));
				});
				
				// Mostrar autocomplete com redes filtradas
				linkUtils.showAutocomplete(filteredNetworks, networkAutocompleteId);
			} else {
				document.getElementById(networkAutocompleteId).style.display = 'none';
			}
		});
	}
	
	document.addEventListener('click', function(e) {
		if (!e.target.closest('#' + networkAutocompleteId) && e.target.id !== networkSearchId) {
			document.getElementById(networkAutocompleteId).style.display = 'none';
		}
	});
	
	const tokenSearchBtn = document.getElementById(btnTokenSearchId);
	if (tokenSearchBtn) {
		tokenSearchBtn.addEventListener('click', fetchTokenDataAndFill);
	}
	
	// Botões principais
	document.getElementById(btnCopyLinkId)?.addEventListener('click', () => copyToClipboard(generatedLinkId));
	document.getElementById(btnShareLinkId)?.addEventListener('click', () => shareLink(generatedLinkId));
	document.getElementById('btnGenerateId')?.addEventListener('click', generateLink);
	document.getElementById('btnPreviewLink')?.addEventListener('click', previewGeneratedLink);
	document.getElementById('btnClearAll')?.addEventListener('click', clearAllSteps);
});


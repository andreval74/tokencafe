/**
 * ================================================================================
 * LINK INDEX - TOKENCAFE
 * ================================================================================
 * Interface para geracao de links de tokens usando o sistema consolidado
 * ================================================================================
 */

// Importar modulos consolidados
import BlockchainCore from './js/modules/blockchain.js';
import TokenCore from './js/modules/token.js';
import { SharedUtilities } from './js/core/shared_utilities_es6.js';

// Inicializar modulos consolidados
const blockchainCore = new BlockchainCore();
const tokenCore = new TokenCore();
const utils = new SharedUtilities();

// Inicializar chains (usando blockchain core)
blockchainCore.autoUpdateChainsJson();

// Variaveis globais
let allNetworks = [];
let selectedNetwork = null;

// IDs dos elementos
const networkSearchId = 'networkSearch';
const networkAutocompleteId = 'networkAutocomplete';
const rpcUrlId = 'rpcUrl';
const blockExplorerId = 'explorerUrl'; // Corrigido: o ID no HTML e 'explorerUrl', nao 'blockExplorer'
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
	
	// Liberar proxima etapa (secao do token)
	showNextSection('token-section');
}

async function fetchTokenDataAndFill() {
	const tokenAddress = document.getElementById(tokenAddressId).value.trim();
	const rpcUrl = document.getElementById(rpcUrlId).value.trim();
	
	// Validacoes mais especificas com mensagens claras
	if (!selectedNetwork) {
		utils.showToast('Primeiro selecione uma rede blockchain na secao acima', 'warning');
		// Destacar a secao de rede
		const networkSection = document.querySelector('#network-section');
		if (networkSection) {
			networkSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
		return;
	}
	
	if (!tokenAddress) {
		utils.showToast('Insira o endereco do token para buscar', 'warning');
		// Focar no campo de endereco
		document.getElementById(tokenAddressId).focus();
		return;
	}
	
	if (!tokenCore.validateTokenAddress(tokenAddress)) {
		utils.showToast('Endereco de token invalido. Use o formato 0x...', 'error');
		document.getElementById(tokenAddressId).focus();
		return;
	}
	
	const loadingElement = document.getElementById(tokenLoadingId);
	const btnSearch = document.getElementById(btnTokenSearchId);
	
	try {
		// Log para debug
		console.log('Iniciando busca do token:', {
			tokenAddress,
			chainId: selectedNetwork.chainId,
			rpcUrl,
			network: selectedNetwork.name
		});
		
		// Mostrar loading
		if (loadingElement) loadingElement.style.display = 'block';
		if (btnSearch) {
			btnSearch.disabled = true;
			btnSearch.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Buscando...';
		}
		
		// Buscar dados do token usando o token core consolidado
		const tokenData = await tokenCore.fetchTokenData(tokenAddress, selectedNetwork.chainId, rpcUrl);
		
		if (tokenData) {
			// Preencher campos
			document.getElementById(tokenNameId).value = tokenData.name || '';
			document.getElementById(tokenSymbolId).value = tokenData.symbol || '';
			document.getElementById(tokenDecimalsId).value = tokenData.decimals || '18';
			document.getElementById(tokenImageId).value = tokenData.image || '';
			
			utils.showToast('Dados do token carregados com sucesso!', 'success');
			
			// Gerar link automaticamente apos carregar dados
			try {
				const link = await tokenCore.generateTokenLink({
					address: tokenAddress,
					name: tokenData.name || '',
					symbol: tokenData.symbol || '',
					decimals: tokenData.decimals || '18',
					image: tokenData.image || ''
				}, selectedNetwork.chainId); // chainId como segundo parametro
				
				// Exibir o link gerado
				const linkOutput = document.getElementById('generatedLink');
				if (linkOutput) {
					linkOutput.value = link;
				}
				
				// Exibir as secoes de links gerados
				const generateSection = document.getElementById('generate-section');
				const generatedLinkContainer = document.getElementById('generatedLinkContainer');
				
				if (generateSection) {
					generateSection.style.display = 'block';
				}
				
				if (generatedLinkContainer) {
					generatedLinkContainer.style.display = 'block';
				}
				
				utils.showToast('Link gerado automaticamente!', 'success');
			} catch (linkError) {
				console.error('Erro ao gerar link automaticamente:', linkError);
				utils.showToast(`Erro ao gerar link: ${linkError.message}`, 'error');
			}
			
			showNextSection('generate-section');
		} else {
			utils.showToast('Token nao encontrado ou dados indisponiveis', 'error');
		}
		
	} catch (error) {
		console.error('Erro ao buscar dados do token:', error);
		utils.showToast(`Erro ao buscar token: ${error.message}`, 'error');
	} finally {
		// Ocultar loading e restaurar botao
		if (loadingElement) loadingElement.style.display = 'none';
		if (btnSearch) {
			btnSearch.disabled = false;
			btnSearch.innerHTML = '<i class="bi bi-search me-2"></i>Buscar Token';
		}
	}
}

async function generateLink() {
	const tokenAddress = document.getElementById(tokenAddressId).value.trim();
	const tokenName = document.getElementById(tokenNameId).value.trim();
	const tokenSymbol = document.getElementById(tokenSymbolId).value.trim();
	const tokenDecimals = document.getElementById(tokenDecimalsId).value.trim();
	const tokenImage = document.getElementById(tokenImageId).value.trim();
	
	if (!tokenAddress || !selectedNetwork) {
		utils.showToast('Preencha todos os campos obrigatorios', 'warning');
		return;
	}
	
	try {
		const link = await tokenCore.generateTokenLink({
			address: tokenAddress,
			name: tokenName,
			symbol: tokenSymbol,
			decimals: tokenDecimals,
			image: tokenImage
		}, selectedNetwork.chainId); // chainId como segundo parametro
		
		// Exibir o link gerado
		const linkOutput = document.getElementById('generatedLink');
		if (linkOutput) {
			linkOutput.value = link;
		}
		
		// Exibir as secoes de links gerados
		const generateSection = document.getElementById('generate-section');
		const generatedLinkContainer = document.getElementById('generatedLinkContainer');
		
		if (generateSection) {
			generateSection.style.display = 'block';
		}
		
		if (generatedLinkContainer) {
			generatedLinkContainer.style.display = 'block';
		}
		
		utils.showToast('Link gerado com sucesso!', 'success');
		
	} catch (error) {
		console.error('Erro ao gerar link:', error);
		utils.showToast(`Erro ao gerar link: ${error.message}`, 'error');
	}
}

function copyLink() {
	const linkField = document.getElementById('generatedLink');
	if (linkField && linkField.value) {
		navigator.clipboard.writeText(linkField.value).then(() => {
			utils.showToast('Link copiado para a area de transferencia!', 'success');
		}).catch(() => {
			utils.showToast('Erro ao copiar link', 'error');
		});
	}
}

function shareLink() {
	const linkField = document.getElementById('generatedLink');
	if (linkField && linkField.value) {
		if (navigator.share) {
			navigator.share({
				title: 'Token Link - TokenCafe',
				text: 'Confira este token:',
				url: linkField.value
			}).catch(() => {
				utils.showToast('Erro ao compartilhar link', 'error');
			});
		} else {
			// Fallback: copiar para clipboard
			navigator.clipboard.writeText(linkField.value).then(() => {
				utils.showToast('Link copiado (compartilhamento nao suportado)', 'info');
			}).catch(() => {
				utils.showToast('Erro ao copiar link', 'error');
			});
		}
	}
}

function clearForm() {
	// Limpar todos os campos do formulario usando token core
	tokenCore.clearForm();
	selectedNetwork = null;
	
	// Ocultar secoes
	const sections = ['token-section', 'generate-section'];
	sections.forEach(sectionId => {
		const section = document.getElementById(sectionId);
		if (section) section.style.display = 'none';
	});
}

// Funcoes para controlar etapas progressivas
function showNextSection(sectionId) {
	const section = document.getElementById(sectionId);
	if (section) {
		section.style.display = 'block';
		// Scroll suave para a nova secao
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
	// Limpar formulario completamente
	clearForm();
	
	// Ocultar secoes posteriores a primeira
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
	
	// Resetar completamente as variaveis de estado
	selectedNetwork = null;
	
	// Scroll para o topo
	setTimeout(() => {
		document.getElementById('network-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
	}, 100);
}

// Funcoes para os novos botoes
function previewGeneratedLink() {
	const link = document.getElementById(generatedLinkId).value;
	if (link) {
		// Abrir na mesma aba para preview
		window.open(link, '_self');
	}
}

// Funcao para mostrar autocomplete
function showAutocomplete(networks, containerId) {
	const container = document.getElementById(containerId);
	if (!container) return;
	
	container.innerHTML = '';
	
	if (networks.length === 0) {
		container.style.display = 'none';
		return;
	}
	
	networks.slice(0, 10).forEach(network => {
		const item = document.createElement('div');
		item.className = 'autocomplete-item';
		item.innerHTML = `
			<div class="network-info">
				<strong>${network.name}</strong>
				<span class="chain-id">Chain ID: ${network.chainId}</span>
			</div>
		`;
		item.addEventListener('click', () => selectNetwork(network));
		container.appendChild(item);
	});
	
	container.style.display = 'block';
}

// Inicializacao
document.addEventListener('DOMContentLoaded', async () => {
	console.log('Inicializando Link Index...');
	
	try {
		allNetworks = await blockchainCore.fetchAllNetworks();
		console.log('Redes carregadas:', allNetworks.length);
	} catch (error) {
		console.error('Erro ao carregar redes:', error);
		utils.showToast('Erro ao carregar lista de redes', 'error');
	}
	
	// Event listeners
	const networkSearch = document.getElementById(networkSearchId);
	if (networkSearch) {
		console.log('Campo de busca de rede encontrado');
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
				showAutocomplete(filteredNetworks, networkAutocompleteId);
			} else {
				document.getElementById(networkAutocompleteId).style.display = 'none';
			}
		});
	} else {
		console.error('Campo de busca de rede nao encontrado');
	}
	
	document.addEventListener('click', function(e) {
		if (!e.target.closest('#' + networkAutocompleteId) && e.target.id !== networkSearchId) {
			document.getElementById(networkAutocompleteId).style.display = 'none';
		}
	});
	
	const tokenSearchBtn = document.getElementById(btnTokenSearchId);
	if (tokenSearchBtn) {
		console.log('Botao de busca de token encontrado');
		tokenSearchBtn.addEventListener('click', fetchTokenDataAndFill);
	} else {
		console.error('Botao de busca de token nao encontrado! ID:', btnTokenSearchId);
	}
	
	// Botoes principais
	document.getElementById(btnCopyLinkId)?.addEventListener('click', copyLink);
	document.getElementById(btnShareLinkId)?.addEventListener('click', shareLink);
	document.getElementById('btnPreviewLink')?.addEventListener('click', previewGeneratedLink);
	document.getElementById('btnClearAll')?.addEventListener('click', clearAllSteps);
	
	console.log('Link Index inicializado com sucesso');
});


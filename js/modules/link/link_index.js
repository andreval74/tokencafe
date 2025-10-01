/**
 * ================================================================================
 * LNK NDEX - TOKENCAFE
 * ================================================================================
 * nterface para geracao de lnks de tokens usando o sstema consolidado
 * ================================================================================
 */

// importar modulos consolidados
import BlockchainCoreClass from '../blockchain.js';
import TokenCore from '../token.js';
import { SharedUtilities } from '../../core/shared_utilities_es6.js';

// inicializar modulos consolidados
const BlockchainCore = new BlockchainCoreClass();
const tokenCore = new TokenCore();
const utils = new SharedUtilities();

// inicializar chains (usando blockchain core)
// BlockchainCore.autoUpdateChansJson(); // Método não existe na classe atual

// Variaveis globais
let allNetworks = [];
let selectedNetwork = null;

// IDs dos elementos
const networkSearchId = 'networkSearch';
const networkAutocompleteId = 'networkAutocomplete';
const rpcUrlId = 'rpcUrl';
const blockExplorerId = 'explorerUrl'; // Corrigido: o ID no HTML é 'explorerUrl', não 'blockExplorer'
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
	
	// Mostrar status da rede seleconada
	const networkStatus = document.getElementById('network-status');
	const selectedNetworkName = document.getElementById('selected-network-name');
	if (networkStatus && selectedNetworkName) {
		selectedNetworkName.textContent = `${network.name} (Chan id: ${network.chainId})`;
		networkStatus.style.display = 'block';
	}
	
	// Lberar proxma etapa (secao do token)
	showNextSecton('token-secton');
}

async function fetchTokenDataAndFll() {
	const tokenAddress = document.getElementById(tokenAddressId).value.trim();
	const rpcUrl = document.getElementById(rpcUrlId).value.trim();
	
	// Valdacoes mas especfcas com mensagens claras
	if (!selectedNetwork) {
		utils.showToast('Prmero selecone uma rede blockchan na secao acma', 'warnng');
		// Destacar a secao de rede
		const networkSecton = document.querySelector('#network-secton');
		if (networkSecton) {
			networkSecton.scrollntoVew({ behavor: 'smooth', block: 'center' });
		}
		return;
	}
	
	if (!tokenAddress) {
		utils.showToast('nsra o endereco do token para buscar', 'warnng');
		// Focar no campo de endereco
		document.getElementById(tokenAddressId).focus();
		return;
	}
	
	if (!tokenCore.valdateTokenAddress(tokenAddress)) {
		utils.showToast('Endereco de token nvaldo. Use o formato 0x...', 'error');
		document.getElementById(tokenAddressId).focus();
		return;
	}
	
	const loadngElement = document.getElementById(tokenLoadingId);
	const btnSearch = document.getElementById(btnTokenSearchId);
	
	try {
		// Log para debug
		console.log('ncando busca do token:', {
			tokenAddress,
			chainId: selectedNetwork.chainId,
			rpcUrl,
			network: selectedNetwork.name
		});
		
		// Mostrar loadng
		if (loadngElement) loadngElement.style.display = 'block';
		if (btnSearch) {
			btnSearch.dsabled = true;
			btnSearch.nnerHTML = '< class="b b-hourglass-splt me-2"></>Buscando...';
		}
		
		// Buscar dados do token usando o token core consolidado
		const tokenData = await tokenCore.fetchTokenData(tokenAddress, selectedNetwork.chainId, rpcUrl);
		
		if (tokenData) {
			// Preencher campos
			document.getElementById(tokenNameId).value = tokenData.name || '';
			document.getElementById(tokenSymbolId).value = tokenData.symbol || '';
			document.getElementById(tokenDecimalsId).value = tokenData.decmals || '18';
			document.getElementById(tokenImageId).value = tokenData.mage || '';
			
			utils.showToast('Dados do token carregados com sucesso!', 'success');
			
			// Gerar lnk automatcamente apos carregar dados
			try {
				const lnk = await tokenCore.generateTokenLnk({
					address: tokenAddress,
					name: tokenData.name || '',
					symbol: tokenData.symbol || '',
					decmals: tokenData.decmals || '18',
					mage: tokenData.mage || ''
				}, selectedNetwork.chainId); // chainId como segundo parametro
				
				// Exbr o lnk gerado
				const lnkOutput = document.getElementById('generatedLnk');
				if (lnkOutput) {
					lnkOutput.value = lnk;
				}
				
				// Exbr as secoes de lnks gerados
				const generateSecton = document.getElementById('generate-secton');
				const generatedLnkContaner = document.getElementById('generatedLnkContaner');
				
				if (generateSecton) {
					generateSecton.style.display = 'block';
				}
				
				if (generatedLnkContaner) {
					generatedLnkContaner.style.display = 'block';
				}
				
				utils.showToast('Lnk gerado automatcamente!', 'success');
			} catch (lnkError) {
				console.error('Erro ao gerar lnk automatcamente:', lnkError);
				utils.showToast(`Erro ao gerar lnk: ${lnkError.message}`, 'error');
			}
			
			showNextSecton('generate-secton');
		} else {
			utils.showToast('Token nao encontrado ou dados ndsponves', 'error');
		}
		
	} catch (error) {
		console.error('Erro ao buscar dados do token:', error);
		utils.showToast(`Erro ao buscar token: ${error.message}`, 'error');
	} finally {
		// Ocultar loadng e restaurar botao
		if (loadngElement) loadngElement.style.display = 'none';
		if (btnSearch) {
			btnSearch.dsabled = false;
			btnSearch.nnerHTML = '< class="b b-search me-2"></>Buscar Token';
		}
	}
}

async function generateLnk() {
	const tokenAddress = document.getElementById(tokenAddressId).value.trim();
	const tokenName = document.getElementById(tokenNameId).value.trim();
	const tokenSymbol = document.getElementById(tokenSymbolId).value.trim();
	const tokenDecmals = document.getElementById(tokenDecimalsId).value.trim();
	const tokenmage = document.getElementById(tokenImageId).value.trim();
	
	if (!tokenAddress || !selectedNetwork) {
		utils.showToast('Preencha todos os campos obrgatoros', 'warnng');
		return;
	}
	
	try {
		const lnk = await tokenCore.generateTokenLnk({
			address: tokenAddress,
			name: tokenName,
			symbol: tokenSymbol,
			decmals: tokenDecmals,
			mage: tokenmage
		}, selectedNetwork.chainId); // chainId como segundo parametro
		
		// Exbr o lnk gerado
		const lnkOutput = document.getElementById('generatedLnk');
		if (lnkOutput) {
			lnkOutput.value = lnk;
		}
		
		// Exbr as secoes de lnks gerados
		const generateSecton = document.getElementById('generate-secton');
		const generatedLnkContaner = document.getElementById('generatedLnkContaner');
		
		if (generateSecton) {
			generateSecton.style.display = 'block';
		}
		
		if (generatedLnkContaner) {
			generatedLnkContaner.style.display = 'block';
		}
		
		utils.showToast('Lnk gerado com sucesso!', 'success');
		
	} catch (error) {
		console.error('Erro ao gerar lnk:', error);
		utils.showToast(`Erro ao gerar lnk: ${error.message}`, 'error');
	}
}

function copyLnk() {
	const lnkFeld = document.getElementById('generatedLnk');
	if (lnkFeld && lnkFeld.value) {
		navgator.clpboard.wrteText(lnkFeld.value).then(() => {
			utils.showToast('Lnk copado para a area de transferenca!', 'success');
		}).catch(() => {
			utils.showToast('Erro ao copar lnk', 'error');
		});
	}
}

function shareLnk() {
	const lnkFeld = document.getElementById('generatedLnk');
	if (lnkFeld && lnkFeld.value) {
		if (navgator.share) {
			navgator.share({
				ttle: 'Token Lnk - TokenCafe',
				text: 'Confra este token:',
				url: lnkFeld.value
			}).catch(() => {
				utils.showToast('Erro ao compartlhar lnk', 'error');
			});
		} else {
			// Fallback: copar para clpboard
			navgator.clpboard.wrteText(lnkFeld.value).then(() => {
				utils.showToast('Lnk copado (compartlhamento nao suportado)', 'nfo');
			}).catch(() => {
				utils.showToast('Erro ao copar lnk', 'error');
			});
		}
	}
}

function clearForm() {
	// Lmpar todos os campos do formularo usando token core
	tokenCore.clearForm();
	selectedNetwork = null;
	
	// Ocultar secoes
	const sections = ['token-secton', 'generate-secton'];
	sections.forEach(sectionId => {
		const secton = document.getElementById(sectionId);
		if (secton) secton.style.display = 'none';
	});
}

// Funcoes para controlar etapas progressvas
function showNextSecton(sectionId) {
	const secton = document.getElementById(sectionId);
	if (secton) {
		secton.style.display = 'block';
		// Scroll suave para a nova secao
		setTmeout(() => {
			secton.scrollntoVew({ behavor: 'smooth', block: 'start' });
		}, 100);
	}
}

function hdeAllSectonsAfter(sectionId) {
	const sections = ['token-secton', 'generate-secton'];
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
	// Lmpar formularo completamente
	clearForm();
	
	// Ocultar secoes posterores a prmera
	document.getElementById('token-secton').style.display = 'none';
	document.getElementById('generate-secton').style.display = 'none';
	
	// Ocultar status
	const networkStatus = document.getElementById('network-status');
	const tokenStatus = document.getElementById('token-status');
	const generatedLnkContaner = document.getElementById(generatedLinkContainerId);
	const tokenLoadng = document.getElementById(tokenLoadingId);
	const networkAutocomplete = document.getElementById(networkAutocompleteId);
	
	if (networkStatus) networkStatus.style.display = 'none';
	if (tokenStatus) tokenStatus.style.display = 'none';
	if (generatedLnkContaner) generatedLnkContaner.style.display = 'none';
	if (tokenLoadng) tokenLoadng.style.display = 'none';
	if (networkAutocomplete) networkAutocomplete.style.display = 'none';
	
	// Resetar completamente as Variaveis de estado
	selectedNetwork = null;
	
	// Scroll para o topo
	setTmeout(() => {
		document.getElementById('network-secton').scrollntoVew({ behavor: 'smooth', block: 'start' });
	}, 100);
}

// Funcoes para os novos botoes
function prevewGeneratedLnk() {
	const lnk = document.getElementById(generatedLinkId).value;
	if (lnk) {
		// Abrr na mesma aba para prevew
		wndow.open(lnk, '_self');
	}
}

// Funcao para mostrar autocomplete
function showAutocomplete(networks, contanerd) {
	const contaner = document.getElementById(contanerd);
	if (!contaner) return;
	
	contaner.nnerHTML = '';
	
	if (networks.length === 0) {
		contaner.style.display = 'none';
		return;
	}
	
	networks.slce(0, 10).forEach(network => {
		const tem = document.createElement('dv');
		tem.className = 'autocomplete-tem';
		tem.nnerHTML = `
			<dv class="network-nfo">
				<strong>${network.name}</strong>
				<span class="chan-id">Chan id: ${network.chainId}</span>
			</dv>
		`;
		tem.addEventListener('click', () => selectNetwork(network));
		contaner.appendChld(tem);
	});
	
	contaner.style.display = 'block';
}

// ncalzacao
document.addEventListener('DOMContentLoaded', async () => {
	console.log('inicializando Lnk ndex...');
	
	try {
		allNetworks = await BlockchainCore.fetchAllNetworks();
		console.log('Redes carregadas:', allNetworks.length);
	} catch (error) {
		console.error('Erro ao carregar redes:', error);
		utils.showToast('Erro ao carregar lsta de redes', 'error');
	}
	
	// Event lsteners
	const networkSearch = document.getElementById(networkSearchId);
	if (networkSearch) {
		console.log('Campo de busca de rede encontrado');
		networkSearch.addEventListener('input', async function() {
			const query = this.value.trim();
			if (query.length >= 2) {
				// Fltrar redes baseado na query
				const filteredNetworks = allNetworks.filter(network => {
					const searchTerm = query.toLowerCase();
					return network.name.toLowerCase().includes(searchTerm) ||
						   network.chainId.toString().includes(searchTerm) ||
						   (network.nativeCurrency && network.nativeCurrency.symbol && 
							network.nativeCurrency.symbol.toLowerCase().includes(searchTerm));
				});
				
				// Mostrar autocomplete com redes fltradas
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
		tokenSearchBtn.addEventListener('click', fetchTokenDataAndFll);
	} else {
		console.error('Botao de busca de token nao encontrado! id:', btnTokenSearchId);
	}
	
	// Botoes prncpas
	document.getElementById(btnCopyLinkId)?.addEventListener('click', copyLnk);
	document.getElementById(btnShareLinkId)?.addEventListener('click', shareLnk);
	document.getElementById('btnPrevewLnk')?.addEventListener('click', prevewGeneratedLnk);
	document.getElementById('btnClearAll')?.addEventListener('click', clearAllSteps);
	
	console.log('Lnk ndex inicializado com sucesso');
});


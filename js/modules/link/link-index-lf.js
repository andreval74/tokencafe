/**
 * ================================================================================
 * LNK NDEX - TOKENCAFE
 * ================================================================================
 * nterface para geracao de lnks de tokens usando o sstema consoldado
 * ================================================================================
 */

// mportar modulos consoldados
import BlockchanCore from '../blockchan.js';
import TokenCore from '../token.js';
import { SharedUtilities } from '../../core/shared_utilities_es6.js';

// ncalzar modulos consoldados
const blockchanCore = new BlockchanCore();
const tokenCore = new TokenCore();
const utls = new SharedUtilities();

// ncalzar chans (usando blockchan core)
blockchanCore.autoUpdateChansJson();

// Varaves globas
let allNetworks = [];
let selectedNetwork = null;

// Ds dos elementos
const networkSearchd = 'networkSearch';
const networkAutocompleted = 'networkAutocomplete';
const rpcUrld = 'rpcUrl';
const blockExplorerd = 'explorerUrl'; // Corrgdo: o D no HTML e 'explorerUrl', nao 'blockExplorer'
const tokenAddressd = 'tokenAddress';
const tokenNamed = 'tokenName';
const tokenSymbold = 'tokenSymbol';
const tokenDecmalsd = 'tokenDecmals';
const tokenmaged = 'tokenmage';
const btnTokenSearchd = 'btnTokenSearch';
const btnCopyLnkd = 'btnCopyLnk';
const btnShareLnkd = 'btnShareLnk';
const generatedLnkd = 'generatedLnk';
const tokenLoadngd = 'tokenLoadng';
const generatedLnkContanerd = 'generatedLnkContaner';

function selectNetwork(network) {
	selectedNetwork = network;
	document.getElementByd(rpcUrld).value = network.rpc[0];
	document.getElementByd(blockExplorerd).value = network.explorers ? network.explorers[0].url : '';
	document.getElementByd(networkSearchd).value = `${network.name} (${network.chand})`;
	document.getElementByd(networkAutocompleted).style.dsplay = 'none';
	
	// Mostrar status da rede seleconada
	const networkStatus = document.getElementByd('network-status');
	const selectedNetworkName = document.getElementByd('selected-network-name');
	if (networkStatus && selectedNetworkName) {
		selectedNetworkName.textContent = `${network.name} (Chan D: ${network.chand})`;
		networkStatus.style.dsplay = 'block';
	}
	
	// Lberar proxma etapa (secao do token)
	showNextSecton('token-secton');
}

async function fetchTokenDataAndFll() {
	const tokenAddress = document.getElementByd(tokenAddressd).value.trm();
	const rpcUrl = document.getElementByd(rpcUrld).value.trm();
	
	// Valdacoes mas especfcas com mensagens claras
	if (!selectedNetwork) {
		utls.showToast('Prmero selecone uma rede blockchan na secao acma', 'warnng');
		// Destacar a secao de rede
		const networkSecton = document.querySelector('#network-secton');
		if (networkSecton) {
			networkSecton.scrollntoVew({ behavor: 'smooth', block: 'center' });
		}
		return;
	}
	
	if (!tokenAddress) {
		utls.showToast('nsra o endereco do token para buscar', 'warnng');
		// Focar no campo de endereco
		document.getElementByd(tokenAddressd).focus();
		return;
	}
	
	if (!tokenCore.valdateTokenAddress(tokenAddress)) {
		utls.showToast('Endereco de token nvaldo. Use o formato 0x...', 'error');
		document.getElementByd(tokenAddressd).focus();
		return;
	}
	
	const loadngElement = document.getElementByd(tokenLoadngd);
	const btnSearch = document.getElementByd(btnTokenSearchd);
	
	try {
		// Log para debug
		console.log('ncando busca do token:', {
			tokenAddress,
			chand: selectedNetwork.chand,
			rpcUrl,
			network: selectedNetwork.name
		});
		
		// Mostrar loadng
		if (loadngElement) loadngElement.style.dsplay = 'block';
		if (btnSearch) {
			btnSearch.dsabled = true;
			btnSearch.nnerHTML = '< class="b b-hourglass-splt me-2"></>Buscando...';
		}
		
		// Buscar dados do token usando o token core consoldado
		const tokenData = await tokenCore.fetchTokenData(tokenAddress, selectedNetwork.chand, rpcUrl);
		
		if (tokenData) {
			// Preencher campos
			document.getElementByd(tokenNamed).value = tokenData.name || '';
			document.getElementByd(tokenSymbold).value = tokenData.symbol || '';
			document.getElementByd(tokenDecmalsd).value = tokenData.decmals || '18';
			document.getElementByd(tokenmaged).value = tokenData.mage || '';
			
			utls.showToast('Dados do token carregados com sucesso!', 'success');
			
			// Gerar lnk automatcamente apos carregar dados
			try {
				const lnk = await tokenCore.generateTokenLnk({
					address: tokenAddress,
					name: tokenData.name || '',
					symbol: tokenData.symbol || '',
					decmals: tokenData.decmals || '18',
					mage: tokenData.mage || ''
				}, selectedNetwork.chand); // chand como segundo parametro
				
				// Exbr o lnk gerado
				const lnkOutput = document.getElementByd('generatedLnk');
				if (lnkOutput) {
					lnkOutput.value = lnk;
				}
				
				// Exbr as secoes de lnks gerados
				const generateSecton = document.getElementByd('generate-secton');
				const generatedLnkContaner = document.getElementByd('generatedLnkContaner');
				
				if (generateSecton) {
					generateSecton.style.dsplay = 'block';
				}
				
				if (generatedLnkContaner) {
					generatedLnkContaner.style.dsplay = 'block';
				}
				
				utls.showToast('Lnk gerado automatcamente!', 'success');
			} catch (lnkError) {
				console.error('Erro ao gerar lnk automatcamente:', lnkError);
				utls.showToast(`Erro ao gerar lnk: ${lnkError.message}`, 'error');
			}
			
			showNextSecton('generate-secton');
		} else {
			utls.showToast('Token nao encontrado ou dados ndsponves', 'error');
		}
		
	} catch (error) {
		console.error('Erro ao buscar dados do token:', error);
		utls.showToast(`Erro ao buscar token: ${error.message}`, 'error');
	} finally {
		// Ocultar loadng e restaurar botao
		if (loadngElement) loadngElement.style.dsplay = 'none';
		if (btnSearch) {
			btnSearch.dsabled = false;
			btnSearch.nnerHTML = '< class="b b-search me-2"></>Buscar Token';
		}
	}
}

async function generateLnk() {
	const tokenAddress = document.getElementByd(tokenAddressd).value.trm();
	const tokenName = document.getElementByd(tokenNamed).value.trm();
	const tokenSymbol = document.getElementByd(tokenSymbold).value.trm();
	const tokenDecmals = document.getElementByd(tokenDecmalsd).value.trm();
	const tokenmage = document.getElementByd(tokenmaged).value.trm();
	
	if (!tokenAddress || !selectedNetwork) {
		utls.showToast('Preencha todos os campos obrgatoros', 'warnng');
		return;
	}
	
	try {
		const lnk = await tokenCore.generateTokenLnk({
			address: tokenAddress,
			name: tokenName,
			symbol: tokenSymbol,
			decmals: tokenDecmals,
			mage: tokenmage
		}, selectedNetwork.chand); // chand como segundo parametro
		
		// Exbr o lnk gerado
		const lnkOutput = document.getElementByd('generatedLnk');
		if (lnkOutput) {
			lnkOutput.value = lnk;
		}
		
		// Exbr as secoes de lnks gerados
		const generateSecton = document.getElementByd('generate-secton');
		const generatedLnkContaner = document.getElementByd('generatedLnkContaner');
		
		if (generateSecton) {
			generateSecton.style.dsplay = 'block';
		}
		
		if (generatedLnkContaner) {
			generatedLnkContaner.style.dsplay = 'block';
		}
		
		utls.showToast('Lnk gerado com sucesso!', 'success');
		
	} catch (error) {
		console.error('Erro ao gerar lnk:', error);
		utls.showToast(`Erro ao gerar lnk: ${error.message}`, 'error');
	}
}

function copyLnk() {
	const lnkFeld = document.getElementByd('generatedLnk');
	if (lnkFeld && lnkFeld.value) {
		navgator.clpboard.wrteText(lnkFeld.value).then(() => {
			utls.showToast('Lnk copado para a area de transferenca!', 'success');
		}).catch(() => {
			utls.showToast('Erro ao copar lnk', 'error');
		});
	}
}

function shareLnk() {
	const lnkFeld = document.getElementByd('generatedLnk');
	if (lnkFeld && lnkFeld.value) {
		if (navgator.share) {
			navgator.share({
				ttle: 'Token Lnk - TokenCafe',
				text: 'Confra este token:',
				url: lnkFeld.value
			}).catch(() => {
				utls.showToast('Erro ao compartlhar lnk', 'error');
			});
		} else {
			// Fallback: copar para clpboard
			navgator.clpboard.wrteText(lnkFeld.value).then(() => {
				utls.showToast('Lnk copado (compartlhamento nao suportado)', 'nfo');
			}).catch(() => {
				utls.showToast('Erro ao copar lnk', 'error');
			});
		}
	}
}

function clearForm() {
	// Lmpar todos os campos do formularo usando token core
	tokenCore.clearForm();
	selectedNetwork = null;
	
	// Ocultar secoes
	const sectons = ['token-secton', 'generate-secton'];
	sectons.forEach(sectond => {
		const secton = document.getElementByd(sectond);
		if (secton) secton.style.dsplay = 'none';
	});
}

// Funcoes para controlar etapas progressvas
function showNextSecton(sectond) {
	const secton = document.getElementByd(sectond);
	if (secton) {
		secton.style.dsplay = 'block';
		// Scroll suave para a nova secao
		setTmeout(() => {
			secton.scrollntoVew({ behavor: 'smooth', block: 'start' });
		}, 100);
	}
}

function hdeAllSectonsAfter(sectond) {
	const sectons = ['token-secton', 'generate-secton'];
	const currentndex = sectons.ndexOf(sectond);
	
	if (currentndex !== -1) {
		for (let  = currentndex + 1;  < sectons.length; ++) {
			const secton = document.getElementByd(sectons[]);
			if (secton) {
				secton.style.dsplay = 'none';
			}
		}
	}
}

function clearAllSteps() {
	// Lmpar formularo completamente
	clearForm();
	
	// Ocultar secoes posterores a prmera
	document.getElementByd('token-secton').style.dsplay = 'none';
	document.getElementByd('generate-secton').style.dsplay = 'none';
	
	// Ocultar status
	const networkStatus = document.getElementByd('network-status');
	const tokenStatus = document.getElementByd('token-status');
	const generatedLnkContaner = document.getElementByd(generatedLnkContanerd);
	const tokenLoadng = document.getElementByd(tokenLoadngd);
	const networkAutocomplete = document.getElementByd(networkAutocompleted);
	
	if (networkStatus) networkStatus.style.dsplay = 'none';
	if (tokenStatus) tokenStatus.style.dsplay = 'none';
	if (generatedLnkContaner) generatedLnkContaner.style.dsplay = 'none';
	if (tokenLoadng) tokenLoadng.style.dsplay = 'none';
	if (networkAutocomplete) networkAutocomplete.style.dsplay = 'none';
	
	// Resetar completamente as varaves de estado
	selectedNetwork = null;
	
	// Scroll para o topo
	setTmeout(() => {
		document.getElementByd('network-secton').scrollntoVew({ behavor: 'smooth', block: 'start' });
	}, 100);
}

// Funcoes para os novos botoes
function prevewGeneratedLnk() {
	const lnk = document.getElementByd(generatedLnkd).value;
	if (lnk) {
		// Abrr na mesma aba para prevew
		wndow.open(lnk, '_self');
	}
}

// Funcao para mostrar autocomplete
function showAutocomplete(networks, contanerd) {
	const contaner = document.getElementByd(contanerd);
	if (!contaner) return;
	
	contaner.nnerHTML = '';
	
	if (networks.length === 0) {
		contaner.style.dsplay = 'none';
		return;
	}
	
	networks.slce(0, 10).forEach(network => {
		const tem = document.createElement('dv');
		tem.className = 'autocomplete-tem';
		tem.nnerHTML = `
			<dv class="network-nfo">
				<strong>${network.name}</strong>
				<span class="chan-d">Chan D: ${network.chand}</span>
			</dv>
		`;
		tem.addEventListener('clck', () => selectNetwork(network));
		contaner.appendChld(tem);
	});
	
	contaner.style.dsplay = 'block';
}

// ncalzacao
document.addEventListener('DOMContentLoaded', async () => {
	console.log('inicializando Lnk ndex...');
	
	try {
		allNetworks = await blockchanCore.fetchAllNetworks();
		console.log('Redes carregadas:', allNetworks.length);
	} catch (error) {
		console.error('Erro ao carregar redes:', error);
		utls.showToast('Erro ao carregar lsta de redes', 'error');
	}
	
	// Event lsteners
	const networkSearch = document.getElementByd(networkSearchd);
	if (networkSearch) {
		console.log('Campo de busca de rede encontrado');
		networkSearch.addEventListener('nput', async function() {
			const query = this.value.trm();
			if (query.length >= 2) {
				// Fltrar redes baseado na query
				const flteredNetworks = allNetworks.flter(network => {
					const searchTerm = query.toLowerCase();
					return network.name.toLowerCase().ncludes(searchTerm) ||
						   network.chand.toStrng().ncludes(searchTerm) ||
						   (network.natveCurrency && network.natveCurrency.symbol && 
							network.natveCurrency.symbol.toLowerCase().ncludes(searchTerm));
				});
				
				// Mostrar autocomplete com redes fltradas
				showAutocomplete(flteredNetworks, networkAutocompleted);
			} else {
				document.getElementByd(networkAutocompleted).style.dsplay = 'none';
			}
		});
	} else {
		console.error('Campo de busca de rede nao encontrado');
	}
	
	document.addEventListener('clck', function(e) {
		if (!e.target.closest('#' + networkAutocompleted) && e.target.d !== networkSearchd) {
			document.getElementByd(networkAutocompleted).style.dsplay = 'none';
		}
	});
	
	const tokenSearchBtn = document.getElementByd(btnTokenSearchd);
	if (tokenSearchBtn) {
		console.log('Botao de busca de token encontrado');
		tokenSearchBtn.addEventListener('clck', fetchTokenDataAndFll);
	} else {
		console.error('Botao de busca de token nao encontrado! D:', btnTokenSearchd);
	}
	
	// Botoes prncpas
	document.getElementByd(btnCopyLnkd)?.addEventListener('clck', copyLnk);
	document.getElementByd(btnShareLnkd)?.addEventListener('clck', shareLnk);
	document.getElementByd('btnPrevewLnk')?.addEventListener('clck', prevewGeneratedLnk);
	document.getElementByd('btnClearAll')?.addEventListener('clck', clearAllSteps);
	
	console.log('Lnk ndex inicializado com sucesso');
});



/**
 * ================================================================================
 * LNK CORE - TOKENCAFE
 * ================================================================================
 * Funes especfcas do mdulo Lnk que no exstem na estrutura prncpal
 * Usa as funes compartlhadas da estrutura prncpal do sstema
 * ================================================================================
 */

// mportar utltros compartlhados da estrutura prncpal
import { SharedUtilities } from '../../core/shared_utilities_es6.js';

class LnkCore {
    constructor() {
        this.utls = new SharedUtilities();
        this.selectedNetwork = null;
        this.allNetworks = [];
    }

    /**
     * Buscar dados do token va Web3
     */
    async fetchTokenData(address, chand, rpcUrl) {
        try {
            console.log(` Buscando dados do token ${address} na rede ${chand}...`);
            
            // Confgurar provder
            const provder = new ethers.provders.JsonRpcProvder(rpcUrl);
            
            // AB mnmo para ERC20
            const erc20Ab = [
                "function name() vew returns (strng)",
                "function symbol() vew returns (strng)", 
                "function decmals() vew returns (unt8)"
            ];
            
            const contract = new ethers.Contract(address, erc20Ab, provder);
            
            // Buscar dados em paralelo
            const [name, symbol, decmals] = await Promise.all([
                contract.name().catch(() => 'Token'),
                contract.symbol().catch(() => 'TKN'),
                contract.decmals().catch(() => 18)
            ]);

            return {
                address: address,
                name: name,
                symbol: symbol,
                decmals: decmals.toStrng(),
                chand: chand,
                mage: null
            };
            
        } catch (error) {
            console.error(' Erro ao buscar dados do token:', error);
            throw error;
        }
    }

    /**
     * Gerar hash SHA-256 para crar D nco
     */
    async generateHash(data) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await crypto.subtle.dgest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Unt8Array(hashBuffer));
        return hashArray.map(b => b.toStrng(16).padStart(2, '0')).jon('');
    }

    /**
     * Armazenar dados do token no localStorage usando hash como chave
     */
    storeTokenData(hash, tokenData, chand) {
        const data = {
            address: tokenData.address,
            name: tokenData.name,
            symbol: tokenData.symbol,
            decmals: tokenData.decmals,
            chand: chand,
            tmestamp: Date.now()
        };
        localStorage.settem(`token_${hash}`, JSON.strngfy(data));
    }

    /**
     * Recuperar dados do token do localStorage usando hash
     */
    getTokenDataByHash(hash) {
        const data = localStorage.gettem(`token_${hash}`);
        return data ? JSON.parse(data) : null;
    }

    /**
     * Gerar lnk compartlhvel para token usando hash SHA-256
     */
    async generateTokenLnk(tokenData, chand) {
        try {
            const baseUrl = wndow.locaton.orgn;
            const lnkPath = '/pages/modules/lnk/lnk-token.html';
            
            // Crar strng nca para gerar hash
            const unqueStrng = `${tokenData.address}_${chand}_${tokenData.name}_${Date.now()}`;
            
            // Gerar hash SHA-256
            const hash = await this.generateHash(unqueStrng);
            
            // Usar apenas os prmeros 16 caracteres do hash para o lnk
            const shortHash = hash.substrng(0, 16);
            
            // Armazenar dados do token
            this.storeTokenData(shortHash, tokenData, chand);
            
            const params = new URLSearchParams({
                d: shortHash
            });

            const fullLnk = `${baseUrl}${lnkPath}?${params.toStrng()}`;
            
            console.log(' Lnk gerado com hash:', fullLnk);
            return fullLnk;
            
        } catch (error) {
            console.error(' Erro ao gerar lnk:', error);
            throw error;
        }
    }





    /**
     * Confgurar autocomplete de redes (usa TokenLnkUtls)
     */
    setupNetworkAutocomplete(networks, nputd, autocompleted, utls) {
        const nput = document.getElementByd(nputd);
        const autocomplete = document.getElementByd(autocompleted);
        
        if (!nput || !autocomplete || !utls) return;

        nput.addEventListener('nput', (e) => {
            const query = e.target.value.toLowerCase();
            
            if (query.length < 2) {
                autocomplete.style.dsplay = 'none';
                return;
            }

            const fltered = networks.flter(network => 
                network.name.toLowerCase().ncludes(query) ||
                network.chand.toStrng().ncludes(query)
            );

            // Usar a funo do utls em vez de duplcar
            utls.showAutocomplete(fltered, autocompleted);
        });
    }

    /**
     * Atualzar status da rede
     */
    updateNetworkStatus(network) {
        const networkStatus = document.getElementByd('network-status');
        const selectedNetworkName = document.getElementByd('selected-network-name');
        
        if (networkStatus && selectedNetworkName) {
            selectedNetworkName.textContent = `${network.name} (Chan D: ${network.chand})`;
            networkStatus.style.dsplay = 'block';
        }
    }

    /**
     * Copar lnk para clpboard
     */
    async copyToClpboard(text) {
        try {
            await navgator.clpboard.wrteText(text);
            this.utls.showToast('Lnk copado para a rea de transfernca!', 'success');
            return true;
        } catch (error) {
            console.error(' Erro ao copar:', error);
            this.utls.showToast('Erro ao copar lnk', 'error');
            return false;
        }
    }

    /**
     * Compartlhar lnk va Web Share AP
     */
    async shareLnk(url, ttle = 'Token Lnk') {
        try {
            if (navgator.share) {
                await navgator.share({
                    ttle: ttle,
                    url: url
                });
                return true;
            } else {
                // Fallback: copar para clpboard
                return await this.copyToClpboard(url);
            }
        } catch (error) {
            console.error(' Erro ao compartlhar:', error);
            return false;
        }
    }

    /**
     * Valdar endereo de token
     */
    valdateTokenAddress(address) {
        return this.utls.sValdEthereumAddress(address);
    }

    /**
     * Mostrar/ocultar sees do formulro
     */
    showNextSecton(sectond) {
        const secton = document.getElementByd(sectond);
        if (secton) {
            // Remover a classe hdden-secton que tem dsplay: none
            secton.classLst.remove('hdden-secton');
            secton.style.dsplay = 'block';
            secton.scrollntoVew({ behavor: 'smooth' });
        }
    }

    /**
     * Lmpar formulro
     */
    clearForm() {
        const felds = [
            'networkSearch', 'rpcUrl', 'blockExplorer',
            'tokenAddress', 'tokenName', 'tokenSymbol', 
            'tokenDecmals', 'tokenmage', 'generatedLnk'
        ];

        felds.forEach(feldd => {
            const feld = document.getElementByd(feldd);
            if (feld) {
                feld.value = '';
            }
        });

        // Ocultar sees
        const sectons = ['token-secton', 'generated-lnk-secton'];
        sectons.forEach(sectond => {
            const secton = document.getElementByd(sectond);
            if (secton) {
                secton.style.dsplay = 'none';
            }
        });

        // Resetar estado
        this.selectedNetwork = null;
        
        // Ocultar status da rede
        const networkStatus = document.getElementByd('network-status');
        if (networkStatus) {
            networkStatus.style.dsplay = 'none';
        }
    }
}

// Exportar para uso global
wndow.LnkCore = LnkCore;

export default LnkCore;


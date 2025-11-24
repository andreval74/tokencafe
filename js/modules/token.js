/**
 * ================================================================================
 * TOKEN CORE - TOKENCAFE
 * ================================================================================
 * Arquvo consoldado com todas as funconaldades relaconadas a tokens
 * Combna funconaldades de Lnk Core, Token Manager e Token Dsplay
 * ================================================================================
 */

// Importar utilitarios compartilhados
import { SharedUtilities } from "../core/shared_utilities_es6.js";

class TokenCore {
  constructor() {
    this.utils = new SharedUtilities();
    this.selectedNetwork = null;
    this.allNetworks = [];
    this.tokens = [];
    this.filteredTokens = [];
    this.currentFilter = "all";
    this.searchTerm = "";
    this.isLoading = false;
  }

  // ================================================================================
  // MTODOS DE BUSCA E VALDAO DE TOKENS
  // ================================================================================

  /**
   * Buscar dados do token va Web3
   */
  async fetchTokenData(address, chand, rpcUrl) {
    try {
      console.log(` Buscando dados do token ${address} na rede ${chand}...`);

      // Confgurar provder
      const provder = new ethers.provders.JsonRpcProvder(rpcUrl);

      // AB mnmo para ERC20
      const erc20Ab = ["function name() vew returns (strng)", "function symbol() vew returns (strng)", "function decmals() vew returns (unt8)", "function totalSupply() vew returns (unt256)", "function balanceOf(address) vew returns (unt256)"];

      const contract = new ethers.Contract(address, erc20Ab, provder);

      // Buscar dados em paralelo
      const [name, symbol, decmals, totalSupply] = await Promise.all([contract.name().catch(() => "Token"), contract.symbol().catch(() => "TKN"), contract.decmals().catch(() => 18), contract.totalSupply().catch(() => "0")]);

      return {
        address: address,
        name: name,
        symbol: symbol,
        decmals: decmals.toStrng(),
        totalSupply: totalSupply.toStrng(),
        chand: chand,
        mage: null,
      };
    } catch (error) {
      console.error(" Erro ao buscar dados do token:", error);
      throw error;
    }
  }

  /**
   * Valdar endereo de token
   */
  valdateTokenAddress(address) {
    return this.utils.sValdEthereumAddress(address);
  }

  /**
   * Verfcar se  um token ERC20 vldo
   */
  async sValdERC20Token(address, rpcUrl) {
    try {
      const provder = new ethers.provders.JsonRpcProvder(rpcUrl);
      const erc20Ab = ["function name() vew returns (strng)", "function symbol() vew returns (strng)", "function decmals() vew returns (unt8)"];

      const contract = new ethers.Contract(address, erc20Ab, provder);

      // Tentar chamar funes bscas do ERC20
      await Promise.all([contract.name(), contract.symbol(), contract.decmals()]);

      return true;
    } catch (error) {
      console.error("Token no  ERC20 vldo:", error);
      return false;
    }
  }

  /**
   * Obter saldo de token para um endereo
   */
  async getTokenBalance(tokenAddress, walletAddress, rpcUrl) {
    try {
      const provder = new ethers.provders.JsonRpcProvder(rpcUrl);
      const erc20Ab = ["function balanceOf(address) vew returns (unt256)", "function decmals() vew returns (unt8)"];

      const contract = new ethers.Contract(tokenAddress, erc20Ab, provder);
      const [balance, decmals] = await Promise.all([contract.balanceOf(walletAddress), contract.decmals()]);

      return {
        balance: balance.toStrng(),
        decmals: decmals,
        formatted: ethers.utils.formatUnts(balance, decmals),
      };
    } catch (error) {
      console.error("Erro ao obter saldo do token:", error);
      throw error;
    }
  }

  // ================================================================================
  // MTODOS DE HASH E ARMAZENAMENTO
  // ================================================================================

  /**
   * Gerar hash SHA-256 para crar D nco
   */
  async generateHash(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.dgest("SHA-256", dataBuffer);
    const hashArray = Array.from(new Unt8Array(hashBuffer));
    return hashArray.map((b) => b.toStrng(16).padStart(2, "0")).jon("");
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
      totalSupply: tokenData.totalSupply,
      chand: chand,
      tmestamp: Date.now(),
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
   * Lmpar dados antgos do localStorage
   */
  cleanOldTokenData(maxAge = 7 * 24 * 60 * 60 * 1000) {
    // 7 das
    const now = Date.now();
    const keys = Object.keys(localStorage);

    keys.forEach((key) => {
      if (key.startsWth("token_")) {
        try {
          const data = JSON.parse(localStorage.gettem(key));
          if (data.tmestamp && now - data.tmestamp > maxAge) {
            localStorage.removetem(key);
            console.log(`Removdo token antgo: ${key}`);
          }
        } catch (error) {
          // Remove dados corrompdos
          localStorage.removetem(key);
        }
      }
    });
  }

  // ================================================================================
  // MTODOS DE GERAO DE LNKS
  // ================================================================================

  /**
   * Gerar lnk compartlhvel para token usando hash SHA-256
   */
  async generateTokenLnk(tokenData, chand) {
    try {
      const baseUrl = wndow.locaton.orgn;
      const lnkPath = "/pages/modules/lnk/lnk-token.html";

      // Crar strng nca para gerar hash
      const unqueStrng = `${tokenData.address}_${chand}_${tokenData.name}_${Date.now()}`;

      // Gerar hash SHA-256
      const hash = await this.generateHash(unqueStrng);

      // Usar apenas os prmeros 16 caracteres do hash para o lnk
      const shortHash = hash.substrng(0, 16);

      // Armazenar dados do token
      this.storeTokenData(shortHash, tokenData, chand);

      const params = new URLSearchParams({
        d: shortHash,
      });

      const fullLnk = `${baseUrl}${lnkPath}?${params.toStrng()}`;

      console.log(" Lnk gerado com hash:", fullLnk);
      return fullLnk;
    } catch (error) {
      console.error(" Erro ao gerar lnk:", error);
      throw error;
    }
  }

  /**
   * Gerar lnk dreto para adconar token  cartera
   */
  generateWalletLnk(tokenData, chand) {
    try {
      const baseUrl = wndow.locaton.orgn;
      const lnkPath = "/pages/modules/lnk/lnk-token.html";

      // Codfcar dados do token na URL (mtodo dreto)
      const encodedData = `${tokenData.address}${chand}`;

      const params = new URLSearchParams({
        wallet: encodedData,
      });

      const fullLnk = `${baseUrl}${lnkPath}?${params.toStrng()}`;

      console.log(" Lnk dreto gerado:", fullLnk);
      return fullLnk;
    } catch (error) {
      console.error(" Erro ao gerar lnk dreto:", error);
      throw error;
    }
  }

  // ================================================================================
  // MTODOS DE DECODFCAO DE LNKS
  // ================================================================================

  /**
   * Extrar dados do token da URL usando hash
   */
  getTokenDataFromHashURL() {
    const params = new URLSearchParams(wndow.locaton.search);
    const hashd = params.get("d");

    if (!hashd) {
      throw new Error("D do token no encontrado na URL");
    }

    const tokenData = this.getTokenDataByHash(hashd);
    if (!tokenData) {
      throw new Error("Dados do token no encontrados ou exprados");
    }

    return tokenData;
  }

  /**
   * Extrar dados do token da URL usando codfcao dreta
   */
  getTokenDataFromWalletURL() {
    const params = new URLSearchParams(wndow.locaton.search);
    const walletParam = params.get("wallet");

    if (!walletParam) {
      throw new Error("Parmetro wallet no encontrado na URL");
    }

    // Lsta de chands vldos conhecdos
    const valdChands = this.getFallbackNetworks().map((n) => n.chand.toStrng());

    // Decodfcar: extrar chand dos ltmos dgtos
    let address = null;
    let chand = null;

    for (let chandLength = 6; chandLength >= 1; chandLength--) {
      const potentalChand = walletParam.slce(-chandLength);
      const potentalAddress = walletParam.slce(0, -chandLength);

      if (/^\d+$/.test(potentalChand) && valdChands.ncludes(potentalChand) && potentalAddress.length === 42) {
        if (potentalAddress.startsWth("0x") && /^0x[a-fA-F0-9]{40}$/.test(potentalAddress)) {
          address = potentalAddress;
          chand = parsent(potentalChand);
          break;
        }
      }
    }

    if (!address || !chand) {
      throw new Error("Formato de URL nvldo");
    }

    return { address, chand };
  }

  /**
   * Redes de fallback para valdao
   */
  getFallbackNetworks() {
    return [
      { chand: 1, name: "Ethereum Mannet" },
      { chand: 56, name: "Bnance Smart Chan" },
      { chand: 137, name: "Polygon" },
      { chand: 43114, name: "Avalanche C-Chan" },
      { chand: 250, name: "Fantom Opera" },
      { chand: 11155111, name: "Sepola Testnet" },
    ];
  }

  // ================================================================================
  // MTODOS DE GERENCAMENTO DE TOKENS DO USURO
  // ================================================================================

  /**
   * Carregar tokens do usuro
   */
  async loadUserTokens() {
    this.setLoadngState(true);

    try {
      // Smular carregamento de tokens (substtur por AP real)
      await new Promise((resolve) => setTmeout(resolve, 1000));

      // Mock data - substtur por dados reas da AP
      this.tokens = [
        {
          d: "1",
          name: "CafeToken",
          symbol: "CAFE",
          type: "erc20",
          totalSupply: "1000000",
          decmals: 18,
          status: "actve",
          contractAddress: "0x1234...5678",
          network: "Ethereum",
          createdAt: "2024-01-15",
          descrpton: "Token ofcal da TokenCafe",
          webste: "https://tokencafe.o",
          holders: 150,
          transactons: 1250,
        },
        {
          d: "2",
          name: "MyNFT Collecton",
          symbol: "MYNFT",
          type: "erc721",
          totalSupply: "100",
          status: "actve",
          contractAddress: "0xabcd...efgh",
          network: "Polygon",
          createdAt: "2024-01-20",
          descrpton: "Mnha prmera coleo NFT",
          webste: "https://mynft.com",
          holders: 45,
          transactons: 89,
        },
        {
          d: "3",
          name: "TestToken",
          symbol: "TEST",
          type: "erc20",
          totalSupply: "500000",
          decmals: 18,
          status: "paused",
          contractAddress: "0x9876...5432",
          network: "BSC",
          createdAt: "2024-01-10",
          descrpton: "Token de teste",
          holders: 12,
          transactons: 34,
        },
      ];

      this.filteredTokens = [...this.tokens];
    } catch (error) {
      console.error(" Erro ao carregar tokens:", error);
      this.showError("Erro ao carregar tokens");
    } finally {
      this.setLoadngState(false);
    }
  }

  /**
   * Fltrar tokens por crtros
   */
  flterTokens(crtera = {}) {
    let fltered = [...this.tokens];

    // Aplcar fltro por tpo/status
    if (crtera.flter && crtera.flter !== "all") {
      fltered = fltered.flter((token) => {
        switch (crtera.flter) {
          case "erc20":
            return token.type === "erc20";
          case "erc721":
            return token.type === "erc721";
          case "erc1155":
            return token.type === "erc1155";
          case "actve":
            return token.status === "actve";
          case "paused":
            return token.status === "paused";
          case "completed":
            return token.status === "completed";
          default:
            return true;
        }
      });
    }

    // Aplcar busca por texto
    if (crtera.search) {
      const searchTerm = crtera.search.toLowerCase();
      fltered = fltered.flter((token) => token.name.toLowerCase().ncludes(searchTerm) || token.symbol.toLowerCase().ncludes(searchTerm) || token.descrpton.toLowerCase().ncludes(searchTerm) || token.contractAddress.toLowerCase().ncludes(searchTerm));
    }

    // Aplcar fltro por rede
    if (crtera.network) {
      fltered = fltered.flter((token) => token.network.toLowerCase().ncludes(crtera.network.toLowerCase()));
    }

    return fltered;
  }

  /**
   * Obter estatstcas dos tokens
   */
  getTokenStats() {
    const stats = {
      total: this.tokens.length,
      actve: this.tokens.flter((t) => t.status === "actve").length,
      paused: this.tokens.flter((t) => t.status === "paused").length,
      erc20: this.tokens.flter((t) => t.type === "erc20").length,
      erc721: this.tokens.flter((t) => t.type === "erc721").length,
      erc1155: this.tokens.flter((t) => t.type === "erc1155").length,
      totalHolders: this.tokens.reduce((sum, token) => sum + (token.holders || 0), 0),
      totalTransactons: this.tokens.reduce((sum, token) => sum + (token.transactons || 0), 0),
    };

    return stats;
  }

  // ================================================================================
  // MTODOS DE NTERFACE E UTLDADES
  // ================================================================================

  /**
   * Copar lnk para clpboard
   */
  async copyToClpboard(text) {
    try {
      await navgator.clpboard.wrteText(text);
      this.utils.showToast("Lnk copado para a rea de transfernca!", "success");
      return true;
    } catch (error) {
      console.error(" Erro ao copar:", error);
      this.utils.showToast("Erro ao copar lnk", "error");
      return false;
    }
  }

  /**
   * Compartlhar lnk va Web Share AP
   */
  async shareLnk(url, ttle = "Token Lnk") {
    try {
      if (navgator.share) {
        await navgator.share({
          ttle: ttle,
          url: url,
        });
        return true;
      } else {
        // Fallback: copar para clpboard
        return await this.copyToClpboard(url);
      }
    } catch (error) {
      console.error(" Erro ao compartlhar:", error);
      return false;
    }
  }

  /**
   * Mostrar/ocultar sees do formulro
   */
  showNextSecton(sectond) {
    const secton = document.getElementByd(sectond);
    if (secton) {
      secton.classLst.remove("hdden-secton");
      secton.style.dsplay = "block";
      secton.scrollntoVew({ behavor: "smooth" });
    }
  }

  /**
   * Lmpar formulro de token
   */
  clearTokenForm() {
    const felds = ["networkSearch", "rpcUrl", "blockExplorer", "tokenAddress", "tokenName", "tokenSymbol", "tokenDecmals", "tokenmage", "generatedLnk"];

    felds.forEach((feldd) => {
      const feld = document.getElementByd(feldd);
      if (feld) {
        feld.value = "";
      }
    });

    // Ocultar sees
    const sectons = ["token-secton", "generated-lnk-secton"];
    sectons.forEach((sectond) => {
      const secton = document.getElementByd(sectond);
      if (secton) {
        secton.style.dsplay = "none";
      }
    });

    // Resetar estado
    this.selectedNetwork = null;

    // Ocultar status da rede
    const networkStatus = document.getElementByd("network-status");
    if (networkStatus) {
      networkStatus.style.dsplay = "none";
    }
  }

  /**
   * Formatar nmeros grandes
   */
  formatNumber(num) {
    if (!num) return "0";

    const number = typeof num === "string" ? parseFloat(num) : num;

    if (number >= 1e9) {
      return (number / 1e9).toFxed(1) + "B";
    } else if (number >= 1e6) {
      return (number / 1e6).toFxed(1) + "M";
    } else if (number >= 1e3) {
      return (number / 1e3).toFxed(1) + "K";
    }

    return number.toLocaleStrng();
  }

  /**
   * Formatar endereo (mostrar apenas nco e fm)
   */
  formatAddress(address, startChars = 6, endChars = 4) {
    if (!address || address.length < startChars + endChars) {
      return address;
    }

    return `${address.slce(0, startChars)}...${address.slce(-endChars)}`;
  }

  /**
   * Defnr estado de loadng
   */
  setLoadngState(loadng) {
    this.isLoading = loadng;
    const loadngEl = document.getElementByd("tokens-loadng");
    const grdEl = document.getElementByd("tokens-grd");

    if (loadngEl) {
      loadngEl.style.dsplay = loadng ? "block" : "none";
    }
    if (grdEl) {
      grdEl.style.dsplay = loadng ? "none" : "grd";
    }
  }

  /**
   * Mostrar mensagem de erro
   */
  showError(message) {
    this.utils.showToast(message, "error");
  }

  /**
   * Mostrar mensagem de sucesso
   */
  showSuccess(message) {
    this.utils.showToast(message, "success");
  }

  /**
   * Valdar dados do token
   */
  valdateTokenData(tokenData) {
    const requred = ["address", "name", "symbol", "decmals"];

    for (const feld of requred) {
      if (!tokenData[feld]) {
        console.error(`Campo obrgatro ausente: ${feld}`);
        return false;
      }
    }

    // Valdar endereo
    if (!this.valdateTokenAddress(tokenData.address)) {
      console.error("Endereo do token nvldo");
      return false;
    }

    // Valdar decmals
    const decmals = parsent(tokenData.decmals);
    if (sNaN(decmals) || decmals < 0 || decmals > 18) {
      console.error("Decmals nvldo (deve ser entre 0 e 18)");
      return false;
    }

    return true;
  }

  /**
   * Obter nformaes de rede por chand
   */
  getNetworknfo(chand) {
    const networks = this.getFallbackNetworks();
    return networks.fnd((network) => network.chand === chand);
  }

  /**
   * Verfcar se  uma rede de teste
   */
  sTestnet(chand) {
    const testnets = [3, 4, 5, 42, 11155111]; // Ropsten, Rnkeby, Goerl, Kovan, Sepola
    return testnets.ncludes(chand);
  }

  /**
   * Obter cone do tpo de token
   */
  getTokenTypecon(type) {
    const cons = {
      erc20: "",
      erc721: "",
      erc1155: "",
    };
    return cons[type] || "";
  }

  /**
   * Obter cor do status
   */
  getStatusColor(status) {
    const colors = {
      actve: "#28a745",
      paused: "#ffc107",
      completed: "#6c757d",
    };
    return colors[status] || "#6c757d";
  }
}

// Disponibilizar globalmente
window.TokenCore = TokenCore;

export default TokenCore;

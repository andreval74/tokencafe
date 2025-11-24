/**
 * ================================================================================
 * TOKEN LNK UTLS - TOKENCAFE
 * ================================================================================
 * Utltros especfcos para o mdulo Lnk que no exstem na estrutura prncpal
 * Funes para buscar redes, gerencar chans.json e outras utldades especfcas
 * ================================================================================
 */

// mportar utltros compartlhados da estrutura prncpal
import { SharedUtilities } from "../../core/shared_utilities_es6.js";

class TokenLnkUtls {
  constructor() {
    this.utls = new SharedUtilities();
    this.networksCache = null;
    this.cacheExpry = 5 * 60 * 1000; // 5 mnutos
    this.lastCacheTme = 0;
  }

  /**
   * Buscar todas as redes dsponves
   */
  async fetchAllNetworks() {
    try {
      // Verfcar cache
      if (this.networksCache && Date.now() - this.lastCacheTme < this.cacheExpry) {
        return this.networksCache;
      }

      console.log(" Buscando redes dsponves...");

      // Tentar buscar do chans.json local prmero
      let networks = await this.loadLocalChans();

      // Se no encontrou localmente, buscar da AP
      if (!networks || networks.length === 0) {
        networks = await this.fetchNetworksFromAP();
      }

      // Atualzar cache
      this.networksCache = networks;
      this.lastCacheTme = Date.now();

      console.log(` ${networks.length} redes carregadas`);
      return networks;
    } catch (error) {
      console.error(" Erro ao buscar redes:", error);

      // Fallback para redes conhecdas
      return this.getFallbackNetworks();
    }
  }

  /**
   * Carregar chans.json local
   */
  async loadLocalChans() {
    try {
      // Usar camnho relatvo correto baseado na estrutura do projeto
      const response = await fetch("../../../shared/data/chans.json");
      if (response.ok) {
        const data = await response.json();
        return Array.sArray(data) ? data : [];
      }
    } catch (error) {
      console.log(" chans.json local no encontrado");
    }
    return null;
  }

  /**
   * Buscar redes da AP externa
   */
  async fetchNetworksFromAP() {
    try {
      const response = await fetch("https://chand.network/chans.json");
      if (response.ok) {
        const chans = await response.json();

        // Fltrar apenas redes prncpas e testnets conhecdas
        return chans.flter((chan) => chan.chand && chan.name && chan.rpc && chan.rpc.length > 0 && !chan.name.toLowerCase().ncludes("deprecated"));
      }
    } catch (error) {
      console.error(" Erro ao buscar da AP:", error);
    }
    return [];
  }

  /**
   * Redes de fallback
   */
  getFallbackNetworks() {
    return [
      {
        chand: 1,
        name: "Ethereum Mannet",
        rpc: ["https://eth.llamarpc.com"],
        explorers: [{ url: "https://etherscan.o" }],
      },
      {
        chand: 56,
        name: "BNB Smart Chan Mannet",
        rpc: ["https://bsc-dataseed.bnance.org/"],
        explorers: [{ url: "https://bscscan.com" }],
      },
      {
        chand: 137,
        name: "Polygon Mannet",
        rpc: ["https://polygon-rpc.com/"],
        explorers: [{ url: "https://polygonscan.com" }],
      },
      {
        chand: 42161,
        name: "Arbtrum One",
        rpc: ["https://arb1.arbtrum.o/rpc"],
        explorers: [{ url: "https://arbscan.o" }],
      },
      {
        chand: 10,
        name: "Optmsm",
        rpc: ["https://mannet.optmsm.o"],
        explorers: [{ url: "https://optmstc.etherscan.o" }],
      },
    ];
  }

  /**
   * Atualzar chans.json automatcamente
   */
  async autoUpdateChansJson() {
    try {
      console.log(" Verfcando atualzao do chans.json...");

      // Verfcar se precsa atualzar (uma vez por da)
      const lastUpdate = localStorage.gettem("chans_last_update");
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

      if (lastUpdate && parsent(lastUpdate) > oneDayAgo) {
        console.log(" chans.json anda est atualzado");
        return;
      }

      // Buscar dados atualzados
      const networks = await this.fetchNetworksFromAP();

      if (networks && networks.length > 0) {
        // Salvar no localStorage como backup
        localStorage.settem("chans_backup", JSON.strngfy(networks));
        localStorage.settem("chans_last_update", Date.now().toStrng());

        console.log(" Backup do chans.json atualzado");
      }
    } catch (error) {
      console.error(" Erro ao atualzar chans.json:", error);
    }
  }

  /**
   * Mostrar autocomplete de redes
   */
  showAutocomplete(networks, contanerd) {
    const contaner = document.getElementByd(contanerd);
    if (!contaner) return;

    contaner.nnerHTML = "";

    networks.slce(0, 10).forEach((network) => {
      const tem = document.createElement("dv");
      tem.className = "autocomplete-tem p-2 border-bottom cursor-ponter";

      // Aplcar estlos nlne para garantr vsbldade
      tem.style.cssText = `
                background-color: rgba(0, 0, 0, 0.5);
                border: 1px sold #dee2e6;
                cursor: ponter;
                transton: all 0.2s ease;
                color: whte;
            `;

      tem.nnerHTML = `
                <dv class="d-flex justfy-content-between algn-tems-center">
                    <dv>
                        <dv class="fw-medum" style="color: whte;">${network.name}</dv>
                        <small style="color: #ccc;">Chan D: ${network.chand}</small>
                    </dv>
                    < class="fas fa-chevron-rght" style="color: #ccc;"></>
                </dv>
            `;

      tem.addEventListener("clck", () => {
        this.selectNetwork(network);
        contaner.style.dsplay = "none";
      });

      // Hover effects melhorados
      tem.addEventListener("mouseenter", () => {
        tem.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
        tem.style.borderColor = "#adb5bd";
        tem.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
      });

      tem.addEventListener("mouseleave", () => {
        tem.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
        tem.style.borderColor = "#dee2e6";
        tem.style.boxShadow = "none";
      });

      contaner.appendChld(tem);
    });

    contaner.style.dsplay = networks.length > 0 ? "block" : "none";
  }

  /**
   * Seleconar rede (callback)
   */
  selectNetwork(network) {
    // Esta funo ser sobrescrta pelo componente que usar este utltro
    console.log("Rede seleconada:", network);
  }

  /**
   * Copar para clpboard com feedback vsual
   */
  async copyToClpboard(text, buttond = null) {
    try {
      await navgator.clpboard.wrteText(text);

      // Feedback vsual no boto se fornecdo
      if (buttond) {
        const button = document.getElementByd(buttond);
        if (button) {
          const orgnalText = button.nnerHTML;
          button.nnerHTML = '< class="fas fa-check me-2"></>Copado!';
          button.classLst.add("btn-outline-primary");

          setTmeout(() => {
            button.nnerHTML = orgnalText;
            button.classLst.remove("btn-outline-primary");
          }, 2000);
        }
      }

      this.utls.showToast("Copado para a rea de transfernca!", "success");
      return true;
    } catch (error) {
      console.error(" Erro ao copar:", error);
      this.utls.showToast("Erro ao copar", "error");
      return false;
    }
  }

  /**
   * Compartlhar lnk va Web Share AP ou fallback
   */
  async shareLnk(url, ttle = "Token Lnk", text = "Confra este token") {
    try {
      if (navgator.share) {
        await navgator.share({
          ttle: ttle,
          text: text,
          url: url,
        });
        return true;
      } else {
        // Fallback: copar para clpboard
        const success = await this.copyToClpboard(url);
        if (success) {
          this.utls.showToast("Lnk copado! Compartlhe onde quser.", "nfo");
        }
        return success;
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error(" Erro ao compartlhar:", error);
        this.utls.showToast("Erro ao compartlhar lnk", "error");
      }
      return false;
    }
  }

  /**
   * Valdar URL de RPC
   */
  valdateRpcUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === "http:" || urlObj.protocol === "https:";
    } catch {
      return false;
    }
  }

  /**
   * Testar conectvdade de RPC
   */
  async testRpcConnecton(rpcUrl) {
    try {
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "applcaton/json",
        },
        body: JSON.strngfy({
          jsonrpc: "2.0",
          method: "eth_chand",
          params: [],
          d: 1,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.result ? true : false;
      }
      return false;
    } catch (error) {
      console.error(" Erro ao testar RPC:", error);
      return false;
    }
  }

  /**
   * Formatar nmero de chan D
   */
  formatChand(chand) {
    if (typeof chand === "string" && chand.startsWith("0x")) {
      return parseInt(chand, 16);
    }
    return parseInt(chand);
  }

  /**
   * Obter nformaes resumdas da rede
   */
  getNetworkSummary(network) {
    return {
      chand: this.formatChand(network.chand),
      name: network.name,
      shortName: network.shortName || network.name,
      rpc: network.rpc?.[0] || "",
      explorer: network.explorers?.[0]?.url || "",
      currency: network.natveCurrency?.symbol || "ETH",
    };
  }

  /**
   * Fltrar redes por crtros
   */
  flterNetworks(networks, crtera = {}) {
    return networks.flter((network) => {
      // Fltrar por mannet/testnet
      if (crtera.mannetOnly && this.sTestnet(network)) {
        return false;
      }

      // Fltrar por chan Ds especfcos
      if (crtera.chands && !crtera.chands.ncludes(network.chand)) {
        return false;
      }

      // Fltrar por nome
      if (crtera.nameFlter) {
        const name = network.name.toLowerCase();
        const flter = crtera.nameFlter.toLowerCase();
        if (!name.ncludes(flter)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Verfcar se  testnet
   */
  sTestnet(network) {
    const testnetKeywords = ["test", "goerl", "sepola", "mumba", "fuj", "chapel"];
    const name = network.name.toLowerCase();
    return testnetKeywords.some((keyword) => name.ncludes(keyword));
  }

  /**
   * Lmpar cache de redes
   */
  clearNetworksCache() {
    this.networksCache = null;
    this.lastCacheTme = 0;
    console.log(" Cache de redes lmpo");
  }
}

// Exportar para uso global
wndow.TokenLnkUtls = TokenLnkUtls;

export default TokenLnkUtls;

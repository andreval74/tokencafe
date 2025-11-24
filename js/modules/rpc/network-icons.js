/**
 * Gerenciador de Ícones de Redes
 * Utiliza dados do ChainList para exibir ícones das redes blockchain
 */

class NetworkIconManager {
  constructor() {
    this.iconCache = new Map();
    this.defaultIcon = "🔗"; // Ícone padrão para redes sem ícone específico

    // Mapeamento de ícones conhecidos
    this.knownIcons = {
      ethereum: "⟠",
      binance: "🟡",
      polygon: "🟣",
      arbitrum: "🔵",
      optimism: "🔴",
      avalanche: "🔺",
      fantom: "👻",
      cronos: "💎",
      gnosis: "🟢",
      base: "🔷",
      linea: "📏",
      scroll: "📜",
    };
  }

  /**
   * Obtém o ícone para uma rede específica
   * @param {Object} network - Dados da rede
   * @returns {string} Ícone da rede
   */
  getNetworkIcon(network) {
    if (!network) return this.defaultIcon;

    // Verificar cache primeiro
    const cacheKey = `${network.chainId}-${network.icon}`;
    if (this.iconCache.has(cacheKey)) {
      return this.iconCache.get(cacheKey);
    }

    let icon = this.defaultIcon;

    // Tentar usar ícone do ChainList
    if (network.icon && typeof network.icon === "string") {
      // Se é um emoji ou símbolo, usar diretamente
      if (this.isEmoji(network.icon) || network.icon.length <= 2) {
        icon = network.icon;
      }
      // Se é um nome de ícone conhecido, usar nosso mapeamento
      else if (this.knownIcons[network.icon.toLowerCase()]) {
        icon = this.knownIcons[network.icon.toLowerCase()];
      }
      // Se é uma URL de imagem, criar elemento img
      else if (network.icon.startsWith("http")) {
        icon = this.createImageIcon(network.icon, network.name);
      }
    }

    // Fallback baseado no nome da rede
    if (icon === this.defaultIcon) {
      icon = this.getIconByNetworkName(network.name || network.chain);
    }

    // Armazenar no cache
    this.iconCache.set(cacheKey, icon);
    return icon;
  }

  /**
   * Verifica se uma string é um emoji
   * @param {string} str - String para verificar
   * @returns {boolean} True se for emoji
   */
  isEmoji(str) {
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
    return emojiRegex.test(str);
  }

  /**
   * Cria um elemento de imagem para ícones de URL
   * @param {string} iconUrl - URL do ícone
   * @param {string} networkName - Nome da rede para alt text
   * @returns {string} HTML do elemento img
   */
  createImageIcon(iconUrl, networkName) {
    return `<img src="${iconUrl}" alt="${networkName}" class="network-icon" style="width: 20px; height: 20px; border-radius: 50%; vertical-align: middle;">`;
  }

  /**
   * Obtém ícone baseado no nome da rede
   * @param {string} networkName - Nome da rede
   * @returns {string} Ícone da rede
   */
  getIconByNetworkName(networkName) {
    if (!networkName) return this.defaultIcon;

    const name = networkName.toLowerCase();

    // Mapeamento por palavras-chave no nome
    const nameMapping = {
      ethereum: "⟠",
      binance: "🟡",
      bsc: "🟡",
      polygon: "🟣",
      matic: "🟣",
      arbitrum: "🔵",
      optimism: "🔴",
      avalanche: "🔺",
      avax: "🔺",
      fantom: "👻",
      ftm: "👻",
      cronos: "💎",
      cro: "💎",
      gnosis: "🟢",
      xdai: "🟢",
      base: "🔷",
      linea: "📏",
      scroll: "📜",
      bitcoin: "₿",
      btc: "₿",
      litecoin: "Ł",
      ltc: "Ł",
      cardano: "₳",
      ada: "₳",
      solana: "◎",
      sol: "◎",
      tron: "🔴",
      trx: "🔴",
    };

    for (const [keyword, icon] of Object.entries(nameMapping)) {
      if (name.includes(keyword)) {
        return icon;
      }
    }

    return this.defaultIcon;
  }

  /**
   * Adiciona ícone a um elemento HTML
   * @param {HTMLElement} element - Elemento para adicionar o ícone
   * @param {Object} network - Dados da rede
   * @param {string} position - Posição do ícone ('before' ou 'after')
   */
  addIconToElement(element, network, position = "before") {
    if (!element || !network) return;

    const icon = this.getNetworkIcon(network);
    const iconSpan = document.createElement("span");
    iconSpan.className = "network-icon-wrapper";
    iconSpan.style.marginRight = position === "before" ? "8px" : "0";
    iconSpan.style.marginLeft = position === "after" ? "8px" : "0";

    if (icon.startsWith("<img")) {
      iconSpan.innerHTML = icon;
    } else {
      iconSpan.textContent = icon;
    }

    if (position === "before") {
      element.insertBefore(iconSpan, element.firstChild);
    } else {
      element.appendChild(iconSpan);
    }
  }

  /**
   * Atualiza ícones de uma lista de redes
   * @param {Array} networks - Lista de redes
   * @param {string} containerSelector - Seletor do container
   */
  updateNetworkList(networks, containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container || !networks) return;

    const items = container.querySelectorAll(".network-item, .autocomplete-item");
    items.forEach((item, index) => {
      if (networks[index]) {
        // Remover ícones existentes
        const existingIcons = item.querySelectorAll(".network-icon-wrapper");
        existingIcons.forEach((icon) => icon.remove());

        // Adicionar novo ícone
        this.addIconToElement(item, networks[index], "before");
      }
    });
  }

  /**
   * Limpa o cache de ícones
   */
  clearCache() {
    this.iconCache.clear();
  }
}

// Instância global
const networkIconManager = new NetworkIconManager();

// Exportar para uso em outros módulos
if (typeof module !== "undefined" && module.exports) {
  module.exports = NetworkIconManager;
} else if (typeof window !== "undefined") {
  window.NetworkIconManager = NetworkIconManager;
  window.networkIconManager = networkIconManager;
}

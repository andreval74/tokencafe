
document.addEventListener('DOMContentLoaded', () => {
  const provider = window.ethereum;
  const providerStatus = document.getElementById("providerStatus");
  const messageEl = document.getElementById("message");

  if (provider) {
    providerStatus.textContent = "MetaMask detectado.";
  } else {
    providerStatus.textContent = "MetaMask NÃO detectado.";
  }

  const networks = [
    {
      chainId: 11155111,
      chainName: "Sepolia Testnet",
      nativeCurrency: { name: "SepoliaETH", symbol: "SEP", decimals: 18 },
      rpcUrls: ["https://rpc.sepolia.org"],
      blockExplorerUrls: ["https://sepolia.etherscan.io"],
    },
    {
      chainId: 1,
      chainName: "Ethereum Mainnet",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: ["https://mainnet.infura.io/v3/YOUR-ID"],
      blockExplorerUrls: ["https://etherscan.io"],
    },
    {
      chainId: 137,
      chainName: "Polygon Mainnet",
      nativeCurrency: { name: "Matic", symbol: "MATIC", decimals: 18 },
      rpcUrls: ["https://polygon-rpc.com"],
      blockExplorerUrls: ["https://polygonscan.com"],
    },
  ];

  const networkList = document.getElementById("networkList");

  function toHexChainId(chainId) {
    if (typeof chainId === "string" && chainId.startsWith("0x")) return chainId;
    return "0x" + parseInt(chainId).toString(16);
  }

  function renderNetworks(list) {
    networkList.innerHTML = "";
    list.forEach((net) => {
      const div = document.createElement("div");
      div.className = "network";

      div.innerHTML = `
      <div>
        <strong>${net.chainName}</strong><br/>
        ID: ${net.chainId} — Hex: ${toHexChainId(net.chainId)}<br/>
        RPC: ${net.rpcUrls[0]}
      </div>
      <div>
        <button class="simple-button" data-action="switch-network" data-chainid='${JSON.stringify(net.chainId)}'>Trocar</button><br/>
        <button class="simple-button mt-1" data-action="add-network" data-network='${JSON.stringify(net)}'>Adicionar</button>
      </div>
    `;
      networkList.appendChild(div);
    });
  }

  // Event Delegation for network buttons
  networkList.addEventListener('click', (e) => {
    const target = e.target;
    if (target.tagName === 'BUTTON') {
      const action = target.getAttribute('data-action');
      if (action === 'switch-network') {
        const chainId = JSON.parse(target.getAttribute('data-chainid'));
        switchToNetwork(chainId);
      } else if (action === 'add-network') {
        const network = JSON.parse(target.getAttribute('data-network'));
        addNetwork(network);
      }
    }
  });

  renderNetworks(networks);

  function setMessage(msg, isError = false) {
    messageEl.textContent = msg;
    messageEl.className = `message ${isError ? "error" : "success"}`;
  }

  async function addNetwork(net) {
    if (!provider) {
      try {
        const container = document.querySelector(".container, .container-fluid") || document.body;
        if (typeof window.notify === "function") {
          window.notify("MetaMask não detectado.", "error", { container });
        } else {
          console.error("MetaMask não detectado.");
        }
      } catch (_) {}
      return;
    }

    try {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: toHexChainId(net.chainId),
            chainName: net.chainName,
            nativeCurrency: net.nativeCurrency,
            rpcUrls: net.rpcUrls,
            blockExplorerUrls: net.blockExplorerUrls || [],
          },
        ],
      });
      setMessage(`Rede ${net.chainName} adicionada com sucesso.`);
    } catch (e) {
      console.error(e);
      if (e.code === 4001) setMessage("Ação rejeitada pelo usuário.", true);
      else setMessage("Erro ao adicionar rede: " + e.message, true);
    }
  }

  async function switchToNetwork(chainId) {
    if (!provider) {
      try {
        const container = document.querySelector(".container, .container-fluid") || document.body;
        if (typeof window.notify === "function") {
          window.notify("MetaMask não detectado.", "error", { container });
        } else {
          console.error("MetaMask não detectado.");
        }
      } catch (_) {}
      return;
    }
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: toHexChainId(chainId) }],
      });
      setMessage("Rede trocada com sucesso.");
    } catch (e) {
      if (e.code === 4902) {
        setMessage("Rede não encontrada. Tente adicioná-la primeiro.", true);
      } else if (e.code === 4001) {
        setMessage("Ação rejeitada pelo usuário.", true);
      } else {
        setMessage("Erro ao trocar rede: " + e.message, true);
      }
    }
  }

  document.getElementById("searchInput").addEventListener("input", function () {
    const q = this.value.toLowerCase();
    const results = networks.filter((n) => n.chainName.toLowerCase().includes(q) || String(n.chainId).includes(q) || (n.nativeCurrency.symbol && n.nativeCurrency.symbol.toLowerCase().includes(q)));
    renderNetworks(results);
  });

  document.getElementById("customForm").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!provider) {
      try {
        const container = document.querySelector(".container, .container-fluid") || document.body;
        if (typeof window.notify === "function") {
          window.notify("MetaMask não detectado.", "error", { container });
        } else {
          console.error("MetaMask não detectado.");
        }
      } catch (_) {}
      return;
    }

    const chainId = document.getElementById("customChainId").value;
    const chainName = document.getElementById("customChainName").value;
    const nativeCurrencyName = document.getElementById("customCurrencyName").value;
    const nativeCurrencySymbol = document.getElementById("customCurrencySymbol").value;
    const decimals = Number(document.getElementById("customCurrencyDecimals").value || 18);
    const rpcUrl = document.getElementById("customRpcUrl").value;
    const explorerUrl = document.getElementById("customExplorerUrl").value;
    const iconUrl = document.getElementById("customIconUrl").value;

    const params = [
      {
        chainId: toHexChainId(chainId),
        chainName: chainName,
        nativeCurrency: {
          name: nativeCurrencyName,
          symbol: nativeCurrencySymbol,
          decimals: decimals,
        },
        rpcUrls: [rpcUrl],
        blockExplorerUrls: explorerUrl ? [explorerUrl] : [],
        iconUrls: iconUrl ? [iconUrl] : [],
      },
    ];

    provider
      .request({
        method: "wallet_addEthereumChain",
        params,
      })
      .then(() => {
        setMessage("RPC personalizada adicionada com sucesso.");
      })
      .catch((err) => {
        console.error(err);
        setMessage("Erro: " + err.message, true);
      });
  });
});

// Widget de Transação entre contrato e comprador (BNB Testnet)
// Foco: simples, funcional e detalhado, pronto para embutir em páginas de cliente

(function () {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const log = (obj) => {
    const el = $("#tw-log");
    if (el) el.textContent = JSON.stringify(obj, null, 2);
  };

  const REQUIRED_CHAIN_ID = 97; // BNB Testnet
  const DEFAULT_PRICE_PER_TOKEN = ethers.utils.parseEther("0.001"); // 0.001 tBNB por token

  const ERC20_ABI = ["function symbol() view returns (string)", "function decimals() view returns (uint8)", "function balanceOf(address account) view returns (uint256)", "function transfer(address to, uint256 amount) returns (bool)", "function allowance(address owner, address spender) view returns (uint256)", "function approve(address spender, uint256 amount) returns (bool)"];

  let provider = null,
    signer = null;
  function extractReason(err) {
    try {
      const m = err?.error?.message || err?.data?.message || err?.reason || err?.message || String(err);
      return m;
    } catch (_) {
      return "CALL_EXCEPTION";
    }
  }

  function sanitizeUrl(u) {
    if (!u) return null;
    let s = String(u).replace(/\s+$/u, "");
    if ((s.startsWith("`") && s.endsWith("`")) || (s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      s = s.slice(1, -1).replace(/\s+$/u, "");
    }
    s = s.replace(/\s+$/u, "");
    return s;
  }

  function getCandidateRpcUrls() {
    const urls = ["https://bsc-testnet.publicnode.com", "https://endpoints.omniatech.io/v1/bsc-testnet/public"];
    try {
      const selected = window.__selectedNetwork;
      if (Array.isArray(selected?.rpc)) {
        for (const entry of selected.rpc) {
          const s = sanitizeUrl(typeof entry === "string" ? entry : entry?.url);
          if (s) urls.push(s);
        }
      } else if (typeof selected?.rpc === "string") {
        const s = sanitizeUrl(selected.rpc);
        if (s) urls.push(s);
      }
    } catch (_) {}
    try {
      const nm = window.networkManager?.getNetworkById?.(REQUIRED_CHAIN_ID);
      if (Array.isArray(nm?.rpc)) {
        for (const entry of nm.rpc) {
          const s = sanitizeUrl(typeof entry === "string" ? entry : entry?.url);
          if (s) urls.push(s);
        }
      }
    } catch (_) {}
    return [...new Set(urls.filter(Boolean))];
  }

  async function pickResponsiveRpc(timeoutMs = 8000) {
    const candidates = getCandidateRpcUrls();
    for (const url of candidates) {
      try {
        const prov = new ethers.providers.StaticJsonRpcProvider({ url, timeout: timeoutMs }, { chainId: REQUIRED_CHAIN_ID, name: "bnb-testnet" });
        await Promise.race([prov.getBlockNumber(), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), timeoutMs))]);
        return { prov, url };
      } catch (_) {
        /* tenta próximo */
      }
    }
    const fallbackUrl = "https://bsc-testnet.publicnode.com";
    const prov = new ethers.providers.StaticJsonRpcProvider({ url: fallbackUrl, timeout: timeoutMs }, { chainId: REQUIRED_CHAIN_ID, name: "bnb-testnet" });
    return { prov, url: fallbackUrl };
  }

  async function ensureWalletNetwork() {
    if (!provider) throw new Error("Provider não inicializado");
    const net = await provider.getNetwork();
    if (Number(net.chainId) !== REQUIRED_CHAIN_ID) {
      throw new Error(`Rede incorreta (chainId=${net.chainId}). Selecione BNB Testnet (97).`);
    }
  }

  class TransactionWidget {
    constructor(network, contractAddress) {
      this.network = network;
      this.contractAddress = contractAddress || "";
      this.buyerWallet = null;
      this.tokenAddress = "";
      this.symbol = "tBNB";
      this.decimals = 18;
      this.pricePerToken = DEFAULT_PRICE_PER_TOKEN;
      this.minQty = ethers.BigNumber.from(1);
      this.maxQty = null; // ilimitado por padrão
      this.readProv = null;
      this.readRpcUrl = null;
      this.state = {
        contractIsDeployed: null,
        isErc20Valid: null,
        canTransfer: null,
        sellerBalance: null,
        allowanceOk: null,
      };
      this._refreshTimer = null;
    }

    async init() {
      // provider carteira
      if (window.ethereum) {
        provider = new ethers.providers.Web3Provider(window.ethereum, "any");
      }
      // read provider
      const picked = await pickResponsiveRpc();
      this.readProv = picked.prov;
      this.readRpcUrl = picked.url;
      try {
        const net = await this.readProv.getNetwork();
        if (net?.chainId === REQUIRED_CHAIN_ID) this.symbol = "tBNB";
      } catch (_) {}
      this.bindUI();
      this.render();
      this.attachEvents();
      await this.refreshAll();
      this._refreshTimer = setInterval(() => this.refreshBalances(), 12000);
    }

    bindUI() {
      this.el = {
        contractInput: $("#tw-contract-address"),
        tokenInput: $("#tw-token-address"),
        connectBtn: $("#tw-connect"),
        buyerInfo: $("#tw-buyer-info"),
        qtyInput: $("#tw-qty"),
        priceInput: $("#tw-price"),
        minMaxInfo: $("#tw-minmax"),
        validateBtn: $("#tw-validate"),
        buyBtn: $("#tw-buy"),
        statusReceiver: $("#tw-status-receiver"),
        statusToken: $("#tw-status-token"),
        statusTransfer: $("#tw-status-transfer"),
        statusSellerBal: $("#tw-status-sellerbal"),
        statusAllowance: $("#tw-status-allowance"),
        balances: {
          buyerNative: $("#tw-buyer-native"),
          buyerToken: $("#tw-buyer-token"),
          contractNative: $("#tw-contract-native"),
          contractToken: $("#tw-contract-token"),
        },
        net: {
          readChain: $("#tw-read-chain"),
          readRpc: $("#tw-read-rpc"),
          walletChain: $("#tw-wallet-chain"),
        },
      };
    }

    render() {
      if (this.el.contractInput) this.el.contractInput.value = this.contractAddress;
      if (this.el.priceInput) this.el.priceInput.value = ethers.utils.formatEther(this.pricePerToken);
      if (this.el.minMaxInfo) this.el.minMaxInfo.textContent = `Min: ${this.minQty.toString()} | Max: ${this.maxQty ? this.maxQty.toString() : "—"}`;
    }

    attachEvents() {
      this.el.contractInput?.addEventListener("change", () => {
        this.contractAddress = String(this.el.contractInput.value || "").replace(/\s+$/u, "");
      });
      this.el.tokenInput?.addEventListener("change", () => {
        this.tokenAddress = String(this.el.tokenInput.value || "").replace(/\s+$/u, "");
      });
      this.el.priceInput?.addEventListener("change", () => {
        const v = String(this.el.priceInput.value || "").replace(/\s+$/u, "");
        try {
          this.pricePerToken = ethers.utils.parseEther(v || "0.001");
        } catch (_) {
          this.pricePerToken = DEFAULT_PRICE_PER_TOKEN;
        }
        this.refreshTotal();
      });
      this.el.qtyInput?.addEventListener("change", () => this.refreshTotal());
      this.el.connectBtn?.addEventListener("click", async () => {
        try {
          if (!window.ethereum) {
            log({ error: "MetaMask não detectado" });
            return;
          }
          await provider.send("eth_requestAccounts", []);
          signer = provider.getSigner();
          this.buyerWallet = await signer.getAddress();
          await ensureWalletNetwork();
          if (this.el.buyerInfo) {
            this.el.buyerInfo.innerHTML = `<span class="text-success"><i class="bi bi-person-bounding-box me-2"></i>${this.buyerWallet}</span>`;
          }
          await this.refreshBalances();
          await this.updateNetworkInfo();
        } catch (e) {
          log({
            error: "Falha ao conectar carteira",
            details: e?.message || String(e),
          });
        }
      });
      this.el.validateBtn?.addEventListener("click", async () => {
        await this.validateContract();
        this.displayInfo();
      });
      this.el.buyBtn?.addEventListener("click", async () => {
        await this.buy();
      });
      this.el.addMmBtn?.addEventListener("click", async () => {
        await this.addToMetaMask();
      });
    }

    refreshTotal() {
      const qty = Number(this.el.qtyInput?.value || 1);
      const total = this.pricePerToken.mul(qty);
      const el = $("#tw-total");
      if (el) el.textContent = `${ethers.utils.formatEther(total)} ${this.symbol}`;
    }

    async refreshBalances() {
      try {
        const contract = this.contractAddress && ethers.utils.isAddress(this.contractAddress) ? this.contractAddress : null;
        const buyer = this.buyerWallet;
        if (buyer) {
          const bal = await this.readProv.getBalance(buyer);
          if (this.el.balances.buyerNative) this.el.balances.buyerNative.textContent = `${ethers.utils.formatEther(bal)} ${this.symbol}`;
        }
        if (contract) {
          const bal = await this.readProv.getBalance(contract);
          if (this.el.balances.contractNative) this.el.balances.contractNative.textContent = `${ethers.utils.formatEther(bal)} ${this.symbol}`;
        }
        if (buyer && this.tokenAddress && ethers.utils.isAddress(this.tokenAddress)) {
          const erc20 = new ethers.Contract(this.tokenAddress, ERC20_ABI, this.readProv);
          const balBuyer = await erc20.balanceOf(buyer);
          const balContract = contract ? await erc20.balanceOf(contract) : null;
          if (this.el.balances.buyerToken) this.el.balances.buyerToken.textContent = balBuyer.toString();
          if (this.el.balances.contractToken && balContract) this.el.balances.contractToken.textContent = balContract.toString();
        }
      } catch (e) {
        log({
          warn: "Falha ao atualizar saldos",
          details: e?.message || String(e),
        });
      }
    }

    async refreshAll() {
      await this.validateContract();
      this.displayInfo();
      await this.refreshBalances();
      this.refreshTotal();
      if (typeof this.updateNetworkInfo === "function") {
        await this.updateNetworkInfo();
      }
    }

    async validateContract() {
      const addr = String(this.contractAddress || "").replace(/\s+$/u, "");
      const tokenAddr = String(this.tokenAddress || "").replace(/\s+$/u, "");
      this.state = {
        contractIsDeployed: null,
        isErc20Valid: null,
        canTransfer: null,
        sellerBalance: null,
        allowanceOk: null,
      };
      try {
        if (!addr || !ethers.utils.isAddress(addr)) throw new Error("Endereço de contrato inválido");
        const code = await this.readProv.getCode(addr);
        this.state.contractIsDeployed = !!(code && code !== "0x");
      } catch (e) {
        this.state.contractIsDeployed = false;
      }
      try {
        if (tokenAddr && ethers.utils.isAddress(tokenAddr)) {
          const erc20 = new ethers.Contract(tokenAddr, ERC20_ABI, this.readProv);
          const [symbol, decimals] = await Promise.all([erc20.symbol().catch(() => ""), erc20.decimals().catch(() => 18)]);
          this.symbolToken = symbol || "TOKEN";
          this.decimals = Number(decimals) || 18;
          this.state.isErc20Valid = !!decimals;
          // função transfer existe no ABI
          this.state.canTransfer = true;
          // saldo do vendedor (contrato)
          if (this.state.contractIsDeployed) {
            const bal = await erc20.balanceOf(addr).catch(() => null);
            this.state.sellerBalance = bal ? bal.toString() : null;
          }
          // allowance (comprador -> contrato), para fluxos que usam transferFrom (informativo)
          if (this.buyerWallet && this.state.contractIsDeployed) {
            const allowance = await erc20.allowance(this.buyerWallet, addr).catch(() => null);
            this.state.allowanceOk = allowance ? allowance.gt(0) : null;
          }
        } else {
          this.state.isErc20Valid = false;
        }
      } catch (e) {
        this.state.isErc20Valid = false;
      }
    }

    showField(el, isValid, value) {
      if (!el) return;
      el.classList.remove("text-success", "text-danger");
      el.classList.add(isValid ? "text-success" : "text-danger");
      el.textContent = String(value ?? "-");
    }

    displayInfo() {
      this.showField(this.el.statusReceiver, !!this.state.contractIsDeployed, this.contractAddress || "-");
      const tokenDetails = this.state.isErc20Valid ? `${this.symbolToken || "TOKEN"} · ${this.decimals}` : "-";
      this.showField(this.el.statusToken, !!this.state.isErc20Valid, tokenDetails);
      this.showField(this.el.statusTransfer, !!this.state.canTransfer, this.state.canTransfer ? "transfer() disponível" : "indisponível");
      this.showField(this.el.statusSellerBal, !!this.state.sellerBalance, this.state.sellerBalance ?? "-");
      this.showField(this.el.statusAllowance, this.state.allowanceOk === true, this.state.allowanceOk ? "ok" : this.state.allowanceOk === false ? "zero" : "-");
    }

    async updateNetworkInfo() {
      try {
        const netRead = await this.readProv.getNetwork().catch(() => null);
        if (this.el.net?.readChain) this.el.net.readChain.textContent = netRead ? String(netRead.chainId) : "-";
        if (this.el.net?.readRpc) this.el.net.readRpc.textContent = this.readRpcUrl || "-";
        let walletChain = null;
        if (provider) {
          const nw = await provider.getNetwork().catch(() => null);
          walletChain = nw?.chainId ?? null;
        }
        if (this.el.net?.walletChain) this.el.net.walletChain.textContent = walletChain != null ? String(walletChain) : "-";
      } catch (e) {
        log({
          warn: "Falha ao atualizar rede atual",
          details: e?.message || String(e),
        });
      }
      try {
        if (window.ethereum && typeof window.ethereum.on === "function") {
          if (!window.__tw_chain_listener) {
            window.__tw_chain_listener = true;
            window.ethereum.on("chainChanged", async () => {
              await this.updateNetworkInfo();
              await this.refreshBalances();
            });
            window.ethereum.on("accountsChanged", async () => {
              try {
                signer = provider.getSigner();
                this.buyerWallet = await signer.getAddress().catch(() => null);
                if (this.el.buyerInfo) {
                  this.el.buyerInfo.innerHTML = `<span class="text-success"><i class="bi bi-person-bounding-box me-2"></i>${this.buyerWallet || "-"}</span>`;
                }
                await this.refreshBalances();
                await this.updateNetworkInfo();
              } catch (_) {}
            });
          }
        }
      } catch (_) {}
    }

    async buy() {
      try {
        if (!signer) {
          log({ error: "Conecte a carteira" });
          return;
        }
        await ensureWalletNetwork();
        if (!this.contractAddress || !ethers.utils.isAddress(this.contractAddress)) {
          log({ error: "Informe contrato válido" });
          return;
        }
        const qty = Number(this.el.qtyInput?.value || 1);
        if (qty <= 0) {
          log({ error: "Quantidade inválida" });
          return;
        }
        const total = this.pricePerToken.mul(qty);
        const buyerBal = await signer.getBalance();
        if (buyerBal.lt(total)) {
          log({
            error: "Saldo tBNB insuficiente",
            balance: buyerBal.toString(),
            total: total.toString(),
          });
          return;
        }

        const buyBtn = this.el.buyBtn;
        if (buyBtn) {
          buyBtn.disabled = true;
          buyBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processando...';
        }
        const sale = new ethers.Contract(this.contractAddress, ["function buy(uint256 qty) payable"], signer);
        let tx = null,
          receipt = null;
        // Pré-checagem: tentar callStatic para obter motivo de revert
        try {
          await sale.callStatic.buy(ethers.BigNumber.from(qty), {
            value: total,
          });
        } catch (e) {
          const reason = extractReason(e);
          try {
            const container = document.querySelector(".container, .container-fluid") || document.body;
            if (typeof window.notify === "function") {
              window.notify(`Pré-checagem falhou: ${reason}`, "error", { container });
            } else {
              console.error(`Pré-checagem falhou: ${reason}`);
            }
          } catch (_) {}
          log({ error: "Pré-checagem buy() falhou", details: reason, raw: e });
          if (buyBtn) {
            buyBtn.disabled = false;
            buyBtn.innerHTML = '<i class="bi bi-cash-coin me-2"></i> Confirmar compra';
          }
          return;
        }
        try {
          // tentar caminho padrão com buy(); caso não exista, cair no envio direto de valor ao contrato
          const gas = await sale.estimateGas.buy(ethers.BigNumber.from(qty), { value: total }).catch(() => null);
          const gasLimit = gas ? gas.mul(120).div(100) : ethers.BigNumber.from(250000);
          tx = await sale.buy(ethers.BigNumber.from(qty), {
            value: total,
            gasLimit,
          });
        } catch (_) {
          tx = await signer.sendTransaction({
            to: this.contractAddress,
            value: total,
          });
        }
        receipt = await tx.wait(1);
        const resumo = {
          ok: receipt.status === 1,
          txHash: tx.hash,
          time: new Date().toISOString(),
          qty,
          totalWei: total.toString(),
          totalBNB: ethers.utils.formatEther(total),
          status: receipt.status === 1 ? "CONFIRMADO" : "REVERTIDO",
        };
        log(resumo);
        try {
          const container = document.querySelector(".container, .container-fluid") || document.body;
          const type = receipt.status === 1 ? "success" : "error";
          const iconText = receipt.status === 1 ? "confirmada" : "revertida";
          if (typeof window.notify === "function") {
            window.notify(`Transação ${iconText} · Tx: <a href=\"#\" class=\"text-decoration-underline\">${tx.hash}</a> · Pago: ${ethers.utils.formatEther(total)} ${this.symbol}`, type, { container });
          } else {
            console.log(`Transação ${iconText}`, tx.hash);
          }
        } catch (_) {}
        await this.refreshBalances();
        if (buyBtn) {
          buyBtn.disabled = false;
          buyBtn.innerHTML = '<i class="bi bi-cash-coin me-2"></i> Confirmar compra';
        }
      } catch (e) {
        const buyBtn = this.el.buyBtn;
        if (buyBtn) {
          buyBtn.disabled = false;
          buyBtn.innerHTML = '<i class="bi bi-cash-coin me-2"></i> Confirmar compra';
        }
        const msg = e?.message || String(e);
        log({ error: "Falha na compra", details: msg });
        try {
          const container = document.querySelector(".container, .container-fluid") || document.body;
          if (typeof window.notify === "function") {
            window.notify(`Erro na compra: ${msg}`, "error", { container });
          } else {
            console.error(`Erro na compra: ${msg}`);
          }
        } catch (_) {}
      }
    }

    async addToMetaMask() {
      try {
        if (!window.ethereum) {
          log({ error: "MetaMask não disponível" });
          return;
        }
        if (!this.tokenAddress || !ethers.utils.isAddress(this.tokenAddress)) {
          log({ error: "Token inválido" });
          return;
        }
        const erc20 = new ethers.Contract(this.tokenAddress, ERC20_ABI, this.readProv);
        const [symbol, decimals] = await Promise.all([erc20.symbol().catch(() => "TOKEN"), erc20.decimals().catch(() => 18)]);
        const res = await window.ethereum.request({
          method: "wallet_watchAsset",
          params: {
            type: "ERC20",
            options: {
              address: this.tokenAddress,
              symbol: symbol.slice(0, 12),
              decimals: Number(decimals),
            },
          },
        });
        log({ action: "wallet_watchAsset", result: res });
      } catch (e) {
        log({
          error: "Falha ao adicionar ao MetaMask",
          details: e?.message || String(e),
        });
      }
    }
  }

  // Inicialização simples para a página demo
  async function initDemo() {
    const widget = new TransactionWidget({ chainId: REQUIRED_CHAIN_ID }, "");
    window.__tw = widget;
    await widget.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDemo);
  } else {
    initDemo();
  }
})();

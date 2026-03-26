// Widget Simples: Ler e Comprar com tBNB
// Segue padrão dos módulos compartilhados (NetworkManager, WalletConnector) e usa ethers v5

(function () {
  const $ = (sel) => document.querySelector(sel);
  const logEl = $("#output");
  const log = (obj) => {
    if (logEl) logEl.textContent = JSON.stringify(obj, null, 2);
  };

  const REQUIRED_CHAIN_ID = 97; // BNB Testnet

  const TOKEN_SALE_ABI = ["function saleToken() view returns (address)", "function destinationWallet() view returns (address)", "function bnbPrice() view returns (uint256)", "function perWalletCap() view returns (uint256)", "function purchasedBy(address) view returns (uint256)", "function buy(uint256 quantity) payable"];

  const ERC20_ABI = ["function balanceOf(address account) view returns (uint256)", "function decimals() view returns (uint8)", "function transfer(address to, uint256 amount) returns (bool)"];

  let provider, signer;
  let readProviderCache = null;
  let readRpcUrlCache = null;

  // Utilitário: timeout para Promises
  function withTimeout(promise, ms, label = "timeout") {
    return new Promise((resolve) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) resolve(Promise.reject(new Error(`${label} após ${ms}ms`)));
      }, ms);
      Promise.resolve(promise)
        .then((val) => {
          settled = true;
          clearTimeout(timer);
          resolve(val);
        })
        .catch((err) => {
          settled = true;
          clearTimeout(timer);
          resolve(Promise.reject(err));
        });
    });
  }

  // Provider somente leitura para reduzir erros do MetaMask em leituras
  function getSelectedRpcUrl() {
    try {
      const selected = window.__selectedNetwork;
      const rpc = Array.isArray(selected?.rpc) && selected.rpc.length ? selected.rpc[0] : typeof selected?.rpc === "string" ? selected.rpc : "";
      const fallback = window.networkManager?.getNetworkById?.(REQUIRED_CHAIN_ID)?.rpc?.[0];
      return rpc || fallback || "https://bsc-testnet.publicnode.com";
    } catch (_) {
      return "https://bsc-testnet.publicnode.com";
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
    const urls = [];
    // Priorizar endpoints estáveis primeiro
    urls.push("https://bsc-testnet.publicnode.com");
    urls.push("https://endpoints.omniatech.io/v1/bsc-testnet/public");
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
    // Remover duplicados e valores falsy
    return [...new Set(urls.filter(Boolean))];
  }

  async function pickResponsiveRpc(timeoutMs = 8000) {
    if (readProviderCache && readRpcUrlCache) return { prov: readProviderCache, url: readRpcUrlCache };
    const candidates = getCandidateRpcUrls();
    for (const url of candidates) {
      try {
        const prov = new ethers.providers.StaticJsonRpcProvider({ url, timeout: timeoutMs }, { chainId: REQUIRED_CHAIN_ID, name: "bnb-testnet" });
        await withTimeout(prov.getBlockNumber(), timeoutMs, `rpc(${url})`);
        readProviderCache = prov;
        readRpcUrlCache = url;
        return { prov, url };
      } catch (_) {
        // tenta próximo
      }
    }
    // Último recurso
    const fallbackUrl = "https://bsc-testnet.publicnode.com";
    const prov = new ethers.providers.StaticJsonRpcProvider({ url: fallbackUrl, timeout: timeoutMs }, { chainId: REQUIRED_CHAIN_ID, name: "bnb-testnet" });
    readProviderCache = prov;
    readRpcUrlCache = fallbackUrl;
    return { prov, url: fallbackUrl };
  }

  async function getReadProvider() {
    const picked = await pickResponsiveRpc();
    return picked.prov;
  }

  async function ensureReadNetwork(readProv) {
    try {
      const net = await readProv.getNetwork();
      if (Number(net.chainId) !== REQUIRED_CHAIN_ID) {
        throw new Error(`RPC incorreto (chainId=${net.chainId}). Use BNB Testnet (97).`);
      }
    } catch (_) {
      // Alguns RPCs podem não responder chainId imediatamente; não bloquear leitura
    }
  }

  async function ensureNetworkSelected() {
    // Atualiza label do símbolo e chainId selecionado via NetworkManager
    try {
      const evNet = window.__selectedNetwork;
      if (evNet && $("#blockchain")) $("#blockchain").value = String(evNet.chainId);
      if (evNet?.nativeCurrency?.symbol) $("#currencySymbol").textContent = evNet.nativeCurrency.symbol;
    } catch (_) {}
  }

  async function ensureNetworkWallet() {
    if (!provider) throw new Error("Provider não inicializado");
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== REQUIRED_CHAIN_ID) {
      throw new Error(`Rede incorreta (chainId=${network.chainId}). Selecione BNB Testnet (97).`);
    }
  }

  async function connectWallet() {
    try {
      if (!window.ethereum) {
        log({ error: "MetaMask não detectado" });
        return;
      }
      provider = new ethers.providers.Web3Provider(window.ethereum, "any");
      await provider.send("eth_requestAccounts", []);
      signer = provider.getSigner();
      const addr = await signer.getAddress();
      $("#walletStatus").textContent = `Carteira: ${addr}`;
      await ensureNetworkWallet();
      log({ status: "connected", account: addr });
    } catch (e) {
      log({
        error: "Falha ao conectar carteira",
        details: e?.message || String(e),
      });
    }
  }

  async function isContract(address, prov) {
    const p = prov || provider || (await getReadProvider());
    const code = await p.getCode(address);
    return !!code && code !== "0x";
  }

  async function readSale() {
    try {
      await ensureNetworkSelected();
      const { prov: readProv, url: rpcUrl } = await pickResponsiveRpc(5000);
      await ensureReadNetwork(readProv);
      const saleAddr = String($("#saleAddress").value || "").replace(/\s+$/u, "");
      // Log inicial para diagnóstico
      log({ action: "readSale-start", rpcUrl, saleAddr });
      // Validações básicas do input
      if (!saleAddr) {
        log({ error: "Informe o endereço do contrato TokenSale" });
        try {
          const container = document.querySelector(".container, .container-fluid") || document.body;
          if (typeof window.notify === "function") {
            window.notify("Informe o endereço do contrato TokenSale", "warning", { container });
          } else {
            console.warn("Informe o endereço do contrato TokenSale");
          }
        } catch (_) {}
        $("#saleAddress")?.focus();
        return;
      }
      if (!ethers.utils.isAddress(saleAddr)) {
        log({ error: "Endereço inválido", address: saleAddr });
        try {
          const container = document.querySelector(".container, .container-fluid") || document.body;
          if (typeof window.notify === "function") {
            window.notify("Endereço inválido. Use um endereço 0x...", "error", { container });
          } else {
            console.error("Endereço inválido. Use um endereço 0x...");
          }
        } catch (_) {}
        $("#saleAddress")?.focus();
        return;
      }

      // Estado de carregamento visual nos painéis
      try {
        ["saleToken", "tokenDecimals", "destWallet", "bnbPrice", "perWalletCap", "contractTokenBalance", "alreadyPurchased", "totalCost"].forEach((id) => {
          const el = document.getElementById(id);
          if (el) el.textContent = "...";
        });
      } catch (_) {}

      const hasCode = await isContract(saleAddr, readProv);
      if (!hasCode) {
        log({
          error: "Endereço não tem contrato na rede 97",
          address: saleAddr,
        });
        return;
      }

      const sale = new ethers.Contract(saleAddr, TOKEN_SALE_ABI, readProv);
      // Ler campos com resiliência: funções ausentes não quebram fluxo
      const results = await Promise.allSettled([withTimeout(sale.saleToken(), 8000, "saleToken"), withTimeout(sale.destinationWallet(), 8000, "destinationWallet"), withTimeout(sale.bnbPrice(), 8000, "bnbPrice"), withTimeout(sale.perWalletCap(), 8000, "perWalletCap")]);
      const saleTokenAddr = results[0].status === "fulfilled" ? results[0].value : null;
      const destWallet = results[1].status === "fulfilled" ? results[1].value : null;
      const bnbPrice = results[2].status === "fulfilled" ? results[2].value : null;
      const perWalletCap = results[3].status === "fulfilled" ? results[3].value : null;

      const debug = {
        action: "readSale",
        rpcUrl,
        hasCode,
        steps: {
          saleToken: results[0].status,
          destinationWallet: results[1].status,
          bnbPrice: results[2].status,
          perWalletCap: results[3].status,
        },
      };

      $("#saleToken").textContent = saleTokenAddr || "-";
      $("#destWallet").textContent = destWallet || "-";
      $("#bnbPrice").textContent = bnbPrice ? bnbPrice.toString() : "-";
      $("#perWalletCap").textContent = perWalletCap ? perWalletCap.toString() : "(indisponível)";

      // Decimals e saldo de tokens do contrato
      let tokenDecimals = "-";
      let contractTokenBalance = "-";
      if (saleTokenAddr) {
        try {
          const erc20 = new ethers.Contract(saleTokenAddr, ERC20_ABI, readProv);
          tokenDecimals = await withTimeout(erc20.decimals(), 8000, "decimals");
          contractTokenBalance = (await withTimeout(erc20.balanceOf(saleAddr), 8000, "balanceOf")).toString();
        } catch (_) {}
      }
      $("#tokenDecimals").textContent = String(tokenDecimals);
      $("#contractTokenBalance").textContent = contractTokenBalance;

      // Já comprado por esta carteira
      try {
        const buyer = signer ? await signer.getAddress() : null;
        if (buyer) {
          const purchased = await withTimeout(sale.purchasedBy(buyer), 8000, "purchasedBy");
          $("#alreadyPurchased").textContent = purchased.toString();
        } else {
          $("#alreadyPurchased").textContent = "-";
        }
      } catch (_) {
        $("#alreadyPurchased").textContent = "-";
      }

      // Saldos das carteiras envolvidas (BNB e token)
      try {
        const symbol = document.getElementById("currencySymbol")?.textContent || "BNB";
        const saleBnb = await withTimeout(readProv.getBalance(saleAddr), 8000, "getBalance(sale)");
        const el = document.getElementById("saleBnbBalance");
        if (el) el.textContent = `${ethers.utils.formatEther(saleBnb)} ${symbol}`;
      } catch (_) {
        const el = document.getElementById("saleBnbBalance");
        if (el) el.textContent = "-";
      }

      try {
        const symbol = document.getElementById("currencySymbol")?.textContent || "BNB";
        if (destWallet && ethers.utils.isAddress(destWallet)) {
          const destBnb = await withTimeout(readProv.getBalance(destWallet), 8000, "getBalance(dest)");
          const el = document.getElementById("destBnbBalance");
          if (el) el.textContent = `${ethers.utils.formatEther(destBnb)} ${symbol}`;
        } else {
          const el = document.getElementById("destBnbBalance");
          if (el) el.textContent = "-";
        }
      } catch (_) {
        const el = document.getElementById("destBnbBalance");
        if (el) el.textContent = "-";
      }

      try {
        const symbol = document.getElementById("currencySymbol")?.textContent || "BNB";
        const buyer = signer ? await signer.getAddress() : null;
        if (buyer) {
          const buyerBnb = await withTimeout(readProv.getBalance(buyer), 8000, "getBalance(buyer)");
          const el = document.getElementById("buyerBnbBalance");
          if (el) el.textContent = `${ethers.utils.formatEther(buyerBnb)} ${symbol}`;
        } else {
          const el = document.getElementById("buyerBnbBalance");
          if (el) el.textContent = "-";
        }
      } catch (_) {
        const el = document.getElementById("buyerBnbBalance");
        if (el) el.textContent = "-";
      }

      try {
        const buyer = signer ? await signer.getAddress() : null;
        if (buyer && saleTokenAddr && saleTokenAddr !== ethers.constants.AddressZero) {
          const erc20 = new ethers.Contract(saleTokenAddr, ERC20_ABI, readProv);
          const bal = await withTimeout(erc20.balanceOf(buyer), 8000, "balanceOf(buyer)");
          const el = document.getElementById("buyerTokenBalance");
          if (el) el.textContent = bal.toString();
        } else {
          const el = document.getElementById("buyerTokenBalance");
          if (el) el.textContent = "-";
        }
      } catch (_) {
        const el = document.getElementById("buyerTokenBalance");
        if (el) el.textContent = "-";
      }

      const warnings = [];
      if (!perWalletCap) warnings.push("perWalletCap indisponível — endereço pode ser Proxy ou ABI diferente");
      if (!bnbPrice) warnings.push("bnbPrice indisponível — confirme contrato TokenSale");

      log({
        ok: true,
        action: "readSale-done",
        saleAddr,
        saleToken: saleTokenAddr,
        destinationWallet: destWallet,
        bnbPrice: bnbPrice?.toString() || null,
        perWalletCap: perWalletCap?.toString() || null,
        tokenDecimals: String(tokenDecimals),
        contractTokenBalance,
        warnings,
        debug,
      });
    } catch (e) {
      log({
        error: "Falha ao ler dados do contrato",
        details: e?.message || String(e),
        where: "readSale",
        rpcUrl: getSelectedRpcUrl(),
      });
    }
  }

  async function testDestinationWallet(destWallet) {
    try {
      const readProv = getReadProvider();
      const from = signer ? await signer.getAddress() : undefined;
      const gas = await readProv.estimateGas({
        to: destWallet,
        from,
        value: ethers.BigNumber.from(1),
      });
      return { ok: true, estimatedGas: gas.toString() };
    } catch (e) {
      return { ok: false, error: e?.message || String(e) };
    }
  }

  async function certifySale(qty) {
    try {
      const { prov: readProv, url: rpcUrl } = await pickResponsiveRpc(5000);
      await ensureReadNetwork(readProv);
      const saleAddr = String($("#saleAddress").value || "").replace(/\s+$/u, "");
      // Log inicial para diagnóstico
      log({ action: "certifySale-start", rpcUrl, saleAddr, qty });
      if (!saleAddr) {
        log({ error: "Informe o endereço do contrato TokenSale" });
        const alert = $("#alertContainer");
        if (alert) alert.innerHTML = '<div class="alert alert-warning"><i class="bi bi-exclamation-triangle me-2"></i>Informe o endereço do contrato TokenSale</div>';
        $("#saleAddress")?.focus();
        return;
      }
      if (!ethers.utils.isAddress(saleAddr)) {
        log({ error: "Endereço inválido", address: saleAddr });
        const alert = $("#alertContainer");
        if (alert) alert.innerHTML = '<div class="alert alert-danger"><i class="bi bi-x-circle me-2"></i>Endereço inválido. Use um endereço 0x...</div>';
        $("#saleAddress")?.focus();
        return;
      }
      if (!(await isContract(saleAddr, readProv))) {
        log({
          error: "Endereço não tem contrato na rede 97",
          address: saleAddr,
        });
        return;
      }

      const sale = new ethers.Contract(saleAddr, TOKEN_SALE_ABI, readProv);
      const buyer = signer ? await signer.getAddress() : ethers.constants.AddressZero;
      // Ler com resiliência: usar Promise.allSettled para evitar quebra por função ausente
      const res = await Promise.allSettled([withTimeout(sale.saleToken(), 8000, "saleToken"), withTimeout(sale.destinationWallet(), 8000, "destinationWallet"), withTimeout(sale.bnbPrice(), 8000, "bnbPrice"), withTimeout(sale.perWalletCap(), 8000, "perWalletCap"), withTimeout(sale.purchasedBy(buyer), 8000, "purchasedBy")]);
      const saleTokenAddr = res[0].status === "fulfilled" ? res[0].value : null;
      const destWallet = res[1].status === "fulfilled" ? res[1].value : null;
      const bnbPrice = res[2].status === "fulfilled" ? res[2].value : null;
      const perWalletCap = res[3].status === "fulfilled" ? res[3].value : null;
      const alreadyPurchased = res[4].status === "fulfilled" ? res[4].value : null;

      const debug = {
        action: "certifySale",
        rpcUrl,
        steps: {
          saleToken: res[0].status,
          destinationWallet: res[1].status,
          bnbPrice: res[2].status,
          perWalletCap: res[3].status,
          purchasedBy: res[4].status,
        },
      };

      // saldo e decimals
      let tokenBalance = null,
        tokenDecimals = null;
      if (saleTokenAddr) {
        try {
          const erc20 = new ethers.Contract(saleTokenAddr, ERC20_ABI, readProv);
          tokenBalance = await withTimeout(erc20.balanceOf(saleAddr), 8000, "balanceOf");
          tokenDecimals = await withTimeout(erc20.decimals(), 8000, "decimals");
        } catch (_) {}
      }

      const totalCost = bnbPrice ? bnbPrice.mul(qty) : null;
      $("#totalCost").textContent = totalCost ? totalCost.toString() : "-";

      const destTest = destWallet ? await testDestinationWallet(destWallet) : null;

      // Simular transferência de token do contrato para o comprador
      let tokenTransferSim = null;
      if (saleTokenAddr && qty && qty > 0) {
        try {
          // usar provedor de leitura para evitar dependência do MetaMask
          const erc20 = new ethers.Contract(saleTokenAddr, ERC20_ABI, readProv);
          const ok = await withTimeout(erc20.callStatic.transfer(buyer, qty, { from: saleAddr }), 8000, "erc20.transfer(static)");
          tokenTransferSim = { ok: !!ok };
        } catch (e) {
          tokenTransferSim = { ok: false, error: e?.message || String(e) };
        }
      }

      // callStatic do buy
      let callStaticBuy = null;
      try {
        // Só chama se tivermos bnbPrice calculado; caso contrário, evita erro genérico do provider
        if (totalCost) {
          callStaticBuy = await withTimeout(sale.callStatic.buy(qty, { from: buyer, value: totalCost }), 10000, "sale.buy(static)");
        } else {
          callStaticBuy = { skipped: true, reason: "bnbPrice indisponível" };
        }
      } catch (e) {
        callStaticBuy = { error: e?.message || String(e) };
      }

      const checks = {
        saleAddr,
        qty,
        saleToken: saleTokenAddr,
        tokenDecimals: tokenDecimals,
        destinationWallet: destWallet,
        destinationIsContract: destWallet ? await isContract(destWallet, readProv) : null,
        destinationAcceptsBNB: destTest,
        bnbPrice: bnbPrice ? bnbPrice.toString() : null,
        perWalletCap: perWalletCap ? perWalletCap.toString() : null,
        alreadyPurchased: alreadyPurchased ? alreadyPurchased.toString() : null,
        tokenBalance: tokenBalance ? tokenBalance.toString() : null,
        totalCost: totalCost ? totalCost.toString() : null,
        tokenTransferSim,
        callStaticBuy,
      };

      const problems = [];
      if (!bnbPrice) problems.push("bnbPrice() ausente ou falhou");
      if (bnbPrice && bnbPrice.eq(0)) problems.push("bnbPrice está 0 — confirme configuração");
      if (!saleTokenAddr) problems.push("saleToken() ausente — não é possível verificar saldo");
      if (tokenBalance && tokenBalance.lt(qty)) problems.push("Saldo de tokens insuficiente no contrato");
      if (perWalletCap && !perWalletCap.eq(0) && alreadyPurchased && alreadyPurchased.add(qty).gt(perWalletCap)) problems.push("Limite por carteira excedido");
      if (destTest && !destTest.ok) problems.push("destinationWallet pode não aceitar BNB/tBNB");
      if (tokenTransferSim && !tokenTransferSim.ok) problems.push("Transferência de token (contrato -> comprador) falharia");
      if (callStaticBuy && callStaticBuy.error) problems.push("callStatic.buy reverteu");

      const warnings = [];
      if (!perWalletCap) warnings.push("perWalletCap indisponível — endereço pode ser Proxy ou ABI diferente");
      debug.callStaticBuy = callStaticBuy;
      debug.destinationTest = destTest;
      debug.totalCost = totalCost ? totalCost.toString() : null;
      log({
        compatible: problems.length === 0,
        action: "certifySale-done",
        problems,
        warnings,
        checks,
        debug,
      });
    } catch (e) {
      log({
        error: "Falha na certificação",
        details: e?.message || String(e),
        where: "certifySale",
        rpcUrl: getSelectedRpcUrl(),
      });
    }
  }

  async function buyWithBNB() {
    try {
      await ensureNetworkWallet();
      const saleAddr = String($("#saleAddress").value || "").replace(/\s+$/u, "");
      if (!saleAddr) {
        log({ error: "Informe o endereço do contrato TokenSale" });
        return;
      }
      const qty = Number($("#qty").value || 1);
      if (qty <= 0) {
        log({ error: "Quantidade inválida" });
        return;
      }
      const buyBtn = $("#buyBtn");
      if (buyBtn) {
        buyBtn.disabled = true;
        buyBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Comprando...';
      }

      const sale = new ethers.Contract(saleAddr, TOKEN_SALE_ABI, signer);
      let bnbPrice = null;
      try {
        bnbPrice = await withTimeout(sale.bnbPrice(), 8000, "bnbPrice");
      } catch (_) {}
      if (!bnbPrice) {
        log({
          error: "bnbPrice indisponível — confirme se o endereço é do TokenSale (não Proxy)",
        });
        if (buyBtn) {
          buyBtn.disabled = false;
          buyBtn.innerHTML = '<i class="bi bi-cash-coin me-2"></i> Comprar com tBNB';
        }
        return;
      }

      // Detectar unidades: tentar qty em inteiro e em unidades (decimals)
      let saleTokenAddr = null,
        tokenDecimals = 18,
        qtyUnits = null;
      try {
        saleTokenAddr = await withTimeout(sale.saleToken(), 8000, "saleToken");
        if (saleTokenAddr && saleTokenAddr !== ethers.constants.AddressZero) {
          const { prov: readProv } = await pickResponsiveRpc(5000);
          const erc20 = new ethers.Contract(saleTokenAddr, ERC20_ABI, readProv);
          try {
            tokenDecimals = await withTimeout(erc20.decimals(), 8000, "decimals");
          } catch (_) {}
        }
      } catch (_) {}
      try {
        const tenPow = ethers.BigNumber.from(10).pow(tokenDecimals || 18);
        qtyUnits = ethers.BigNumber.from(qty).mul(tenPow);
      } catch (_) {
        qtyUnits = null;
      }

      // Cenário A: qty inteiro
      const totalA = bnbPrice.mul(ethers.BigNumber.from(qty));
      // Cenário B: qty em unidades
      const totalB = qtyUnits ? bnbPrice.mul(qtyUnits) : null;
      // Não definir totalCost ainda; vamos escolher cenários primeiro

      // Pré-verificação: tentar A, se falhar tentar B
      let chosenQty = ethers.BigNumber.from(qty);
      let chosenTotal = totalA;
      try {
        await withTimeout(sale.callStatic.buy(chosenQty, { value: chosenTotal }), 8000, "sale.buy(static,A)");
      } catch (eA) {
        if (qtyUnits && totalB) {
          try {
            await withTimeout(sale.callStatic.buy(qtyUnits, { value: totalB }), 10000, "sale.buy(static,B)");
            chosenQty = qtyUnits;
            chosenTotal = totalB;
          } catch (eB) {
            log({
              error: "Falha na compra (static)",
              tryA: eA?.message || String(eA),
              tryB: eB?.message || String(eB),
              debug: {
                qty,
                qtyUnits: qtyUnits?.toString(),
                totalA: totalA.toString(),
                totalB: totalB?.toString(),
                decimals: tokenDecimals,
              },
            });
            if (buyBtn) {
              buyBtn.disabled = false;
              buyBtn.innerHTML = '<i class="bi bi-cash-coin me-2"></i> Comprar com tBNB';
            }
            return;
          }
        } else {
          log({
            error: "Falha na compra (static)",
            details: eA?.message || String(eA),
            debug: { qty, totalA: totalA.toString() },
          });
          if (buyBtn) {
            buyBtn.disabled = false;
            buyBtn.innerHTML = '<i class="bi bi-cash-coin me-2"></i> Comprar com tBNB';
          }
          return;
        }
      }

      // Atualizar total escolhido e checar saldo tBNB do comprador com base no cenário correto
      try {
        const balance = await withTimeout(signer.getBalance(), 6000, "getBalance");
        $("#totalCost").textContent = chosenTotal.toString();
        if (balance.lt(chosenTotal)) {
          log({
            error: "Saldo tBNB insuficiente",
            balance: balance.toString(),
            totalCost: chosenTotal.toString(),
            scenario: chosenQty.eq(qtyUnits) ? "units" : "integer",
          });
          if (buyBtn) {
            buyBtn.disabled = false;
            buyBtn.innerHTML = '<i class="bi bi-cash-coin me-2"></i> Comprar com tBNB';
          }
          return;
        }
      } catch (_) {
        $("#totalCost").textContent = chosenTotal.toString();
      }

      // Checagens prévias adicionais: saldo do contrato e perWalletCap
      try {
        const buyer = await withTimeout(signer.getAddress(), 6000, "getAddress");
        const { prov: readProv } = await pickResponsiveRpc(5000);
        const erc20 = new ethers.Contract(saleTokenAddr, ERC20_ABI, readProv);
        const bal = await withTimeout(erc20.balanceOf(saleAddr), 8000, "balanceOf(contract)");
        const cap = await withTimeout(sale.perWalletCap(), 8000, "perWalletCap");
        const already = await withTimeout(sale.purchasedBy(buyer), 8000, "purchasedBy");
        if (bal.lt(chosenQty)) {
          log({
            error: "Saldo de tokens insuficiente no contrato",
            contractTokenBalance: bal.toString(),
            requested: chosenQty.toString(),
          });
          if (buyBtn) {
            buyBtn.disabled = false;
            buyBtn.innerHTML = '<i class="bi bi-cash-coin me-2"></i> Comprar com tBNB';
          }
          return;
        }
        if (cap && !cap.isZero()) {
          const remaining = cap.sub(already);
          if (chosenQty.gt(remaining)) {
            log({
              error: "Limite por carteira excedido",
              cap: cap.toString(),
              already: already.toString(),
              remaining: remaining.toString(),
              requested: chosenQty.toString(),
            });
            if (buyBtn) {
              buyBtn.disabled = false;
              buyBtn.innerHTML = '<i class="bi bi-cash-coin me-2"></i> Comprar com tBNB';
            }
            return;
          }
        }
      } catch (_) {}

      // Estimar gas; se falhar, usar fallback seguro
      let gasLimit = null;
      try {
        const estimated = await withTimeout(sale.estimateGas.buy(chosenQty, { value: chosenTotal }), 8000, "estimateGas");
        gasLimit = estimated.mul(120).div(100);
      } catch (e) {
        gasLimit = ethers.BigNumber.from(250000);
        log({
          warn: "estimateGas falhou; usando gasLimit=250000",
          details: e?.message || String(e),
          link: "https://links.ethers.org/v5-errors-UNPREDICTABLE_GAS_LIMIT",
        });
      }

      const tx = await sale.buy(chosenQty, { value: chosenTotal, gasLimit });
      const receipt = await tx.wait(1);
      if (receipt.status !== 1) {
        log({ error: "Transação revertida", receipt });
      } else {
        try {
          const buyer = await signer.getAddress();
          const { prov: readProv } = await pickResponsiveRpc(5000);
          let buyerTokenBal = null,
            contractTokenBal = null;
          if (saleTokenAddr && saleTokenAddr !== ethers.constants.AddressZero) {
            const erc20 = new ethers.Contract(saleTokenAddr, ERC20_ABI, readProv);
            buyerTokenBal = await withTimeout(erc20.balanceOf(buyer), 8000, "balanceOf(buyer,post)");
            contractTokenBal = await withTimeout(erc20.balanceOf(saleAddr), 8000, "balanceOf(contract,post)");
            const elBuyer = document.getElementById("buyerTokenBalance");
            if (elBuyer) elBuyer.textContent = buyerTokenBal.toString();
            const elContract = document.getElementById("contractTokenBalance");
            if (elContract) elContract.textContent = contractTokenBal.toString();
          }
          // atualizar já comprados
          try {
            const purchased = await withTimeout(sale.purchasedBy(buyer), 8000, "purchasedBy(post)");
            const el = document.getElementById("alreadyPurchased");
            if (el) el.textContent = purchased.toString();
          } catch (_) {}
          // resumo
          const resumo = {
            ok: true,
            action: "buy-done",
            txHash: tx.hash,
            paidWei: chosenTotal.toString(),
            paidBNB: ethers.utils.formatEther(chosenTotal),
            qtyRequested: String(qty),
            qtySent: chosenQty.toString(),
            scenario: chosenQty.eq(qtyUnits) ? "units" : "integer",
            tokenDecimals,
            buyerTokenBalance: buyerTokenBal ? buyerTokenBal.toString() : null,
            contractTokenBalance: contractTokenBal ? contractTokenBal.toString() : null,
            receipt,
          };
          log(resumo);
          try {
            const container = document.querySelector(".container, .container-fluid") || document.body;
            const symbol = document.getElementById("currencySymbol")?.textContent || "BNB";
            if (typeof window.notify === "function") {
              window.notify(`Compra confirmada. Tx: <a href=\"#\" class=\"text-decoration-underline\">${tx.hash}</a>. Pago: ${ethers.utils.formatEther(chosenTotal)} ${symbol}.`, "success", { container });
            } else {
              console.log("Compra confirmada", tx.hash);
            }
          } catch (_) {}
        } catch (_) {
          log({
            ok: true,
            action: "buyWithBNB",
            txHash: tx.hash,
            receipt,
            debug: {
              qty,
              qtyUnits: qtyUnits?.toString(),
              chosenQty: chosenQty.toString(),
              chosenTotal: chosenTotal.toString(),
            },
          });
        }
      }
      if (buyBtn) {
        buyBtn.disabled = false;
        buyBtn.innerHTML = '<i class="bi bi-cash-coin me-2"></i> Comprar com tBNB';
      }
    } catch (e) {
      log({
        error: "Falha na compra com BNB",
        details: e?.message || String(e),
      });
      const buyBtn = $("#buyBtn");
      if (buyBtn) {
        buyBtn.disabled = false;
        buyBtn.innerHTML = '<i class="bi bi-cash-coin me-2"></i> Comprar com tBNB';
      }
    }
  }

  function bindUI() {
    const connectBtn = $("#connectBtn");
    const readBtn = $("#readBtn");
    const certifyBtn = $("#certifyBtn");
    const buyBtn = $("#buyBtn");
    const copySaleAddressBtn = $("#copySaleAddressBtn");
    const copySaleTokenBtn = $("#copySaleTokenBtn");
    const copyDestWalletBtn = $("#copyDestWalletBtn");

    connectBtn?.addEventListener("click", () => {
      log({ event: "click", target: "connectBtn" });
      connectWallet();
    });
    readBtn?.addEventListener("click", async () => {
      log({ event: "click", target: "readBtn" });
      try {
        if (readBtn) {
          readBtn.disabled = true;
          readBtn.classList.add("tc-btn-disabled");
          readBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Lendo...';
        }
        await readSale();
      } finally {
        if (readBtn) {
          readBtn.disabled = false;
          readBtn.classList.remove("tc-btn-disabled");
          readBtn.innerHTML = '<i class="bi bi-search me-2"></i>Ler dados do contrato';
        }
      }
    });
    certifyBtn?.addEventListener("click", async () => {
      const qty = Number($("#qty").value || 1);
      log({ event: "click", target: "certifyBtn", qty });
      try {
        if (certifyBtn) {
          certifyBtn.disabled = true;
          certifyBtn.classList.add("tc-btn-disabled");
          certifyBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Certificando...';
        }
        await certifySale(qty);
      } finally {
        if (certifyBtn) {
          certifyBtn.disabled = false;
          certifyBtn.classList.remove("tc-btn-disabled");
          certifyBtn.innerHTML = '<i class="bi bi-shield-check me-2"></i>Certificar contrato (tBNB)';
        }
      }
    });
    buyBtn?.addEventListener("click", () => {
      log({ event: "click", target: "buyBtn" });
      buyWithBNB();
    });

    if (copySaleAddressBtn) {
      copySaleAddressBtn.addEventListener("click", () => {
        try {
          const val = $("#saleAddress")?.value || "";
          if (val && window.copyToClipboard) {
            window.copyToClipboard(val);
          }
        } catch (_) {}
      });
    }
    if (copySaleTokenBtn) {
      copySaleTokenBtn.addEventListener("click", () => {
        try {
          const el = $("#saleToken");
          const val = el?.innerText || el?.textContent || "";
          if (val && window.copyToClipboard) {
            window.copyToClipboard(val);
          }
        } catch (_) {}
      });
    }
    if (copyDestWalletBtn) {
      copyDestWalletBtn.addEventListener("click", () => {
        try {
          const el = $("#destWallet");
          const val = el?.innerText || el?.textContent || "";
          if (val && window.copyToClipboard) {
            window.copyToClipboard(val);
          }
        } catch (_) {}
      });
    }

    // Bind evento para Limpar Dados - REMOVIDO: Usar global btnClearAll

    // Integrar eventos de seleção de rede
    document.addEventListener("network:selected", (ev) => {
      const net = ev?.detail?.network;
      if (!net) return;
      const sel = $("#blockchain");
      if (sel) sel.value = String(net.chainId);
      const symSpan = $("#currencySymbol");
      if (symSpan && net?.nativeCurrency?.symbol) symSpan.textContent = net.nativeCurrency.symbol;
      window.__selectedNetwork = net;
    });
    document.addEventListener("network:clear", () => {
      const sel = $("#blockchain");
      if (sel) sel.value = "";
      window.__selectedNetwork = null;
    });
  }

  function init() {
    bindUI();
    // Diagnóstico: elementos presentes
    try {
      log({
        status: "ui-bound",
        elements: {
          connectBtn: !!$("#connectBtn"),
          readBtn: !!$("#readBtn"),
          certifyBtn: !!$("#certifyBtn"),
          buyBtn: !!$("#buyBtn"),
          saleAddressInput: !!$("#saleAddress"),
          logOutput: !!$("#output"),
        },
      });
    } catch (_) {}
    // Pré-preencher dados conhecidos para facilitar teste local
    try {
      window.__selectedNetwork = {
        chainId: REQUIRED_CHAIN_ID,
        nativeCurrency: { symbol: "tBNB" },
      };
      $("#blockchain").value = String(REQUIRED_CHAIN_ID);
      $("#currencySymbol").textContent = "tBNB";
    } catch (_) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    // DOM já carregado (live-reload pode disparar depois do evento)
    init();
  }
})();

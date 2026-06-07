/**
 * contract-interact.js
 * Funções compartilhadas para interação com contratos EVM (Ler / Escrever).
 * Usado por: verifica (contract-search.js) e token-admin (token-admin-index.js)
 */

import { getFallbackRpc } from "./network-fallback.js";
import { networkManager } from "./network-manager.js";

// -----------------------------------------------------------------------------
// Formatação de resultado
// -----------------------------------------------------------------------------

export function formatReadResult(value) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "bigint" || value?._isBigNumber) {
    const s = value.toString();
    if (s.length > 15) {
      try {
        const dec = window.ethers?.utils?.formatUnits?.(value, 18) || s;
        return `${dec} (raw: ${s})`;
      } catch (_) { return s; }
    }
    return s;
  }
  if (Array.isArray(value)) return value.map(formatReadResult).join(", ");
  if (typeof value === "boolean") return value ? "✓ true" : "✗ false";
  if (typeof value === "object") {
    try { return JSON.stringify(value, (_, v) => typeof v === "bigint" ? v.toString() : v); } catch (_) {}
  }
  return String(value);
}

// -----------------------------------------------------------------------------
// Resolução de hint para funções sem inputs que revertam
// -----------------------------------------------------------------------------

function resolveHint(fnName, hints) {
  if (!hints) return null;
  const n = fnName.toLowerCase().replace(/^get/, "").replace(/original/g, "");
  if (n.includes("name"))    return hints.tokenName    ? String(hints.tokenName)    : null;
  if (n.includes("symbol"))  return hints.tokenSymbol  ? String(hints.tokenSymbol)  : null;
  if (n.includes("supply"))  return hints.tokenSupply  ? String(hints.tokenSupply)  : null;
  if (n.includes("decimal")) return hints.tokenDecimals != null ? String(hints.tokenDecimals) : null;
  return null;
}

// -----------------------------------------------------------------------------
// Construção de input de parâmetro
// -----------------------------------------------------------------------------

export function buildInputRow(input, idx) {
  const name = input.name || `param${idx}`;
  const type = input.type || "string";
  return `<input type="text" class="tc-field-input tc-field-input--mono cs-fn-input" data-idx="${idx}" placeholder="${name} (${type})" style="font-size:0.8rem">`;
}

// -----------------------------------------------------------------------------
// Chamada via eth_call (sem provider ethers, sem ENS)
// -----------------------------------------------------------------------------

export async function callReadFunction(rpcUrl, address, abiFragment, inputValues) {
  const ethers = window.ethers;
  if (!ethers) throw new Error("ethers.js não disponível");
  if (!rpcUrl) throw new Error("RPC não disponível para esta rede");

  const iface = new ethers.utils.Interface([abiFragment]);
  const data = iface.encodeFunctionData(abiFragment.name, inputValues);

  const resp = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "eth_call", params: [{ to: address, data }, "latest"], id: 1 }),
  });
  const js = await resp.json();

  // Revert sem razão ou erro do nó → retorna null (sem dados)
  if (js.error) {
    const msg = String(js.error.message || "").toLowerCase();
    if (msg.includes("revert") || msg.includes("execution")) return null;
    throw new Error(js.error.message || "Erro RPC");
  }

  const raw = js.result;
  if (!raw || raw === "0x") return null;

  try {
    const decoded = iface.decodeFunctionResult(abiFragment.name, raw);
    return decoded.length === 1 ? decoded[0] : decoded;
  } catch (_) {
    return null;
  }
}

// -----------------------------------------------------------------------------
// Card de função de leitura
// -----------------------------------------------------------------------------

export function buildReadFunctionCard(abiFragment, address, rpcUrl, hints = null) {
  const inputs = abiFragment.inputs || [];
  const hasInputs = inputs.length > 0;

  const card = document.createElement("div");
  card.className = "cs-fn-card p-3";
  card.style.cssText = "background:var(--card-bg-secondary,#161b22);border:1px solid var(--border-subtle,#30363d);border-radius:8px";

  const inputsHtml = inputs.map(buildInputRow).join("");
  card.innerHTML = `
    <div class="d-flex align-items-center justify-content-between gap-2 mb-${hasInputs ? "2" : "0"}">
      <span class="tc-data-value--mono" style="font-size:0.85rem;font-weight:600">${abiFragment.name}</span>
      <button type="button" class="tc-btn-secondary-ds cs-fn-query-btn" style="font-size:0.75rem;padding:3px 10px">
        <i class="bi bi-play-fill me-1"></i>Consultar
      </button>
    </div>
    ${hasInputs ? `<div class="d-flex flex-column gap-1 mb-2">${inputsHtml}</div>` : ""}
    <div class="cs-fn-result d-none" style="font-size:0.8rem;color:var(--text-muted,#8b949e);margin-top:6px;word-break:break-all"></div>
  `;

  const queryBtn = card.querySelector(".cs-fn-query-btn");
  const resultDiv = card.querySelector(".cs-fn-result");

  queryBtn.addEventListener("click", async () => {
    const paramInputEls = Array.from(card.querySelectorAll(".cs-fn-input"));
    const paramInputs = paramInputEls.map(el => el.value.trim());

    const emptyIdx = inputs.findIndex((_, i) => paramInputs[i] === "");
    if (emptyIdx !== -1) {
      resultDiv.classList.remove("d-none");
      resultDiv.style.color = "#e3b341";
      resultDiv.textContent = `Preencha: "${inputs[emptyIdx]?.name || `param${emptyIdx}`}" (${inputs[emptyIdx]?.type || "?"})`;
      return;
    }

    queryBtn.disabled = true;
    queryBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;
    resultDiv.classList.remove("d-none");
    resultDiv.style.color = "var(--text-muted,#8b949e)";
    resultDiv.textContent = "Consultando...";
    try {
      const value = await callReadFunction(rpcUrl, address, abiFragment, paramInputs);
      if (value === null || value === undefined) {
        const hint = resolveHint(abiFragment.name, hints);
        if (hint !== null) {
          resultDiv.style.color = "#58a6ff";
          resultDiv.textContent = hint;
        } else {
          resultDiv.style.color = "var(--text-muted,#8b949e)";
          resultDiv.textContent = "—";
        }
      } else {
        resultDiv.style.color = "#58a6ff";
        resultDiv.textContent = formatReadResult(value);
      }
    } catch (e) {
      resultDiv.style.color = "#f85149";
      resultDiv.textContent = `Erro: ${e?.reason || e?.message || String(e)}`;
    } finally {
      queryBtn.disabled = false;
      queryBtn.innerHTML = `<i class="bi bi-play-fill me-1"></i>Consultar`;
    }
  });

  if (!hasInputs) setTimeout(() => queryBtn.click(), 100 + Math.random() * 300);

  return card;
}

// -----------------------------------------------------------------------------
// Card de função de escrita
// -----------------------------------------------------------------------------

export function buildWriteFunctionCard(abiFragment, address) {
  const inputs = abiFragment.inputs || [];
  const isPayable = abiFragment.stateMutability === "payable";

  const card = document.createElement("div");
  card.className = "cs-fn-card p-3";
  card.style.cssText = "background:var(--card-bg-secondary,#161b22);border:1px solid var(--border-subtle,#30363d);border-radius:8px";

  const inputsHtml = inputs.map(buildInputRow).join("");
  const valueRow = isPayable
    ? `<input type="text" class="tc-field-input tc-field-input--mono cs-fn-value" placeholder="Valor em ETH/BNB (payable)" style="font-size:0.8rem">`
    : "";

  card.innerHTML = `
    <div class="d-flex align-items-center justify-content-between gap-2 mb-${inputs.length || isPayable ? "2" : "0"}">
      <span class="tc-data-value--mono" style="font-size:0.85rem;font-weight:600">${abiFragment.name}</span>
      ${isPayable ? '<span class="tc-badge-warning" style="font-size:0.7rem">payable</span>' : ""}
      <button type="button" class="tc-btn-primary-ds cs-fn-write-btn" style="font-size:0.75rem;padding:3px 10px;margin-left:auto">
        <i class="bi bi-send me-1"></i>Enviar
      </button>
    </div>
    ${inputs.length ? `<div class="d-flex flex-column gap-1 mb-2">${inputsHtml}</div>` : ""}
    ${valueRow ? `<div class="mb-2">${valueRow}</div>` : ""}
    <div class="cs-fn-result d-none" style="font-size:0.8rem;margin-top:6px;word-break:break-all"></div>
  `;

  const writeBtn = card.querySelector(".cs-fn-write-btn");
  const resultDiv = card.querySelector(".cs-fn-result");

  writeBtn.addEventListener("click", async () => {
    const ethers = window.ethers;
    if (!ethers || !window.ethereum) {
      resultDiv.classList.remove("d-none");
      resultDiv.style.color = "#f85149";
      resultDiv.textContent = "Conecte o MetaMask para enviar transações.";
      return;
    }
    writeBtn.disabled = true;
    writeBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;
    resultDiv.classList.remove("d-none");
    resultDiv.style.color = "var(--text-muted,#8b949e)";
    resultDiv.textContent = "Aguardando confirmação na carteira...";
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(address, [abiFragment], signer);
      const paramInputs = Array.from(card.querySelectorAll(".cs-fn-input")).map(el => el.value.trim());
      const opts = {};
      const valInput = card.querySelector(".cs-fn-value");
      if (isPayable && valInput?.value?.trim()) {
        opts.value = ethers.utils.parseEther(valInput.value.trim());
      }
      const tx = await contract[abiFragment.name](...paramInputs, opts);
      resultDiv.style.color = "#3fb950";
      resultDiv.textContent = `Tx enviada: ${tx.hash}`;
    } catch (e) {
      resultDiv.style.color = "#f85149";
      resultDiv.textContent = `Erro: ${e?.reason || e?.message || String(e)}`;
    } finally {
      writeBtn.disabled = false;
      writeBtn.innerHTML = `<i class="bi bi-send me-1"></i>Enviar`;
    }
  });

  return card;
}

// -----------------------------------------------------------------------------
// Popula as abas de interação num container genérico
// -----------------------------------------------------------------------------

/**
 * @param {object} opts
 * @param {*}      opts.abiRaw         - ABI (string JSON ou array)
 * @param {number} opts.chainId
 * @param {string} opts.address        - Endereço do contrato
 * @param {HTMLElement} opts.readContainer   - div onde os cards de leitura são inseridos
 * @param {HTMLElement} opts.writeContainer  - div onde os cards de escrita são inseridos
 * @param {HTMLElement} opts.interactSection - container pai (removido d-none ao popular)
 * @param {HTMLElement} [opts.writeNotice]   - aviso de wallet não conectada (opcional)
 * @param {object}     [opts.ownerCheck]    - resultado de checkOwnership {isOwner, ownerAddress, message}
 * @param {object}     [opts.tokenHints]    - dados do token (tokenName, tokenSymbol, tokenSupply, tokenDecimals) para fallback
 */
export async function populateContractInteract({ abiRaw, chainId, address, readContainer, writeContainer, interactSection, writeNotice, ownerCheck, tokenHints }) {
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) return;
  if (!readContainer || !writeContainer) return;

  let abiParsed = [];
  try {
    abiParsed = typeof abiRaw === "string" ? JSON.parse(abiRaw) : Array.isArray(abiRaw) ? abiRaw : [];
  } catch (_) { return; }

  const readFns  = abiParsed.filter(x => x.type === "function" && (x.stateMutability === "view" || x.stateMutability === "pure"));
  const writeFns = abiParsed.filter(x => x.type === "function" && (x.stateMutability === "nonpayable" || x.stateMutability === "payable"));

  if (!readFns.length && !writeFns.length) return;

  let rpcUrl = "";
  try { rpcUrl = await getFallbackRpc(chainId) || ""; } catch (_) {}
  if (!rpcUrl) {
    try { rpcUrl = networkManager?.getRpcUrl?.(chainId) || ""; } catch (_) {}
  }

  readContainer.innerHTML = "";
  writeContainer.innerHTML = "";

  if (readFns.length && rpcUrl) {
    readFns.forEach(fn => readContainer.appendChild(buildReadFunctionCard(fn, address, rpcUrl, tokenHints)));
  } else if (readFns.length) {
    readContainer.innerHTML = `<p class="tc-note">RPC indisponível para esta rede.</p>`;
  } else {
    readContainer.innerHTML = `<p class="tc-note">Nenhuma função de leitura encontrada.</p>`;
  }

  if (writeFns.length) {
    if (ownerCheck?.isOwner === false) {
      writeContainer.innerHTML = `
        <div class="tc-warning-box">
          <i class="bi bi-shield-lock-fill me-2 tc-warning-box-icon"></i>
          <div>
            <strong>Sem permissão</strong>
            <p class="mb-0 mt-1">${ownerCheck.message || "Você não é o proprietário deste contrato."}</p>
            ${ownerCheck.ownerAddress ? `<p class="mb-0 mt-1 tc-note">Proprietário: <code>${ownerCheck.ownerAddress}</code></p>` : ""}
          </div>
        </div>`;
    } else {
      if (!window.ethereum && writeNotice) writeNotice.classList.remove("d-none");
      writeFns.forEach(fn => writeContainer.appendChild(buildWriteFunctionCard(fn, address)));
    }
  } else {
    writeContainer.innerHTML = `<p class="tc-note">Nenhuma função de escrita encontrada.</p>`;
  }

  if (interactSection) interactSection.classList.remove("d-none");
}

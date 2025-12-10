(function () {
  const $ = (sel) => document.querySelector(sel);
  const output = $("#output");

  const log = (obj) => {
    try {
      output.textContent = JSON.stringify(obj, null, 2);
    } catch (e) {
      output.textContent = String(obj);
    }
  };

  async function connect() {
    if (!window.ethereum) {
      log({ error: "MetaMask não detectado" });
      return;
    }
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    $("#accountLabel").textContent = `Carteira: ${accounts[0]}`;
    log({ status: "connected", account: accounts[0] });
  }

  function toWeiFromEth(ethStr) {
    const val = Number(ethStr) || 0;
    const wei = BigInt(Math.round(val * 1e6)) * 10_000000000000n; // aproximação simples
    return "0x" + wei.toString(16);
  }

  async function buy() {
    const beneficiary = String($("#beneficiary").value || "").replace(/\s+$/u, "");
    const qty = Number($("#qty").value || 1);
    const priceEth = $("#priceEth").value || "0";
    if (!beneficiary) {
      log({ error: "Informe o beneficiário" });
      return;
    }
    if (!window.ethereum) {
      log({ error: "MetaMask não detectado" });
      return;
    }

    const valueWeiHex = toWeiFromEth(priceEth);
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    const from = accounts[0];

    try {
      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [{ from, to: beneficiary, value: valueWeiHex }],
      });
      log({
        status: "enviado",
        to: beneficiary,
        qty,
        valueEth: priceEth,
        txHash,
      });
    } catch (err) {
      log({
        error: "Falha ao enviar transação",
        details: err?.message || String(err),
      });
    }
  }

  $("#connectBtn").addEventListener("click", connect);
  $("#buyBtn").addEventListener("click", buy);
})();

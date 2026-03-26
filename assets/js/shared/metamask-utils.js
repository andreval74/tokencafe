export async function addTokenToMetaMask({ address, symbol, decimals, image }) {
  try {
    const addr = String(address || "").replace(/\s+$/u, "");
    if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) throw new Error("Endereço inválido");
    const sym = (symbol || "TKN").toString().toUpperCase().slice(0, 12);
    const dec = Number.isFinite(decimals) ? Number(decimals) : 18;
    const img = String(image || "").replace(/\s+$/u, "");
    if (!window.ethereum) throw new Error("Carteira não detectada");
    const res = await window.ethereum.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: { address: addr, symbol: sym, decimals: dec, image: img },
      },
    });
    return { success: !!res };
  } catch (e) {
    return { success: false, error: e?.message || String(e) };
  }
}

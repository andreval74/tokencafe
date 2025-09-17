module.exports = {
  enviarUSDT(pixId, valorBRL, rede) {
    const usdt = (valorBRL / 5).toFixed(2); // taxa fictícia 1 USDT = 5 BRL
    return {
      status: "success",
      pixId,
      usdt,
      rede,
      carteiraDestino: "0x0b81337F18767565D2eA40913799317A25DC4bc5",
      txHash: "0x" + Math.random().toString(16).substring(2, 66)
    };
  }
};

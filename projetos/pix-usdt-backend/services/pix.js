module.exports = {
  criarCobranca(valorBRL, rede) {
    return {
      id: "pix_" + Date.now(),
      valorBRL,
      rede,
      payload: `00020126480014BR.GOV.BCB.PIX0114+554199999999520400005303986540${valorBRL}5802BR5913Demo Empresa6009SAO PAULO`
    };
  }
};

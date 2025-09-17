const express = require("express");
const bodyParser = require("body-parser");
const pixService = require("./services/pix");
const blockchainService = require("./services/blockchain");

const app = express();
app.use(bodyParser.json());

// Rota para gerar cobrança PIX
app.post("/api/pix/charge", (req, res) => {
  const { valorBRL, rede } = req.body;
  const charge = pixService.criarCobranca(valorBRL, rede);
  res.json(charge);
});

// Webhook (simulação de pagamento confirmado)
app.post("/api/pix/webhook", (req, res) => {
  const { pixId, valorBRL, rede } = req.body;
  const tx = blockchainService.enviarUSDT(pixId, valorBRL, rede);
  res.json(tx);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend demo rodando em http://localhost:${PORT}`);
});

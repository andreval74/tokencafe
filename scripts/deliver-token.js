#!/usr/bin/env node
// Automação de entrega de tokens off-chain após pagamento confirmado
// Uso:
//  - Com recibo (JSON copiado do widget):
//    node scripts/deliver-token.js --receipt receipts/compra.json
//  - Sem recibo (passando argumentos):
//    node scripts/deliver-token.js --buyer 0x... --qty 100 --currency TBNB --tx 0x... --totalWei 100000000000000000
//    node scripts/deliver-token.js --buyer 0x... --qty 100 --currency USDT --tx 0x... --totalUnits 25000000

const fs = require("fs");
const path = require("path");
require("dotenv").config();
const { ethers } = require("ethers");

function parseArgs() {
  const argv = process.argv.slice(2);
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.replace(/^--/, "");
      const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : true;
      args[key] = val;
      if (val !== true) i++;
    }
  }
  return args;
}

const READ_RPC = process.env.READ_RPC || "https://bsc-testnet.publicnode.com";
const DEST_WALLET = (process.env.DEST_WALLET || "").trim();
const TOKEN_ADDR = (process.env.TOKEN_ADDR || "").trim();
const USDT_ADDR = (process.env.USDT_ADDR || "").trim(); // obrigatório se operar USDT
const PRIVATE_KEY = (process.env.PRIVATE_KEY || "").trim();

if (!PRIVATE_KEY || !TOKEN_ADDR || !DEST_WALLET) {
  console.error("[ERRO] Configure .env com PRIVATE_KEY, TOKEN_ADDR e DEST_WALLET. Opcional: READ_RPC, USDT_ADDR");
  process.exit(1);
}

const provider = new ethers.providers.JsonRpcProvider(READ_RPC);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const erc20Abi = ["event Transfer(address indexed from, address indexed to, uint256 value)", "function transfer(address to, uint256 amount) returns (bool)", "function decimals() view returns (uint8)"];

async function verifyPayment(receiptData) {
  const txHash = receiptData.txHash;
  const currency = receiptData.currency;
  if (!txHash) throw new Error("txHash ausente no recibo");
  const tx = await provider.getTransaction(txHash);
  const rec = await provider.getTransactionReceipt(txHash);
  if (!rec || rec.status !== 1) throw new Error("Transação não encontrada ou falhou");

  if (currency === "TBNB") {
    if (!tx.to || tx.to.toLowerCase() !== DEST_WALLET.toLowerCase()) throw new Error("BNB não foi enviado à carteira destino");
    const expected = ethers.BigNumber.from(receiptData.totalWei);
    if (!tx.value.eq(expected)) throw new Error("Valor BNB divergente do esperado");
    return true;
  } else if (currency === "USDT") {
    if (!USDT_ADDR) throw new Error("USDT_ADDR não configurado no .env");
    const iface = new ethers.utils.Interface(erc20Abi);
    const parsedLogs = rec.logs
      .map((l) => {
        try {
          return iface.parseLog(l);
        } catch (_) {
          return null;
        }
      })
      .filter(Boolean);
    const transferToDest = parsedLogs.find((ev) => ev.name === "Transfer" && ev.args.to.toLowerCase() === DEST_WALLET.toLowerCase());
    if (!transferToDest) throw new Error("Não foi detectado Transfer de USDT para a carteira destino");
    const expected = ethers.BigNumber.from(receiptData.totalUnits);
    if (!transferToDest.args.value.eq(expected)) throw new Error("Valor USDT divergente do esperado");
    return true;
  } else {
    throw new Error("Moeda não suportada: " + currency);
  }
}

async function deliverTokens(receiptData) {
  const buyer = receiptData.buyer;
  const qty = Number(receiptData.qty || 0);
  if (!buyer || !qty) throw new Error("buyer/qty inválidos no recibo");
  const token = new ethers.Contract(TOKEN_ADDR, erc20Abi, wallet);
  const decimals = await token.decimals();
  const amount = ethers.utils.parseUnits(String(qty), decimals);
  let gasLimit;
  try {
    gasLimit = await token.estimateGas.transfer(buyer, amount);
  } catch {
    gasLimit = ethers.BigNumber.from("70000");
  }
  const tx = await token.transfer(buyer, amount, { gasLimit });
  const rc = await tx.wait();
  console.log("[OK] Tokens entregues", {
    buyer,
    qty,
    txHash: rc.transactionHash,
  });
}

(async () => {
  try {
    const args = parseArgs();
    let receipt;
    if (args.receipt) {
      const p = path.resolve(String(args.receipt));
      receipt = JSON.parse(fs.readFileSync(p, "utf-8"));
    } else {
      receipt = {
        buyer: args.buyer,
        qty: Number(args.qty || 0),
        currency: args.currency,
        txHash: args.tx,
        totalWei: args.totalWei,
        totalUnits: args.totalUnits,
      };
    }

    if (!receipt || !receipt.buyer || !receipt.qty || !receipt.currency || !receipt.txHash) {
      throw new Error("Recibo inválido. Campos necessários: buyer, qty, currency, txHash");
    }

    await verifyPayment(receipt);
    await deliverTokens(receipt);
  } catch (e) {
    console.error("[ERRO]", e?.message || String(e));
    process.exit(1);
  }
})();

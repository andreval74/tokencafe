/**
 * Deploy TokenCafeFactory
 *
 * Uso:
 *   npx hardhat run scripts/deploy-factory.js --network <rede>
 *
 * Variáveis de ambiente (.env):
 *   DEPLOYER_PRIVATE_KEY   — chave privada do deployer (sem 0x)
 *   PLATFORM_WALLET        — endereço que recebe as taxas
 *   BASE_PRICE_WEI         — preço base em wei (padrão: 10000000000000000 = 0.01 ETH)
 *   VERIFY_CONTRACT        — "true" para verificar no Etherscan/Polygonscan
 */

require("dotenv").config();
const hre    = require("hardhat");
const ethers = hre.ethers;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`\nDeployando TokenCafeFactory com a conta: ${deployer.address}`);

  const network = await ethers.provider.getNetwork();
  console.log(`Rede: ${network.name} (chainId ${network.chainId})`);

  // ── Parâmetros ──────────────────────────────────────────────────────────────
  const platformWallet = process.env.PLATFORM_WALLET || deployer.address;
  const basePrice      = BigInt(process.env.BASE_PRICE_WEI || "10000000000000000"); // 0.01 ETH padrão

  console.log(`\nParâmetros:`);
  console.log(`  platformWallet : ${platformWallet}`);
  console.log(`  basePrice      : ${ethers.formatEther(basePrice)} ETH (${basePrice} wei)`);

  // ── Deploy ──────────────────────────────────────────────────────────────────
  const Factory = await ethers.getContractFactory("TokenCafeFactory");
  console.log("\nDeployando...");

  const factory = await Factory.deploy(platformWallet, basePrice);
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log(`\nTokenCafeFactory deployado em: ${factoryAddress}`);
  console.log(`TokenCafeERC20 (template compilado internamente pelo factory)`);

  // ── Verificação on-chain ────────────────────────────────────────────────────
  const chainId = Number(network.chainId);
  console.log(`\n──────────────────────────────────────────────────────────────`);
  console.log(`Adicione ao factory-config.js:`);
  console.log(`  ${chainId}: "${factoryAddress}",`);
  console.log(`──────────────────────────────────────────────────────────────`);

  // ── Verificação no Explorer (opcional) ────────────────────────────────────
  if (process.env.VERIFY_CONTRACT === "true") {
    console.log("\nAguardando 5 confirmações antes de verificar...");
    const txHash = factory.deploymentTransaction()?.hash;
    if (txHash) {
      await ethers.provider.waitForTransaction(txHash, 5);
    } else {
      await new Promise((r) => setTimeout(r, 15000));
    }

    try {
      await hre.run("verify:verify", {
        address: factoryAddress,
        constructorArguments: [platformWallet, basePrice],
      });
      console.log("Contrato verificado com sucesso!");
    } catch (e) {
      if (e.message.toLowerCase().includes("already verified")) {
        console.log("Contrato já estava verificado.");
      } else {
        console.error("Erro na verificação:", e.message);
      }
    }
  }

  // ── Relatório final ────────────────────────────────────────────────────────
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log(`\nSaldo restante do deployer: ${ethers.formatEther(bal)} ETH`);
  console.log("\nDeploy concluído!");

  return { factoryAddress, chainId };
}

main()
  .then(({ factoryAddress, chainId }) => {
    console.log(`\n✓ Factory: ${factoryAddress} (chain ${chainId})`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

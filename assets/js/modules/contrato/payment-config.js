/**
 * Configuração de Pagamentos do Sistema
 * 
 * Define a carteira recebedora das taxas de serviço e o valor fixo em Dólares.
 * O sistema converterá automaticamente este valor para a criptomoeda nativa da rede
 * no momento do pagamento.
 */

export const PAYMENT_CONFIG = {
    // Endereço da carteira que receberá as taxas de serviço
    // Deve ser uma carteira compatível com EVM (Ethereum, BSC, Polygon, etc.)
    RECEIVER_WALLET: "0x0b81337f18767565d2ea40913799317a25dc4bc5",

    // Valor da taxa de serviço em Dólares Americanos (USD)
    // Ex: 85.00 significa $85,00
    SERVICE_FEE_USD: 25.00,

    // Define se deve cobrar taxa em redes de teste (Testnets)
    // Se true, cobrará o valor equivalente em tokens de teste (sem valor real)
    // Se false, pulará a etapa de pagamento em testnets
    CHARGE_ON_TESTNET: true 
};

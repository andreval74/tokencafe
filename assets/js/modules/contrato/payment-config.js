/**
 * Configuração Central de Pagamentos e Indicações — TokenCafe
 *
 * Todas as variáveis de negócio ficam aqui.
 * Altere este arquivo para ajustar taxas, descontos e comportamentos sem
 * precisar mexer na lógica dos demais módulos.
 */

export const PAYMENT_CONFIG = {

    // ── Carteira recebedora das taxas de serviço ─────────────────────────────
    // Lida de TC_SYSTEM_SETTINGS (painel admin) com fallback hardcoded.
    // Ao alterar a carteira no Painel Admin, o novo endereço é aplicado automaticamente.
    RECEIVER_WALLET: (window.TC_SYSTEM_SETTINGS?.contracts?.platformWallet?.trim() || "0x0b81337f18767565d2ea40913799317a25dc4bc5"),

    // ── Taxa de serviço base (em USD) ────────────────────────────────────────
    // Fallback usado quando nenhum modelo específico está selecionado.
    // Preços por modelo são gerenciados em includes/admin-config.php (PHP)
    // e injetados via window.TOKENCAFE_MODEL_PRICES no carregamento da página.
    SERVICE_FEE_USD: 25.00,

    // ── Preços padrão por modelo (USD) — espelho dos valores PHP ─────────────
    // Estes valores são substituídos pelos de window.TOKENCAFE_MODEL_PRICES em runtime.
    MODEL_PRICES: {
        "erc20-minimal":    25.00,
        "erc20-controls":   35.00,
        "erc20-advanced":   50.00,
        "erc20-directsale": 75.00,
    },

    // ── Cobrar em testnets? ──────────────────────────────────────────────────
    // true  → cobra o equivalente em tokens de teste (sem valor real)
    // false → pula o pagamento em testnets (útil para desenvolvimento)
    CHARGE_ON_TESTNET: true,

    // ── Sistema de Indicação (Referral) ──────────────────────────────────────

    // Lido de TC_SYSTEM_SETTINGS (painel admin → aba Features → Sistema de Indicação).
    // false → o card de indicação fica oculto e nenhum desconto é aplicado.
    REFERRAL_ENABLED: window.TC_SYSTEM_SETTINGS?.features?.referralEnabled !== false,

    // Percentual de desconto concedido ao usuário que foi indicado (sobre SERVICE_FEE_USD).
    // Exemplo: 10 → usuário paga 90% do valor base.
    REFERRAL_DISCOUNT_PERCENT: 10,

    // Percentual de bônus enviado diretamente para a carteira do indicador.
    // Exemplo: 10 → indicador recebe 10% do valor base na hora do deploy.
    REFERRAL_BONUS_PERCENT: 10,

    // Percentual que vai para a plataforma quando há indicação.
    // Deve ser: 100 - REFERRAL_DISCOUNT_PERCENT - REFERRAL_BONUS_PERCENT
    // (calculado automaticamente pelos módulos, mas declarado aqui para documentação)
    // Exemplo: 100 - 10 - 10 = 80%
    REFERRAL_PLATFORM_PERCENT: 80,

    // ── Textos e URL do compartilhamento ────────────────────────────────────

    // URL pública do site (sem barra final). Exibida no modal e nos textos compartilhados.
    SITE_BASE_URL: "https://tokencafe.app",

    // Texto sugerido para compartilhar via WhatsApp / Telegram / redes sociais.
    // {SITE} → URL do site | {CODE} → endereço da carteira do indicador
    // Emojis declarados como escape Unicode para evitar corrupção de encoding do arquivo.
    REFERRAL_SHARE_TEXT: [
        "\u{1F680} *Crie seu token ERC-20 com o TokenCafe!*",
        "",
        "Use meu código de indicação e ganhe *10% de desconto* na criação do seu smart contract:",
        "",
        "\u{1F310} Acesse: {SITE}",
        "\u{1F511} Código: {CODE}",
        "",
        "Na tela de criação, cole meu endereço no campo \"Código de indicação\".",
        "",
        "✅ Deploy rápido e seguro",
        "✅ Múltiplas redes (Ethereum, BSC, Polygon e mais)",
        "✅ Sem precisar saber programar",
        "",
        "#TokenCafe #Web3 #DeFi #Token",
    ].join("\n"),

};

/**
 * Retorna o preço de serviço (USD) para o modelo de contrato selecionado.
 * Prioridade: window.TOKENCAFE_MODEL_PRICES (PHP) → PAYMENT_CONFIG.MODEL_PRICES → SERVICE_FEE_USD
 *
 * @param {string} modelKey - ex: "erc20-minimal", "erc20-advanced"
 * @returns {number} preço em USD
 */
export function getModelPrice(modelKey) {
    const runtimePrices = window.TOKENCAFE_MODEL_PRICES || {};
    if (modelKey && runtimePrices[modelKey] != null) return Number(runtimePrices[modelKey]);
    if (modelKey && PAYMENT_CONFIG.MODEL_PRICES[modelKey] != null) return Number(PAYMENT_CONFIG.MODEL_PRICES[modelKey]);
    return PAYMENT_CONFIG.SERVICE_FEE_USD;
}

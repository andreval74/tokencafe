/**
 * ================================================================================
 * MOCK DATA - DADOS CENTRALIZADOS
 * ================================================================================
 * Dados mock centralizados para desenvolvimento e testes
 * Elimina duplicação entre auth-routes.js e users.js
 * ================================================================================
 */

// ================================================================================
// USUÁRIOS MOCK
// ================================================================================

const mockUsers = [
  {
    id: 1,
    name: "Admin TokenCafe",
    email: "admin@tokencafe.com",
    password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
    role: "admin",
    wallet: "0x742d35Cc6434C0532925a3b8FB7C02d8b03c2d8b",
    createdAt: new Date("2025-01-01"),
    isActive: true,
    lastLogin: new Date("2025-01-15"),
    widgets: 0,
    totalVolume: 0,
    permissions: ["read", "write", "admin", "analytics", "users"],
  },
  {
    id: 2,
    name: "João Silva",
    email: "joao@email.com",
    password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
    role: "user",
    wallet: "0x8f3c1234d4c3b5e6a7f8c9d0e1f2a3b4c5d6e7f8",
    createdAt: new Date("2025-01-05"),
    isActive: true,
    lastLogin: new Date("2025-01-15"),
    widgets: 12,
    totalVolume: 2450000,
    permissions: ["read", "write"],
  },
  {
    id: 3,
    name: "Maria Santos",
    email: "maria@email.com",
    password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
    role: "user",
    wallet: "0x55d3a8b7c9e6d5f4a3b2c1d0e9f8g7h6i5j4k3l2",
    createdAt: new Date("2025-01-08"),
    isActive: true,
    lastLogin: new Date("2025-01-14"),
    widgets: 8,
    totalVolume: 1850000,
    permissions: ["read", "write"],
  },
  {
    id: 4,
    name: "Pedro Costa",
    email: "pedro@email.com",
    password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
    role: "user",
    wallet: "0x9a8b7c6d5e4f3a2b1c0d9e8f7g6h5i4j3k2l1m0n",
    createdAt: new Date("2025-01-10"),
    isActive: false,
    lastLogin: new Date("2025-01-12"),
    widgets: 3,
    totalVolume: 500000,
    permissions: ["read"],
  },
  {
    id: 5,
    name: "Ana Oliveira",
    email: "ana@email.com",
    password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
    role: "moderator",
    wallet: "0x1c2d3e4f5g6h7i8j9k0l1m2n3o4p5q6r7s8t9u0v",
    createdAt: new Date("2025-01-12"),
    isActive: true,
    lastLogin: new Date("2025-01-15"),
    widgets: 15,
    totalVolume: 3200000,
    permissions: ["read", "write", "moderate"],
  },
];

// ================================================================================
// ANALYTICS MOCK
// ================================================================================

const mockAnalytics = {
  dashboardStats: {
    totalUsers: 5,
    activeUsers: 4,
    totalVolume: 8000000,
    totalWidgets: 38,
    growthRate: 15.5,
  },
  userGrowth: [
    { month: "Jan", users: 5, volume: 8000000 },
    { month: "Dec", users: 4, volume: 7200000 },
    { month: "Nov", users: 3, volume: 6500000 },
    { month: "Oct", users: 3, volume: 6000000 },
    { month: "Sep", users: 2, volume: 4500000 },
    { month: "Aug", users: 1, volume: 2000000 },
  ],
  topUsers: mockUsers
    .filter((user) => user.isActive)
    .sort((a, b) => b.totalVolume - a.totalVolume)
    .slice(0, 10)
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      widgets: user.widgets,
      totalVolume: user.totalVolume,
      wallet: user.wallet,
    })),
};

// ================================================================================
// WIDGETS MOCK
// ================================================================================

const mockWidgets = [
  {
    id: "w1",
    name: "Price Tracker",
    type: "price",
    userId: 2,
    config: { symbol: "BTC", currency: "USD" },
    isActive: true,
    createdAt: new Date("2025-01-05"),
  },
  {
    id: "w2",
    name: "Portfolio Balance",
    type: "portfolio",
    userId: 2,
    config: { tokens: ["BTC", "ETH", "BNB"] },
    isActive: true,
    createdAt: new Date("2025-01-06"),
  },
  {
    id: "w3",
    name: "Market News",
    type: "news",
    userId: 3,
    config: { sources: ["coindesk", "cointelegraph"] },
    isActive: true,
    createdAt: new Date("2025-01-08"),
  },
];

// ================================================================================
// UTILITÁRIOS
// ================================================================================

/**
 * Encontrar usuário por ID
 */
function findUserById(id) {
  return mockUsers.find((user) => user.id === parseInt(id));
}

/**
 * Encontrar usuário por email
 */
function findUserByEmail(email) {
  return mockUsers.find((user) => user.email === email);
}

/**
 * Encontrar usuário por wallet
 */
function findUserByWallet(wallet) {
  return mockUsers.find((user) => user.wallet.toLowerCase() === wallet.toLowerCase());
}

// Removido: helpers não utilizados (getActiveUsers, getGeneralStats)

// ================================================================================
// EXPORTAÇÕES
// ================================================================================

module.exports = {
  // Dados principais
  mockUsers,
  mockAnalytics,
  mockWidgets,

  // Funções utilitárias
  findUserById,
  findUserByEmail,
  findUserByWallet,
  getActiveUsers,
  getGeneralStats,
};

// Exposição para uso em browser (se necessário)
if (typeof window !== "undefined") {
  window.MockData = {
    users: mockUsers,
    analytics: mockAnalytics,
    widgets: mockWidgets,
    findUserById,
    findUserByEmail,
    findUserByWallet,
    getActiveUsers,
    getGeneralStats,
  };
}

console.log("✅ Mock Data centralizado carregado");

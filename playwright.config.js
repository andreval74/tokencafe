// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright E2E config para TokenCafe.
 * Assume servidor PHP rodando em http://localhost:8000 (npm run serve).
 * Para subir o servidor automaticamente antes dos testes: descomente `webServer`.
 */
module.exports = defineConfig({
  testDir: './test/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'test/e2e/report', open: 'never' }],
  ],

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:8000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Aguarda rede estabilizar antes de asserções
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },

  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile iPhone 13',
      use: { ...devices['iPhone 13'] },
    },
  ],

  // Descomente para subir o servidor PHP automaticamente nos testes:
  // webServer: {
  //   command: 'npm run serve',
  //   url: 'http://localhost:8000',
  //   reuseExistingServer: true,
  //   timeout: 15_000,
  // },
});

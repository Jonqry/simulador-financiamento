import { defineConfig, devices } from '@playwright/test'

/**
 * Testes de ponta a ponta (E2E): abrem o site num navegador de verdade.
 *
 * - Sem BASE_URL: sobe o build de produção local (`vite preview`) e testa nele.
 *   É o que roda no CI a cada push.
 * - Com BASE_URL: testa um site já publicado, sem subir nada.
 *   Ex.: BASE_URL=https://simulador-financiamento-blush.vercel.app npm run e2e
 */
const baseURL = process.env.BASE_URL ?? 'http://localhost:4173'
const testarLocal = !process.env.BASE_URL

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    locale: 'pt-BR',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    // Pixel 7 usa Chromium: no CI basta instalar um navegador.
    { name: 'celular', use: { ...devices['Pixel 7'] } },
  ],
  webServer: testarLocal
    ? {
        command: 'npm run build && npm run preview -- --port 4173 --strictPort',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
})

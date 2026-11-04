/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * Grava o commit do build numa meta tag (<meta name="versao">). Na Vercel a
 * variável VERCEL_GIT_COMMIT_SHA existe durante o build; localmente vira "local".
 * O workflow de E2E em produção usa isso para esperar o deploy certo entrar no ar.
 */
function versaoNoHtml(): Plugin {
  const versao = process.env.VERCEL_GIT_COMMIT_SHA ?? 'local'
  return {
    name: 'versao-no-html',
    transformIndexHtml: (html) => html.replace('</head>', `  <meta name="versao" content="${versao}" />\n  </head>`),
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), versaoNoHtml()],
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/**/*.test.ts', 'src/lib/**/index.ts'],
      thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
    },
  },
})

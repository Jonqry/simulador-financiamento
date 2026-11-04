import { expect, test, type Page } from '@playwright/test'

/**
 * Fluxos principais, como um usuário faria. Os testes de unidade (Vitest)
 * garantem os números; aqui garantimos que o site publicado funciona de
 * ponta a ponta: build, carregamento sob demanda dos gráficos, URL, cópia.
 */

const LINK_PADRAO = '/?valor=400000&entrada=80000&taxa=11.49&prazo=360&renda=15000&mip=0.025&dfi=0.01&adm=25'

const cartao = (page: Page, titulo: 'SAC' | 'Tabela PRICE') =>
  page.getByRole('article').filter({ has: page.getByRole('heading', { name: titulo, exact: true }) })

/** Digita substituindo o conteúdo, como uma pessoa faria (seleciona e escreve). */
async function digitar(page: Page, rotulo: string | RegExp, texto: string) {
  const campo = page.getByLabel(rotulo)
  await campo.fill('')
  await campo.pressSequentially(texto)
}

test('abre com a simulação padrão, gráficos e tabela', async ({ page }) => {
  await page.goto(LINK_PADRAO)

  await expect(cartao(page, 'SAC')).toContainText('R$ 3.947,46')
  await expect(cartao(page, 'Tabela PRICE')).toContainText('R$ 3.174,53')

  // Gráficos chegam por lazy loading (chunk separado).
  await expect(page.locator('figure svg.recharts-surface')).toHaveCount(2)
  await expect(page.getByRole('table', { name: /Tabela de amortização/ }).getByRole('row')).toHaveCount(361)
})

test('digitar recalcula, atualiza a URL e não polui o histórico', async ({ page }) => {
  await page.goto(LINK_PADRAO)
  const historicoAntes = await page.evaluate(() => history.length)

  await digitar(page, 'Renda bruta mensal', '11000')

  await expect(cartao(page, 'SAC')).toContainText('Acima do limite')
  await expect(cartao(page, 'Tabela PRICE')).toContainText('Perto do limite')
  await expect(page).toHaveURL(/renda=11000/)
  // replaceState: digitar não cria entradas no botão "voltar".
  expect(await page.evaluate(() => history.length)).toBe(historicoAntes)
})

test('mostra o erro no campo e esconde o resultado', async ({ page }) => {
  await page.goto(LINK_PADRAO)
  const entrada = page.getByLabel('Entrada', { exact: true })

  await digitar(page, /^Entrada$/, '500000')

  await expect(entrada).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByText('A entrada precisa ser menor que o valor do imóvel.')).toBeVisible()
  await expect(page.getByText('Corrija os campos destacados para ver a simulação.')).toBeVisible()
  await expect(page.getByRole('button', { name: /Copiar link/ })).toBeDisabled()
})

test('um link compartilhado reproduz a simulação', async ({ page }) => {
  await page.goto('/?valor=300000&entrada=60000&taxa=10&prazo=240&renda=12000&extra=15000&mesExtra=12&repetir=24')

  await expect(page.getByLabel('Valor do imóvel')).toHaveValue('300.000')
  await expect(page.getByLabel('Prazo')).toHaveValue('240')
  await expect(page.getByRole('heading', { name: /Amortização extra:/ })).toBeVisible()
})

test('link quebrado ou editado à mão não quebra a tela', async ({ page }) => {
  await page.goto('/?valor=abc&prazo=999&utm_source=whatsapp')

  // valor=abc cai no padrão (cenário MCMV: R$ 250 mil).
  await expect(page.getByLabel('Valor do imóvel')).toHaveValue('250.000')
  await expect(page.getByText('O prazo deve ser de 1 a 420 meses.')).toBeVisible()
})

test('simula FGTS e mostra que reduzir prazo economiza mais', async ({ page }) => {
  await page.goto(LINK_PADRAO)

  await page.getByText('Amortização extra (FGTS)').click()
  await digitar(page, 'Valor extra', '20000')
  await digitar(page, 'Pagar no mês', '24')
  await page.getByLabel('Repetir').selectOption('24')

  const painel = page.locator('section').filter({ has: page.getByRole('heading', { name: /Amortização extra:/ }) })
  await expect(painel).toContainText('R$ 254.700,79')
  await expect(painel).toContainText('Reduzir o prazo economiza mais')
  await expect(page).toHaveURL(/extra=20000&mesExtra=24&repetir=24/)
})

test('copia o link da simulação', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Permissão de área de transferência só no Chromium')
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto(LINK_PADRAO)

  await page.getByRole('button', { name: /Copiar link/ }).click()

  await expect(page.getByRole('button', { name: 'Link copiado!' })).toBeVisible()
  const copiado = await page.evaluate(() => navigator.clipboard.readText())
  expect(copiado).toContain('valor=400000')
})

test('rodapé com o autor e links de contato', async ({ page }) => {
  await page.goto('/')
  const contato = page.getByRole('navigation', { name: 'Contato' })
  await expect(contato.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', /linkedin\.com\/in\//)
  await expect(contato.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/Jonqry')
})

test('tem as tags de prévia para WhatsApp/LinkedIn', async ({ page, request }) => {
  await page.goto('/')
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /SAC × PRICE/)
  const imagem = await page.locator('meta[property="og:image"]').getAttribute('content')
  // A imagem aponta para o domínio de produção; testa que ela existe neste deploy.
  const resposta = await request.get(new URL(imagem!).pathname)
  expect(resposta.ok()).toBe(true)
  expect(resposta.headers()['content-type']).toContain('image/png')
})

test('corretor: taxa pela renda, imóvel máximo e resumo para o cliente', async ({ page, context, browserName }) => {
  await page.goto(LINK_PADRAO)

  await digitar(page, 'Renda bruta mensal', '7000')
  await expect(page.getByText(/Faixa 3/)).toBeVisible()
  await page.getByRole('button', { name: /^Usar / }).click()
  await expect(page.getByLabel('Taxa de juros')).toHaveValue('8,16')

  const capacidade = page.locator('section').filter({ has: page.getByRole('heading', { name: /Até quanto/ }) })
  await expect(capacidade).toContainText('imóvel de até')

  if (browserName === 'chromium') {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.getByRole('button', { name: 'Copiar resumo para o cliente' }).click()
    const resumo = await page.evaluate(() => navigator.clipboard.readText())
    expect(resumo).toContain('Simulação de financiamento imobiliário')
    expect(resumo).toContain('8,16% ao ano')
  }
})

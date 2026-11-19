import { expect, test, type Page } from '@playwright/test'

/**
 * Fluxos principais, como um usuário faria. Os testes de unidade (Vitest)
 * garantem os números; aqui garantimos que o site publicado funciona de
 * ponta a ponta: build, carregamento sob demanda dos gráficos, URL, cópia.
 */

// Taxa manual e renda acima do MCMV (SBPE, SAC em destaque), comparando com a PRICE.
const LINK_PADRAO = '/?valor=400000&entrada=80000&taxa=11.49&prazo=360&renda=15000&mip=0.025&dfi=0.01&adm=25&comparar=1'

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

test('imóvel na planta: painel e gráfico da evolução de obra', async ({ page }) => {
  await page.goto('/?obra=24&executada=30')

  const painel = page.locator('section').filter({ has: page.getByRole('heading', { name: /Durante a obra/ }) })
  await expect(painel).toContainText('R$ 514,13')
  await expect(painel).toContainText('R$ 23.689,52')
  await expect(painel.locator('svg.recharts-surface')).toHaveCount(1)
})

test('celular: barra fixa mostra a parcela enquanto se preenche o formulário', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'A barra só existe em telas pequenas')
  await page.goto(LINK_PADRAO)
  const barra = page.getByRole('complementary', { name: 'Resumo da simulação' })

  await expect(barra).toContainText('R$ 3.947,46')
  await digitar(page, 'Renda bruta mensal', '11000')
  await expect(barra).toBeVisible() // continua à vista depois de digitar

  await barra.getByRole('link', { name: 'Ver detalhes' }).click()
  await expect(cartao(page, 'SAC')).toBeInViewport()
  await expect(barra).toBeHidden() // some quando o resultado aparece
})

test('computador: os botões do fim do formulário ficam alcançáveis com as seções abertas', async ({ page, isMobile }) => {
  test.skip(isMobile, 'No celular o formulário não é fixo')
  await page.setViewportSize({ width: 1280, height: 640 })
  await page.goto(LINK_PADRAO)
  await page.locator('summary').filter({ hasText: 'Condições do banco' }).click()
  await page.locator('summary').filter({ hasText: 'Imóvel na planta' }).click()

  const whatsapp = page.getByRole('link', { name: 'Enviar resumo no WhatsApp' })
  await whatsapp.scrollIntoViewIfNeeded()
  await expect(whatsapp).toBeInViewport()
  // O formulário rolou por dentro; a página continua no topo, com o resultado ao lado.
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
  await expect(whatsapp).toHaveAttribute('href', /^https:\/\/wa\.me\/\?text=/)
})

test('rodapé com o autor e links de contato', async ({ page }) => {
  await page.goto('/')
  const contato = page.getByRole('navigation', { name: 'Contato' })
  await expect(contato.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', /linkedin\.com\/in\//)
  await expect(contato.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/Jonqry')
})

test('tem as tags de prévia para WhatsApp/LinkedIn', async ({ page, request }) => {
  await page.goto('/')
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /MCMV e SBPE/)
  const imagem = await page.locator('meta[property="og:image"]').getAttribute('content')
  // A imagem aponta para o domínio de produção; testa que ela existe neste deploy.
  const resposta = await request.get(new URL(imagem!).pathname)
  expect(resposta.ok()).toBe(true)
  expect(resposta.headers()['content-type']).toContain('image/png')
})

test('corretor: taxa pela renda, imóvel máximo e resumo para o cliente', async ({ page, context, browserName }) => {
  await page.goto(LINK_PADRAO)

  await digitar(page, 'Renda bruta mensal', '9000')
  await expect(page.getByText('Minha Casa, Minha Vida · Faixa 3').first()).toBeVisible()
  // O link veio com a taxa do banco (manual); voltar para a automática aplica a da faixa.
  await page.getByRole('button', { name: 'Voltar para a taxa automática' }).click()
  await expect(page.getByLabel('Taxa de juros')).toHaveValue('8,16')

  const capacidade = page.locator('section').filter({ has: page.getByRole('heading', { name: /Até quanto/ }) })
  await expect(capacidade).toContainText('imóvel de até')

  if (browserName === 'chromium') {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.getByRole('button', { name: 'Copiar resumo' }).click()
    const resumo = await page.evaluate(() => navigator.clipboard.readText())
    expect(resumo).toContain('Simulação de financiamento imobiliário')
    expect(resumo).toContain('8,16% ao ano')
  }
})

test('a taxa acompanha o imóvel: R$ 400.000 é Faixa 3 e R$ 400.001 já é Faixa 4', async ({ page }) => {
  await page.goto('/?renda=6000&entrada=100000')
  const taxa = page.getByLabel('Taxa de juros')

  await digitar(page, 'Valor do imóvel', '400000')
  await expect(taxa).toHaveValue('8,16')
  await digitar(page, 'Valor do imóvel', '400001')
  await expect(taxa).toHaveValue('10')
  await expect(page.getByText(/Pela renda seria Faixa 3/)).toBeVisible()
  // Taxa automática não vai para o link: quem abrir recalcula pela faixa.
  await expect(page).not.toHaveURL(/taxa=/)
})

test('digitar a taxa do banco troca para manual, e dá para voltar à automática', async ({ page }) => {
  await page.goto('/')
  await digitar(page, 'Taxa de juros', '9,5')
  await expect(page.getByText(/Taxa digitada/)).toBeVisible()
  await expect(page).toHaveURL(/taxa=9.5/)

  await page.getByRole('button', { name: 'Voltar para a taxa automática' }).click()
  await expect(page.getByLabel('Taxa de juros')).toHaveValue('8,16')
  await expect(page).not.toHaveURL(/taxa=/)
})

test('MCMV abre na PRICE; o SAC aparece só ao comparar', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Financiamento na PRICE' })).toBeVisible()
  await expect(cartao(page, 'Tabela PRICE')).toContainText('R$ 1.543,82')
  await expect(cartao(page, 'SAC')).toHaveCount(0)

  await page.getByRole('button', { name: 'Comparar com SAC' }).click()
  await expect(cartao(page, 'SAC')).toContainText('R$ 1.936,19')
  await expect(page).toHaveURL(/comparar=1/)
})

test('SBPE abre no SAC', async ({ page }) => {
  await page.goto('/?valor=700000&entrada=200000&renda=25000')
  await expect(page.getByRole('heading', { name: 'Financiamento no SAC' })).toBeVisible()
  await expect(page.getByText('SBPE (taxa de mercado)').first()).toBeVisible()
})

test('reprovado pela renda: bloqueia o envio e mostra o que resolve', async ({ page }) => {
  await page.goto('/?renda=4000')

  await expect(page.getByRole('heading', { name: 'Não aprovado pela renda' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Enviar resumo no WhatsApp' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Copiar resumo' })).toBeDisabled()
  // O resultado normal (cartão, tabela) não aparece: não dá para "ler por cima" e achar que passou.
  await expect(page.getByRole('table')).toHaveCount(0)

  await page.getByRole('button', { name: 'Simular o imóvel máximo' }).click()
  await expect(page.getByRole('heading', { name: /^Imóvel de até R\$/ })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Enviar resumo no WhatsApp' })).toBeVisible()
  await expect(page).toHaveURL(/modo=renda/)
})

test('quanto posso comprar: calcula o imóvel pela renda', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Quanto posso comprar' }).click()
  await expect(page.getByLabel('Valor do imóvel')).toHaveCount(0)
  await digitar(page, 'Entrada', '150000')
  await expect(page.getByRole('heading', { name: /^Imóvel de até R\$/ })).toContainText('R$')
  await expect(page.getByText(/Quem limita é/)).toBeVisible()
})

test('prazo em anos', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Meses ou anos').selectOption('anos')
  await expect(page.getByLabel('Prazo')).toHaveValue('35')
  await expect(page).toHaveURL(/prazo=420.*prazoEm=anos/)
})

test('entrada em percentual do imóvel', async ({ page }) => {
  await page.goto('/')
  await digitar(page, /^Entrada$/, '30%')
  await expect(page.getByText(/R\$\s75\.000,00 · Valor financiado: R\$\s175\.000,00/)).toBeVisible()
})

test('cliente que já tem imóvel no nome vai para o SBPE, no SAC, e passa ou não pela renda', async ({ page }) => {
  await page.goto('/?renda=6000')
  await page.getByLabel('Já tem imóvel no nome?').selectOption('sim')
  await expect(page.getByText(/Quem já tem imóvel no nome não pode usar o Minha Casa, Minha Vida/)).toBeVisible()
  await expect(page.getByLabel('Taxa de juros')).toHaveValue('11,39')
  // Com R$ 6 mil, o SAC no SBPE passa do limite: reprovado.
  await expect(page.getByRole('heading', { name: 'Não aprovado pela renda' })).toBeVisible()
  await expect(page).toHaveURL(/temImovel=1/)

  await digitar(page, 'Renda bruta mensal', '9000')
  await expect(page.getByRole('heading', { name: 'Financiamento no SAC' })).toBeVisible()
})

test('teto das Faixas 1 e 2 da cidade: acima dele, o imóvel entra na Faixa 3', async ({ page }) => {
  await page.goto('/?renda=2500&valor=220000&entrada=60000')
  await expect(page.getByText('Minha Casa, Minha Vida · Faixa 1').first()).toBeVisible()
  await digitar(page, 'Teto das Faixas 1 e 2 na cidade', '210000')
  await expect(page.getByText('Minha Casa, Minha Vida · Faixa 3').first()).toBeVisible()
  await expect(page.getByText(/Pela renda seria Faixa 1/)).toBeVisible()
})

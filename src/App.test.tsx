// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

// O jsdom não implementa ResizeObserver, que o ResponsiveContainer do Recharts usa.
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

// Os testes abrem um link explícito em vez de depender do cenário padrão:
// mudar os valores iniciais do formulário não deve quebrar testes de comportamento.
// Taxa do banco (manual), renda acima do MCMV (SBPE: SAC em destaque) e comparando com a PRICE.
const LINK_BASE = '/?valor=400000&entrada=80000&taxa=11.49&prazo=360&renda=15000&comparar=1'

beforeEach(() => {
  window.history.replaceState(null, '', LINK_BASE)
})

afterEach(cleanup)

// Intl usa espaço não separável entre "R$" e o valor.
const texto = (el: HTMLElement) => el.textContent?.replace(/\s/g, ' ')

describe('App', () => {
  it('sem parâmetros na URL, abre num cenário típico do MCMV, na PRICE', () => {
    window.history.replaceState(null, '', '/')
    render(<App />)
    expect(screen.getByLabelText('Valor do imóvel')).toHaveProperty('value', '250.000')
    expect(screen.getByLabelText('Prazo')).toHaveProperty('value', '420')
    // Taxa automática: Faixa 3, não cotista.
    expect(screen.getByLabelText('Taxa de juros')).toHaveProperty('value', '8,16')
    expect(screen.getAllByText('Minha Casa, Minha Vida · Faixa 3').length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'Financiamento na PRICE' })).toBeTruthy()
    // Valores conferidos com implementação independente em Python.
    const price = screen.getByRole('heading', { name: 'Tabela PRICE' }).closest('article')!
    expect(texto(price)).toContain('R$ 1.543,82')
    // O SAC só aparece quando o corretor pede a comparação.
    expect(screen.queryByRole('heading', { name: 'SAC', level: 3 })).toBeNull()
  })

  it('"Comparar com SAC" mostra o SAC ao lado', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '/')
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Comparar com SAC' }))
    const sac = screen.getByRole('heading', { name: 'SAC', level: 3 }).closest('article')!
    expect(texto(sac)).toContain('R$ 1.936,19')
    expect(within(sac).getByText('Acima do limite')).toBeTruthy()
    expect(window.location.search).toContain('comparar=1')
  })

  it('abre um link com os valores e mostra a comparação, já com seguros e taxa', () => {
    render(<App />)
    expect(screen.getByLabelText('Valor do imóvel')).toHaveProperty('value', '400.000')
    const sac = screen.getByRole('heading', { name: 'SAC', level: 3 }).closest('article')!
    // 3.802,46 de juros + amortização + 145,00 de seguros e taxa
    expect(texto(sac)).toContain('R$ 3.947,46')
    expect(texto(sac)).toContain('inclui R$ 145,00 de seguros e taxa')
    expect(texto(sac)).toContain('CET estimado12,19% ao ano')
    const price = screen.getByRole('heading', { name: 'Tabela PRICE' }).closest('article')!
    expect(texto(price)).toContain('R$ 3.174,53')
  })

  it('sem seguros e taxa, volta à parcela só de juros + amortização', async () => {
    const user = userEvent.setup()
    render(<App />)
    for (const rotulo of [/Seguro MIP/, /Seguro DFI/, 'Taxa de administração']) {
      await user.clear(screen.getByLabelText(rotulo))
    }
    const sac = screen.getByRole('heading', { name: 'SAC', level: 3 }).closest('article')!
    expect(texto(sac)).toContain('R$ 3.802,46')
    // Sem encargos, o CET é a própria taxa de juros.
    expect(texto(sac)).toContain('CET estimado11,49% ao ano')
  })

  it('a seção abre quando há erro dentro e não fecha sozinha quando o erro some', async () => {
    const user = userEvent.setup()
    render(<App />)
    const secao = screen.getByText('Amortização extra (FGTS)').closest('details')!
    expect(secao.open).toBe(false)

    await user.type(screen.getByLabelText('Valor extra'), '20000') // sem mês: erro → abre
    expect(secao.open).toBe(true)
    await user.type(screen.getByLabelText('Pagar no mês'), '24') // erro some: continua aberta
    expect(secao.open).toBe(true)
  })

  it('simula amortização extra com FGTS e compara prazo × parcela', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.queryByRole('heading', { name: /Amortização extra:/ })).toBeNull()

    await user.type(screen.getByLabelText('Valor extra'), '20000')
    await user.type(screen.getByLabelText('Pagar no mês'), '24')
    await user.selectOptions(screen.getByLabelText('Repetir'), '24')

    const painel = screen.getByRole('heading', { name: /Amortização extra:/ }).closest('section')!
    const linhaSac = within(painel).getByRole('rowheader', { name: /SAC/ }).closest('tr')!
    // Valores conferidos com implementação independente em Python.
    expect(texto(linhaSac)).toContain('R$ 254.700,79')
    expect(texto(linhaSac)).toContain('16 anos (168 meses antes)')
    expect(texto(painel)).toContain('Reduzir o prazo economiza mais')
    expect(window.location.search).toContain('extra=20000&mesExtra=24&repetir=24')
  })

  it('lê os valores de um link compartilhado', () => {
    window.history.replaceState(null, '', '/?valor=300000&entrada=60000&taxa=10&prazo=240&renda=12000')
    render(<App />)
    expect(screen.getByLabelText('Valor do imóvel')).toHaveProperty('value', '300.000')
    expect(screen.getByLabelText('Prazo')).toHaveProperty('value', '240')
    expect(screen.getByText(/^20 anos ·/)).toBeTruthy()
  })

  it('atualiza a URL enquanto o usuário digita', async () => {
    const user = userEvent.setup()
    render(<App />)
    const prazo = screen.getByLabelText('Prazo')
    await user.clear(prazo)
    await user.type(prazo, '240')
    expect(window.location.search).toContain('prazo=240')
  })

  it('mostra o erro no próprio campo e esconde o resultado', async () => {
    const user = userEvent.setup()
    render(<App />)
    const entrada = screen.getByLabelText('Entrada')
    await user.clear(entrada)
    await user.type(entrada, '500.000')

    expect(entrada.getAttribute('aria-invalid')).toBe('true')
    // A mensagem está ligada ao input via aria-describedby (leitores de tela a anunciam).
    const idMensagem = entrada.getAttribute('aria-describedby')!
    expect(document.getElementById(idMensagem)?.textContent).toBe('A entrada precisa ser menor que o valor do imóvel.')
    expect(screen.getByText('Corrija os campos destacados para ver a simulação.')).toBeTruthy()
    expect(screen.getByRole('button', { name: /copiar link/i })).toHaveProperty('disabled', true)
  })

  it('comparando, alerta quando a parcela do outro sistema passa de 30% da renda', async () => {
    const user = userEvent.setup()
    render(<App />)
    const renda = screen.getByLabelText('Renda bruta mensal')
    await user.clear(renda)
    await user.type(renda, '11000')

    const sac = screen.getByRole('heading', { name: 'SAC', level: 3 }).closest('article')!
    expect(within(sac).getByText('Acima do limite')).toBeTruthy()
    expect(texto(sac)).toContain('35,89%') // R$ 3.947,46 / R$ 11.000
    const price = screen.getByRole('heading', { name: 'Tabela PRICE' }).closest('article')!
    expect(within(price).getByText('Perto do limite')).toBeTruthy()
  })

  it('alterna a tabela entre SAC e PRICE', async () => {
    const user = userEvent.setup()
    render(<App />)
    const tabela = () => screen.getByRole('table')
    expect(within(tabela()).getAllByRole('row')).toHaveLength(361) // cabeçalho + 360 parcelas
    expect(texto(within(tabela()).getAllByRole('row')[1]!)).toContain('R$ 3.947,46')

    await user.click(within(screen.getByRole('group', { name: 'Sistema da tabela' })).getByRole('button', { name: /PRICE/ }))
    expect(texto(within(tabela()).getAllByRole('row')[1]!)).toContain('R$ 3.174,53')
  })

  it('mostra até quanto o cliente pode comprar e o que limita', async () => {
    const user = userEvent.setup()
    render(<App />)
    const painel = () => screen.getByRole('heading', { name: /Até quanto esse cliente pode comprar/ }).closest('section')!
    // Entrada de R$ 80 mil e cota de 80%: imóvel de até R$ 400 mil.
    expect(texto(painel())).toContain('R$ 400.000,00')
    expect(texto(painel())).toContain('Quem limita é a entrada')

    const entrada = screen.getByLabelText('Entrada')
    await user.clear(entrada)
    await user.type(entrada, '300000')
    // Valores conferidos com implementação independente em Python.
    expect(texto(painel())).toContain('R$ 663.370,87')
    expect(texto(painel())).toContain('Quem limita é a renda')
  })

  it('a taxa vem sozinha da faixa e acompanha região, FGTS e o valor do imóvel', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '/?renda=7000&entrada=100000')
    render(<App />)
    const taxa = () => screen.getByLabelText('Taxa de juros')
    expect(taxa()).toHaveProperty('value', '8,16')

    await user.selectOptions(screen.getByLabelText('Cotista do FGTS'), 'sim')
    expect(taxa()).toHaveProperty('value', '7,66')

    // R$ 400.000 ainda é Faixa 3; R$ 400.001 já sobe para a Faixa 4 (10%).
    const valor = screen.getByLabelText('Valor do imóvel')
    await user.clear(valor)
    await user.type(valor, '400000')
    expect(taxa()).toHaveProperty('value', '7,66')
    await user.clear(valor)
    await user.type(valor, '400001')
    expect(taxa()).toHaveProperty('value', '10')
    expect(screen.getByText(/Pela renda seria Faixa 3/)).toBeTruthy()
  })

  it('acima de R$ 13 mil de renda, avisa que é taxa de mercado', () => {
    render(<App />)
    expect(screen.getByText(/Renda acima de R\$ 13 mil: fora do Minha Casa, Minha Vida/)).toBeTruthy()
  })

  it('copia um resumo pronto para WhatsApp, sem a renda do cliente', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Copiar resumo' }))
    const copiado = writeText.mock.lastCall?.[0] ?? ''
    expect(copiado).toMatch(/^\*Simulação de financiamento imobiliário\*/)
    expect(copiado.replace(/\u00a0/g, ' ')).toContain('1ª parcela: R$ 3.947,46')
    expect(copiado).toContain('Veja os detalhes: http')
    expect(copiado).not.toContain('15.000')
  })

  it('tem um glossário com os termos usados', () => {
    render(<App />)
    const glossario = screen.getByText('Entenda os termos').closest('details')!
    expect(within(glossario).getByText('Cota de financiamento')).toBeTruthy()
    expect(within(glossario).getByText('CET')).toBeTruthy()
  })

  it('cota de financiamento editável muda o imóvel máximo', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '/')
    render(<App />)
    const painel = () => screen.getByRole('heading', { name: /Até quanto esse cliente pode comprar/ }).closest('section')!
    expect(texto(painel())).toContain('R$ 250.000,00') // PRICE limitado pela entrada (80%)

    const cota = screen.getByLabelText('Cota de financiamento')
    await user.clear(cota)
    await user.type(cota, '90')
    expect(texto(painel())).toContain('R$ 283.846,40') // agora quem limita é a renda
    expect(texto(painel())).not.toContain('R$ 250.000,00')
    expect(window.location.search).toContain('cota=90')
  })

  it('avisa quando a entrada está abaixo do mínimo pela cota', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '/')
    render(<App />)
    const entrada = screen.getByLabelText('Entrada')
    await user.clear(entrada)
    await user.type(entrada, '30000')
    // A Testing Library normaliza espaços (inclusive o espaço especial do "R$").
    expect(screen.getByText('Atenção: com cota de 80%, a entrada mínima é R$ 50.000,00.')).toBeTruthy()
  })

  it('o rodapé mostra o autor com links para LinkedIn e GitHub', () => {
    render(<App />)
    const contato = screen.getByRole('navigation', { name: 'Contato' })
    expect(within(contato).getByRole('link', { name: 'LinkedIn' }).getAttribute('href')).toContain('linkedin.com/in/')
    expect(within(contato).getByRole('link', { name: 'GitHub' }).getAttribute('href')).toBe('https://github.com/Jonqry')
  })

  it('imóvel na planta: mostra os encargos da obra até as chaves', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '/')
    render(<App />)
    expect(screen.queryByRole('heading', { name: /Durante a obra/ })).toBeNull()

    await user.type(screen.getByLabelText('Meses até as chaves'), '24')
    await user.type(screen.getByLabelText('Obra já executada'), '30')

    const painel = screen.getByRole('heading', { name: 'Durante a obra: 24 meses até as chaves' }).closest('section')!
    // Taxa automática: 8,16% nominal (Faixa 3).
    expect(texto(painel)).toContain('R$ 514,13') // 1º mês, obra em 33%
    expect(texto(painel)).toContain('R$ 1.460,00') // último mês, obra em 100%
    expect(texto(painel)).toContain('R$ 23.689,52') // total na obra
    expect(texto(painel)).toContain('Nessa fase a dívida não diminui')
    expect(window.location.search).toContain('obra=24&executada=30')
  })

  it('ao sair do campo, o número ganha pontos de milhar', async () => {
    const user = userEvent.setup()
    render(<App />)
    const valor = screen.getByLabelText('Valor do imóvel')
    await user.clear(valor)
    await user.type(valor, '320000')
    expect(valor).toHaveProperty('value', '320000') // enquanto digita, não mexe no texto
    await user.tab()
    expect(valor).toHaveProperty('value', '320.000')
  })

  it('texto inválido não é alterado ao sair do campo', async () => {
    const user = userEvent.setup()
    render(<App />)
    const valor = screen.getByLabelText('Valor do imóvel')
    await user.clear(valor)
    await user.type(valor, 'abc')
    await user.tab()
    expect(valor).toHaveProperty('value', 'abc')
  })

  it('mostra a entrada também em percentual', () => {
    render(<App />)
    expect(screen.getByText(/Valor financiado: R\$ 320\.000,00 · entrada de 20%/)).toBeTruthy()
  })

  it('"Recomeçar" volta ao cenário inicial', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByLabelText('Valor do imóvel')).toHaveProperty('value', '400.000')
    await user.click(screen.getByRole('button', { name: 'Recomeçar' }))
    expect(screen.getByLabelText('Valor do imóvel')).toHaveProperty('value', '250.000')
    expect(window.location.search).toContain('valor=250000')
  })

  it('o botão do WhatsApp leva o resumo e o link atualizados', async () => {
    const user = userEvent.setup()
    render(<App />)
    const prazo = screen.getByLabelText('Prazo')
    await user.clear(prazo)
    await user.type(prazo, '300')

    const href = screen.getByRole('link', { name: 'Enviar resumo no WhatsApp' }).getAttribute('href')!
    expect(href.startsWith('https://wa.me/?text=')).toBe(true)
    const mensagem = decodeURIComponent(href.slice('https://wa.me/?text='.length))
    expect(mensagem).toContain('*Simulação de financiamento imobiliário*')
    expect(mensagem).toContain('em 300 meses (25 anos)')
    expect(mensagem).toContain('prazo=300') // o link já reflete o que acabou de ser digitado
  })

  it('com erro no formulário, o envio pelo WhatsApp fica desabilitado', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.clear(screen.getByLabelText('Prazo'))
    expect(screen.queryByRole('link', { name: 'Enviar resumo no WhatsApp' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Enviar resumo no WhatsApp' })).toHaveProperty('disabled', true)
  })

  it('digitar a taxa do banco troca para manual; um botão volta para a automática', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '/')
    render(<App />)
    const taxa = screen.getByLabelText('Taxa de juros')
    expect(window.location.search).not.toContain('taxa=')
    await user.clear(taxa)
    await user.type(taxa, '9,5')
    expect(window.location.search).toContain('taxa=9.5')

    await user.click(screen.getByRole('button', { name: 'Voltar para a taxa automática' }))
    expect(screen.getByLabelText('Taxa de juros')).toHaveProperty('value', '8,16')
    expect(window.location.search).not.toContain('taxa=')
  })

  it('reprovado pela renda: o resultado vira o que resolve e o envio fica bloqueado', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '/?renda=4000')
    render(<App />)
    const painel = screen.getByRole('heading', { name: 'Não aprovado pela renda' }).closest('section')!
    // Valores conferidos pelos testes da lib (montar.test.ts).
    expect(texto(painel)).toContain('Um imóvel de até R$ 243.329,51')
    expect(texto(painel)).toContain('Entrada de R$ 56.782,73')
    expect(texto(painel)).toContain('Renda de R$ 4.134,60')
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Enviar resumo no WhatsApp' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Enviar resumo no WhatsApp' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Copiar resumo' })).toHaveProperty('disabled', true)

    await user.click(screen.getByRole('button', { name: 'Simular o imóvel máximo' }))
    // O nome acessível mantém o espaço especial do "R$": regex com \s.
    expect(screen.getByRole('heading', { name: /^Imóvel de até R\$\s243\.329,51$/ })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Enviar resumo no WhatsApp' })).toBeTruthy()
  })

  it('reprovado no sistema escolhido, mas o outro cabe: oferece trocar', async () => {
    const user = userEvent.setup()
    // No cenário padrão o SAC usa 32,27% da renda e a PRICE, 25,73%.
    window.history.replaceState(null, '', '/?sistema=SAC')
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Não aprovado pela renda' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Usar PRICE' }))
    expect(screen.getByRole('heading', { name: 'Financiamento na PRICE' })).toBeTruthy()
  })

  it('"Quanto posso comprar" esconde o valor do imóvel e calcula o máximo pela renda', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '/')
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Quanto posso comprar' }))
    expect(screen.queryByLabelText('Valor do imóvel')).toBeNull()
    expect(screen.getByRole('heading', { name: /^Imóvel de até R\$/ })).toBeTruthy()
    expect(window.location.search).toContain('modo=renda')
  })

  it('cliente com imóvel no nome: SBPE, no SAC, com a taxa de referência', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '/?renda=9000')
    render(<App />)
    await user.selectOptions(screen.getByLabelText('Já tem imóvel no nome?'), 'sim')
    expect(screen.getAllByText('SBPE (taxa de mercado)').length).toBeGreaterThan(0)
    expect(screen.getByLabelText('Taxa de juros')).toHaveProperty('value', '11,39')
    expect(screen.getByRole('heading', { name: 'Financiamento no SAC' })).toBeTruthy()
    expect(window.location.search).toContain('temImovel=1')
  })

  it('prazo em anos: troca a unidade convertendo o número', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '/')
    render(<App />)
    await user.selectOptions(screen.getByLabelText('Meses ou anos'), 'anos')
    expect(screen.getByLabelText('Prazo')).toHaveProperty('value', '35')
    expect(window.location.search).toContain('prazo=420')
    expect(window.location.search).toContain('prazoEm=anos')
  })

  it('copia o link da simulação', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')
    render(<App />)
    await user.click(screen.getByRole('button', { name: /copiar link/i }))
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('valor=400000'))
    expect(screen.getByRole('button', { name: 'Link copiado!' })).toBeTruthy()
  })
})

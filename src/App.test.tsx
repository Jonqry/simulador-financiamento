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

beforeEach(() => {
  window.history.replaceState(null, '', '/')
})

afterEach(cleanup)

// Intl usa espaço não separável entre "R$" e o valor.
const texto = (el: HTMLElement) => el.textContent?.replace(/\s/g, ' ')

describe('App', () => {
  it('abre com os valores padrão e mostra a comparação, já com seguros e taxa', () => {
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
    expect(screen.getByText('20 anos')).toBeTruthy()
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

  it('alerta quando a parcela do SAC passa de 30% da renda', async () => {
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

  it('copia o link da simulação', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')
    render(<App />)
    await user.click(screen.getByRole('button', { name: /copiar link/i }))
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('valor=400000'))
    expect(screen.getByRole('button', { name: 'Link copiado!' })).toBeTruthy()
  })
})

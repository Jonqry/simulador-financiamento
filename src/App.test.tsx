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
  it('abre com os valores padrão e mostra a comparação', () => {
    render(<App />)
    expect(screen.getByLabelText('Valor do imóvel')).toHaveProperty('value', '400.000')
    const sac = screen.getByRole('heading', { name: 'SAC', level: 3 }).closest('article')!
    expect(texto(sac)).toContain('R$ 3.802,46')
    const price = screen.getByRole('heading', { name: 'Tabela PRICE' }).closest('article')!
    expect(texto(price)).toContain('R$ 3.029,53')
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
    expect(texto(sac)).toContain('34,57%')
    const price = screen.getByRole('heading', { name: 'Tabela PRICE' }).closest('article')!
    expect(within(price).getByText('Perto do limite')).toBeTruthy()
  })

  it('alterna a tabela entre SAC e PRICE', async () => {
    const user = userEvent.setup()
    render(<App />)
    const tabela = () => screen.getByRole('table')
    expect(within(tabela()).getAllByRole('row')).toHaveLength(361) // cabeçalho + 360 parcelas
    expect(texto(within(tabela()).getAllByRole('row')[1]!)).toContain('R$ 3.802,46')

    await user.click(within(screen.getByRole('group', { name: 'Sistema da tabela' })).getByRole('button', { name: /PRICE/ }))
    expect(texto(within(tabela()).getAllByRole('row')[1]!)).toContain('R$ 3.029,53')
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

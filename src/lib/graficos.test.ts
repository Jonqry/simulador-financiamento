import { describe, expect, it } from 'vitest'
import { aplicarEncargos, calcularPRICE, calcularSAC } from './financiamento'
import { dadosComposicao, dadosSaldo, marcasAnuais, rotuloMes } from './graficos'

const PARAMS = { principal: 1_000_00, taxaMensal: 0.01, prazoMeses: 3 }

describe('dadosSaldo', () => {
  it('começa no valor financiado e segue o saldo de cada sistema', () => {
    expect(dadosSaldo(PARAMS.principal, calcularSAC(PARAMS), calcularPRICE(PARAMS))).toEqual([
      { mes: 0, sac: 100000, price: 100000 },
      { mes: 1, sac: 66667, price: 66998 },
      { mes: 2, sac: 33334, price: 33666 },
      { mes: 3, sac: 0, price: 0 },
    ])
  })

  it('recusa tabelas de prazos diferentes', () => {
    const outra = calcularPRICE({ ...PARAMS, prazoMeses: 4 })
    expect(() => dadosSaldo(PARAMS.principal, calcularSAC(PARAMS), outra)).toThrow(RangeError)
  })
})

describe('dadosComposicao', () => {
  it('separa juros, amortização e encargos por mês', () => {
    const tabela = aplicarEncargos(calcularSAC(PARAMS), PARAMS.principal, 2_000_00, {
      mipMensal: 0.01,
      dfiMensal: 0.005,
      taxaAdministracao: 2_00,
    })
    expect(dadosComposicao(tabela)).toEqual([
      { mes: 1, juros: 1000, amortizacao: 33333, encargos: 1000 + 1000 + 200 },
      { mes: 2, juros: 667, amortizacao: 33333, encargos: 667 + 1000 + 200 },
      { mes: 3, juros: 333, amortizacao: 33334, encargos: 333 + 1000 + 200 },
    ])
  })
})

describe('marcasAnuais', () => {
  it.each([
    [360, [0, 60, 120, 180, 240, 300, 360]], // 30 anos: a cada 5
    [180, [0, 36, 72, 108, 144, 180]], // 15 anos: a cada 3
    [48, [0, 12, 24, 36, 48]], // 4 anos: a cada 1
    [100, [0, 36, 72]], // prazo quebrado: não passa do fim
  ])('prazo de %i meses', (prazo, esperado) => {
    expect(marcasAnuais(prazo)).toEqual(esperado)
  })
})

describe('rotuloMes', () => {
  it.each([
    [0, 'Início'],
    [1, 'Mês 1 · ano 1'],
    [12, 'Mês 12 · ano 1'],
    [13, 'Mês 13 · ano 2'],
    [360, 'Mês 360 · ano 30'],
  ])('%i → %s', (mes, esperado) => {
    expect(rotuloMes(mes)).toBe(esperado)
  })
})

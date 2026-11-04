import { describe, expect, it } from 'vitest'
import { calcularPRICE, calcularPrestacaoPrice } from './price'
import { calcularSAC } from './sac'
import { taxaMensalDeAnualEfetiva } from './taxas'
import type { Parcela, ParametrosAmortizacao } from './tipos'
import { PRAZO_MAXIMO_MESES } from './validacao'

const soma = (parcelas: Parcela[], campo: keyof Parcela) => parcelas.reduce((total, p) => total + p[campo], 0)

// Exemplo pequeno, conferível na calculadora: R$ 1.000,00 a 1% a.m. em 3 meses.
const PEQUENO: ParametrosAmortizacao = { principal: 1_000_00, taxaMensal: 0.01, prazoMeses: 3 }

describe('calcularSAC', () => {
  it('gera a tabela esperada no exemplo pequeno', () => {
    expect(calcularSAC(PEQUENO)).toEqual([
      { numero: 1, prestacao: 34333, juros: 1000, amortizacao: 33333, saldoDevedor: 66667 },
      { numero: 2, prestacao: 34000, juros: 667, amortizacao: 33333, saldoDevedor: 33334 },
      // A última parcela absorve o centavo que sobrou da divisão 100000 / 3.
      { numero: 3, prestacao: 33667, juros: 333, amortizacao: 33334, saldoDevedor: 0 },
    ])
  })

  it('amortização constante e prestações decrescentes', () => {
    const parcelas = calcularSAC({ principal: 100_000_00, taxaMensal: 0.01, prazoMeses: 10 })
    expect(new Set(parcelas.map((p) => p.amortizacao))).toEqual(new Set([10_000_00]))
    for (let k = 1; k < parcelas.length; k++) {
      expect(parcelas[k]!.prestacao).toBeLessThan(parcelas[k - 1]!.prestacao)
    }
  })

  it('total de juros bate com a fórmula fechada P·i·(n+1)/2', () => {
    // 100.000 × 1% × 11/2 = R$ 5.500,00
    const parcelas = calcularSAC({ principal: 100_000_00, taxaMensal: 0.01, prazoMeses: 10 })
    expect(soma(parcelas, 'juros')).toBe(5_500_00)
  })
})

describe('calcularPrestacaoPrice', () => {
  it('bate com o valor clássico de livro: R$ 100 mil, 1% a.m., 10 meses → R$ 10.558,21', () => {
    expect(calcularPrestacaoPrice({ principal: 100_000_00, taxaMensal: 0.01, prazoMeses: 10 })).toBe(10_558_21)
  })

  it('com taxa zero vira principal / prazo (evita divisão 0/0)', () => {
    expect(calcularPrestacaoPrice({ principal: 1_200_00, taxaMensal: 0, prazoMeses: 12 })).toBe(100_00)
  })
})

describe('calcularPRICE', () => {
  it('gera a tabela esperada no exemplo pequeno', () => {
    expect(calcularPRICE(PEQUENO)).toEqual([
      { numero: 1, prestacao: 34002, juros: 1000, amortizacao: 33002, saldoDevedor: 66998 },
      { numero: 2, prestacao: 34002, juros: 670, amortizacao: 33332, saldoDevedor: 33666 },
      // A última quita o saldo exato: 1 centavo a mais por causa do arredondamento.
      { numero: 3, prestacao: 34003, juros: 337, amortizacao: 33666, saldoDevedor: 0 },
    ])
  })

  it('prestação fixa e amortização crescente', () => {
    const parcelas = calcularPRICE({ principal: 100_000_00, taxaMensal: 0.01, prazoMeses: 10 })
    for (const p of parcelas.slice(0, -1)) {
      expect(p.prestacao).toBe(10_558_21)
    }
    for (let k = 1; k < parcelas.length; k++) {
      expect(parcelas[k]!.amortizacao).toBeGreaterThan(parcelas[k - 1]!.amortizacao)
    }
  })

  it.each(
    // Prazos longos, onde o efeito do arredondamento acumulado aparece.
    [
      { principal: 320_000_00, taxaMensal: taxaMensalDeAnualEfetiva(0.1149), prazoMeses: 360 },
      { principal: 150_000_00, taxaMensal: taxaMensalDeAnualEfetiva(0.0816), prazoMeses: 420 },
      { principal: 80_000_00, taxaMensal: 0, prazoMeses: 120 },
    ],
  )('ajuste da última parcela respeita o limite teórico do arredondamento (%o)', (params) => {
    const { taxaMensal: i, prazoMeses: n } = params
    const parcelas = calcularPRICE(params)
    const fixa = parcelas[0]!.prestacao
    // Cada mês erra no máximo 0,5 centavo; esse erro capitaliza até o fim.
    const fatorAcumulacao = i === 0 ? n : (Math.pow(1 + i, n) - 1) / i
    const limite = 0.5 * fatorAcumulacao + 1
    expect(Math.abs(parcelas.at(-1)!.prestacao - fixa)).toBeLessThanOrEqual(limite)
  })

  it('caso documentado: 360 meses a 11,49% a.a. → última parcela R$ 10,85 maior', () => {
    // Conferido com implementação independente em Python (Decimal).
    const parcelas = calcularPRICE({ principal: 320_000_00, taxaMensal: taxaMensalDeAnualEfetiva(0.1149), prazoMeses: 360 })
    expect(parcelas[0]!.prestacao).toBe(3_029_53)
    expect(parcelas.at(-1)!.prestacao).toBe(3_040_38)
  })

  it('nunca deixa saldo negativo, mesmo em entrada degenerada (13 centavos em 8 meses)', () => {
    // round(13 / 8) = 2 → 2 × 7 = 14 > 13: sem o Math.min o saldo ficaria negativo.
    const parcelas = calcularPRICE({ principal: 13, taxaMensal: 0, prazoMeses: 8 })
    expect(parcelas.every((p) => p.saldoDevedor >= 0 && p.amortizacao >= 0)).toBe(true)
    expect(soma(parcelas, 'amortizacao')).toBe(13)
    expect(parcelas.at(-1)!.saldoDevedor).toBe(0)
  })
})

// Propriedades que precisam valer para QUALQUER cenário válido, não só para
// os exemplos acima. Rodamos as duas funções numa grade de cenários.
const CENARIOS: ParametrosAmortizacao[] = [
  { principal: 320_000_00, taxaMensal: taxaMensalDeAnualEfetiva(0.1149), prazoMeses: 360 },
  { principal: 150_000_00, taxaMensal: taxaMensalDeAnualEfetiva(0.0816), prazoMeses: 420 },
  { principal: 1_000_000_00, taxaMensal: taxaMensalDeAnualEfetiva(0.13), prazoMeses: 240 },
  { principal: 50_000_00, taxaMensal: 0.01, prazoMeses: 1 },
  { principal: 99_999_99, taxaMensal: 0.0075, prazoMeses: 7 },
  { principal: 80_000_00, taxaMensal: 0, prazoMeses: 120 },
  { principal: 1, taxaMensal: 0.01, prazoMeses: PRAZO_MAXIMO_MESES },
]

describe.each([
  ['SAC', calcularSAC],
  ['PRICE', calcularPRICE],
] as const)('invariantes do %s', (_nome, calcular) => {
  it.each(CENARIOS)('cenário %o', (params) => {
    const parcelas = calcular(params)

    expect(parcelas).toHaveLength(params.prazoMeses)
    expect(parcelas.map((p) => p.numero)).toEqual(Array.from({ length: params.prazoMeses }, (_, k) => k + 1))
    // A soma das amortizações devolve exatamente o valor emprestado.
    expect(soma(parcelas, 'amortizacao')).toBe(params.principal)
    expect(parcelas.at(-1)!.saldoDevedor).toBe(0)

    for (const p of parcelas) {
      expect(Number.isInteger(p.prestacao)).toBe(true)
      expect(p.prestacao).toBe(p.juros + p.amortizacao)
      expect(p.saldoDevedor).toBeGreaterThanOrEqual(0)
      expect(p.amortizacao).toBeGreaterThanOrEqual(0)
    }

    // Saldo nunca sobe.
    for (let k = 1; k < parcelas.length; k++) {
      expect(parcelas[k]!.saldoDevedor).toBeLessThanOrEqual(parcelas[k - 1]!.saldoDevedor)
    }
  })
})

describe('SAC × PRICE', () => {
  it.each(CENARIOS.filter((c) => c.taxaMensal > 0 && c.prazoMeses > 1 && c.principal > 1_000_00))(
    'SAC paga menos juros e começa com parcela maior (%o)',
    (params) => {
      const sac = calcularSAC(params)
      const price = calcularPRICE(params)
      expect(soma(sac, 'juros')).toBeLessThan(soma(price, 'juros'))
      expect(sac[0]!.prestacao).toBeGreaterThan(price[0]!.prestacao)
      // Ao final, a última parcela do SAC é menor que a da PRICE.
      expect(sac.at(-1)!.prestacao).toBeLessThan(price.at(-1)!.prestacao)
    },
  )

  it('com taxa zero os dois sistemas cobram o mesmo total', () => {
    const params = { principal: 80_000_00, taxaMensal: 0, prazoMeses: 120 }
    expect(soma(calcularSAC(params), 'prestacao')).toBe(soma(calcularPRICE(params), 'prestacao'))
  })
})

describe('validação de parâmetros', () => {
  const invalidos: [string, ParametrosAmortizacao][] = [
    ['principal zero', { principal: 0, taxaMensal: 0.01, prazoMeses: 10 }],
    ['principal fracionado (não é centavo inteiro)', { principal: 100.5, taxaMensal: 0.01, prazoMeses: 10 }],
    ['taxa negativa', { principal: 100_00, taxaMensal: -0.01, prazoMeses: 10 }],
    ['taxa NaN', { principal: 100_00, taxaMensal: Number.NaN, prazoMeses: 10 }],
    ['prazo zero', { principal: 100_00, taxaMensal: 0.01, prazoMeses: 0 }],
    ['prazo fracionado', { principal: 100_00, taxaMensal: 0.01, prazoMeses: 12.5 }],
    ['prazo acima do máximo', { principal: 100_00, taxaMensal: 0.01, prazoMeses: PRAZO_MAXIMO_MESES + 1 }],
  ]

  it.each(invalidos)('SAC e PRICE rejeitam %s', (_caso, params) => {
    expect(() => calcularSAC(params)).toThrow(RangeError)
    expect(() => calcularPRICE(params)).toThrow(RangeError)
  })
})

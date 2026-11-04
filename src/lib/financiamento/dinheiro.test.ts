import { describe, expect, it } from 'vitest'
import { centavosParaReais, formatarBRL, formatarPercentual, reaisParaCentavos } from './dinheiro'

// Intl usa espaço não separável (U+00A0) entre "R$" e o número.
// Normalizamos para o teste não depender desse detalhe invisível.
const normalizar = (s: string) => s.replace(/\s/g, ' ')

describe('reaisParaCentavos', () => {
  it('converte reais em centavos inteiros', () => {
    expect(reaisParaCentavos(1234.56)).toBe(123456)
  })

  it('corrige o ruído de ponto flutuante (0.1 + 0.2)', () => {
    expect(reaisParaCentavos(0.1 + 0.2)).toBe(30)
  })

  it('arredonda frações de centavo', () => {
    expect(reaisParaCentavos(10.005)).toBe(1001)
    expect(reaisParaCentavos(10.004)).toBe(1000)
  })

  it('rejeita valores não numéricos', () => {
    expect(() => reaisParaCentavos(Number.NaN)).toThrow(RangeError)
  })
})

describe('centavosParaReais', () => {
  it('converte centavos em reais', () => {
    expect(centavosParaReais(123456)).toBe(1234.56)
  })
})

describe('formatarBRL', () => {
  it('formata no padrão brasileiro', () => {
    expect(normalizar(formatarBRL(123456))).toBe('R$ 1.234,56')
    expect(normalizar(formatarBRL(32_000_000))).toBe('R$ 320.000,00')
  })

  it('formata zero', () => {
    expect(normalizar(formatarBRL(0))).toBe('R$ 0,00')
  })
})

describe('formatarPercentual', () => {
  it('formata taxa decimal como percentual', () => {
    expect(normalizar(formatarPercentual(0.1149))).toBe('11,49%')
    expect(normalizar(formatarPercentual(0.3))).toBe('30,0%')
  })
})

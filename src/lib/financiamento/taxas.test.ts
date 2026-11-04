import { describe, expect, it } from 'vitest'
import { taxaAnualEfetivaDeMensal, taxaMensalDeAnualEfetiva, taxaMensalDeAnualNominal } from './taxas'

describe('taxaMensalDeAnualEfetiva', () => {
  it('converte 12% a.a. efetiva em ~0,9489% a.m. (juros compostos, não 12/12)', () => {
    expect(taxaMensalDeAnualEfetiva(0.12)).toBeCloseTo(0.009488793, 9)
  })

  it('taxa zero continua zero', () => {
    expect(taxaMensalDeAnualEfetiva(0)).toBe(0)
  })

  it('é a inversa de taxaAnualEfetivaDeMensal', () => {
    for (const anual of [0.08, 0.1149, 0.135]) {
      expect(taxaAnualEfetivaDeMensal(taxaMensalDeAnualEfetiva(anual))).toBeCloseTo(anual, 12)
    }
  })

  it.each([-0.01, Number.NaN, Number.POSITIVE_INFINITY])('rejeita taxa inválida (%s)', (taxa) => {
    expect(() => taxaMensalDeAnualEfetiva(taxa)).toThrow(RangeError)
  })
})

describe('taxaMensalDeAnualNominal', () => {
  it('divide a taxa nominal por 12', () => {
    expect(taxaMensalDeAnualNominal(0.12)).toBeCloseTo(0.01, 12)
  })

  it('rejeita taxa negativa', () => {
    expect(() => taxaMensalDeAnualNominal(-1)).toThrow(RangeError)
  })
})

describe('taxaAnualEfetivaDeMensal', () => {
  it('1% a.m. equivale a ~12,68% a.a. efetiva', () => {
    expect(taxaAnualEfetivaDeMensal(0.01)).toBeCloseTo(0.126825, 6)
  })

  it('rejeita taxa negativa', () => {
    expect(() => taxaAnualEfetivaDeMensal(-0.01)).toThrow(RangeError)
  })
})

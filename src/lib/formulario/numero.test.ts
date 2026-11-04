import { describe, expect, it } from 'vitest'
import { formatarNumeroBR, parseNumeroBR } from './numero'

describe('parseNumeroBR', () => {
  it.each([
    ['400000', 400000],
    ['400.000', 400000],
    ['1.500', 1500],
    ['1.234.567', 1234567],
    ['400.000,50', 400000.5],
    ['11,49', 11.49],
    ['11.49', 11.49], // ponto decimal colado de outro lugar
    ['1.5', 1.5],
    ['0', 0],
    ['-10', -10], // negativo passa; a validação é quem recusa
    ['  R$ 2.500,00 ', 2500],
    ['11,49%', 11.49],
  ])('"%s" → %d', (texto, esperado) => {
    expect(parseNumeroBR(texto)).toBe(esperado)
  })

  it('"1.234" é lido como milhar (ambiguidade resolvida a favor do uso brasileiro)', () => {
    expect(parseNumeroBR('1.234')).toBe(1234)
  })

  it.each(['', '   ', 'abc', '12a', '1,2,3', '1.2.3', '1.000,5,0', ',5', '1.'])('"%s" não é número', (texto) => {
    expect(parseNumeroBR(texto)).toBeNull()
  })
})

describe('formatarNumeroBR', () => {
  it('usa ponto de milhar e vírgula decimal', () => {
    expect(formatarNumeroBR(400000)).toBe('400.000')
    expect(formatarNumeroBR(11.49)).toBe('11,49')
    expect(formatarNumeroBR(2500.5)).toBe('2.500,5')
  })

  it('respeita o número de casas decimais', () => {
    expect(formatarNumeroBR(11.4925, 4)).toBe('11,4925')
    expect(formatarNumeroBR(11.4925)).toBe('11,49')
  })

  it('o que formata, o parse lê de volta', () => {
    for (const n of [0, 7, 360, 1500, 80000, 400000.5, 1234567.89, 11.49]) {
      expect(parseNumeroBR(formatarNumeroBR(n))).toBe(n)
    }
  })
})

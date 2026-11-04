import { describe, expect, it } from 'vitest'
import { avaliarComprometimento, LIMITE_COMPROMETIMENTO_PADRAO, rendaMinimaNecessaria } from './renda'

const RENDA = 10_000_00

describe('avaliarComprometimento', () => {
  it.each([
    [2_000_00, 'ok', 0.2],
    [2_500_00, 'ok', 0.25], // exatamente no início da faixa de atenção: ainda ok
    [2_500_01, 'atencao', 0.250001],
    [3_000_00, 'atencao', 0.3], // exatamente no limite: atenção, não acima
    [3_000_01, 'acima', 0.300001],
    [5_000_00, 'acima', 0.5],
  ] as const)('prestação de %i centavos → %s', (prestacao, nivel, percentual) => {
    const resultado = avaliarComprometimento(prestacao, RENDA)
    expect(resultado.nivel).toBe(nivel)
    expect(resultado.percentual).toBeCloseTo(percentual, 9)
    expect(resultado.limite).toBe(LIMITE_COMPROMETIMENTO_PADRAO)
  })

  it('aceita limite e margem personalizados', () => {
    const opcoes = { limite: 0.35, margemAtencao: 0.1 }
    expect(avaliarComprometimento(2_400_00, RENDA, opcoes).nivel).toBe('ok')
    expect(avaliarComprometimento(3_200_00, RENDA, opcoes).nivel).toBe('atencao')
    expect(avaliarComprometimento(3_600_00, RENDA, opcoes).nivel).toBe('acima')
  })

  it.each([0, -1, Number.NaN])('rejeita renda inválida (%s)', (renda) => {
    expect(() => avaliarComprometimento(1_000_00, renda)).toThrow(RangeError)
  })

  it('rejeita prestação negativa', () => {
    expect(() => avaliarComprometimento(-1, RENDA)).toThrow(RangeError)
  })
})

describe('rendaMinimaNecessaria', () => {
  it('é a prestação dividida pelo limite', () => {
    expect(rendaMinimaNecessaria(3_000_00)).toBe(10_000_00)
  })

  it('arredonda para cima, para a prestação caber no limite', () => {
    expect(rendaMinimaNecessaria(1_000_00)).toBe(333_334)
  })

  it('não é enganada por ruído de ponto flutuante (21 / 0.35 = 60.00000000000001)', () => {
    expect(rendaMinimaNecessaria(21, 0.35)).toBe(60)
  })

  it.each([0, -0.3, 1.5])('rejeita limite inválido (%s)', (limite) => {
    expect(() => rendaMinimaNecessaria(1_000_00, limite)).toThrow(RangeError)
  })
})

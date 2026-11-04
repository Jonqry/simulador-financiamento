import { describe, expect, it } from 'vitest'
import { resumir, simular, validarSimulacao, type EntradaSimulacao } from './simulacao'

// Cenário típico: imóvel de R$ 400 mil, 20% de entrada, 30 anos, 11,49% a.a.
const ENTRADA: EntradaSimulacao = {
  valorImovel: 400_000_00,
  entrada: 80_000_00,
  taxaAnual: 0.1149,
  prazoMeses: 360,
  rendaMensal: 15_000_00,
}

describe('simular', () => {
  const resultado = simular(ENTRADA)

  it('financia o valor do imóvel menos a entrada', () => {
    expect(resultado.valorFinanciado).toBe(320_000_00)
  })

  it('usa a taxa mensal equivalente à anual efetiva', () => {
    // 1,1149^(1/12) - 1 ≈ 0,9105% a.m.
    expect(resultado.taxaMensal).toBeCloseTo(0.009105, 6)
  })

  it('bate com valores conferidos fora do código (Python + Decimal)', () => {
    // 1ª SAC = floor(320.000/360) + round(320.000 × i) = 888,88 + 2.913,58.
    // (Sem o floor daria 3.802,47: a regra de arredondamento é parte da especificação.)
    expect(resultado.sac.resumo.primeiraPrestacao).toBe(3_802_46)
    expect(resultado.price.resumo.primeiraPrestacao).toBe(3_029_53)
  })

  it('calcula os dois sistemas com o prazo informado', () => {
    expect(resultado.sac.parcelas).toHaveLength(360)
    expect(resultado.price.parcelas).toHaveLength(360)
  })

  it('compara os sistemas de forma consistente com os resumos', () => {
    const { sac, price, comparacao } = resultado
    expect(comparacao.economiaJurosSac).toBe(price.resumo.totalJuros - sac.resumo.totalJuros)
    expect(comparacao.economiaJurosSac).toBeGreaterThan(0)
    expect(comparacao.diferencaPrimeiraParcela).toBe(sac.resumo.primeiraPrestacao - price.resumo.primeiraPrestacao)
    expect(comparacao.diferencaPrimeiraParcela).toBeGreaterThan(0)
  })

  it('avalia o comprometimento pela maior prestação de cada sistema', () => {
    const { sac, price } = resultado
    expect(sac.comprometimento.percentual).toBeCloseTo(sac.resumo.primeiraPrestacao / ENTRADA.rendaMensal, 12)
    const maiorPrice = Math.max(...price.parcelas.map((p) => p.prestacao))
    expect(price.comprometimento.percentual).toBeCloseTo(maiorPrice / ENTRADA.rendaMensal, 12)
  })

  it('o SAC pode estourar o limite de renda enquanto a PRICE cabe', () => {
    // Renda de R$ 11 mil: SAC R$ 3.802,47 (34,6%) × PRICE R$ 3.029,53 (27,5%).
    const r = simular({ ...ENTRADA, rendaMensal: 11_000_00 })
    expect(r.sac.comprometimento.nivel).toBe('acima')
    expect(r.price.comprometimento.nivel).toBe('atencao')
  })

  it('lança erro com a primeira mensagem de validação quando a entrada é inválida', () => {
    expect(() => simular({ ...ENTRADA, prazoMeses: 0 })).toThrow('O prazo deve ser de 1 a 420 meses.')
  })
})

describe('validarSimulacao', () => {
  it('não devolve erros para uma entrada válida', () => {
    expect(validarSimulacao(ENTRADA)).toEqual({})
  })

  it('aceita entrada zero (financiamento de 100%)', () => {
    expect(validarSimulacao({ ...ENTRADA, entrada: 0 })).toEqual({})
  })

  it('aceita taxa zero', () => {
    expect(validarSimulacao({ ...ENTRADA, taxaAnual: 0 })).toEqual({})
  })

  it('aponta cada campo inválido com sua mensagem', () => {
    expect(
      validarSimulacao({ valorImovel: 0, entrada: -1, taxaAnual: 1.5, prazoMeses: 421, rendaMensal: 0 }),
    ).toEqual({
      valorImovel: 'Informe o valor do imóvel.',
      entrada: 'A entrada não pode ser negativa.',
      taxaAnual: 'A taxa anual deve estar entre 0% e 100%.',
      prazoMeses: 'O prazo deve ser de 1 a 420 meses.',
      rendaMensal: 'Informe a renda mensal.',
    })
  })

  it('exige entrada menor que o valor do imóvel', () => {
    expect(validarSimulacao({ ...ENTRADA, entrada: ENTRADA.valorImovel })).toEqual({
      entrada: 'A entrada precisa ser menor que o valor do imóvel.',
    })
  })

  it('não compara entrada com valor do imóvel quando o valor do imóvel já é inválido', () => {
    expect(validarSimulacao({ ...ENTRADA, valorImovel: Number.NaN })).toEqual({
      valorImovel: 'Informe o valor do imóvel.',
    })
  })

  it.each([Number.NaN, 12.5])('rejeita prazo %s', (prazoMeses) => {
    expect(validarSimulacao({ ...ENTRADA, prazoMeses })).toHaveProperty('prazoMeses')
  })
})

describe('resumir', () => {
  it('soma totais e pega primeira e última prestação', () => {
    expect(
      resumir([
        { numero: 1, prestacao: 300, juros: 100, amortizacao: 200, saldoDevedor: 200 },
        { numero: 2, prestacao: 250, juros: 50, amortizacao: 200, saldoDevedor: 0 },
      ]),
    ).toEqual({ primeiraPrestacao: 300, ultimaPrestacao: 250, totalPago: 550, totalJuros: 150 })
  })

  it('rejeita tabela vazia', () => {
    expect(() => resumir([])).toThrow(RangeError)
  })
})

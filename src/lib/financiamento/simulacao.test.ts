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

describe('simular com seguros, taxa e amortização extra', () => {
  // Valores conferidos com implementação independente em Python
  // (scratch: CET por método da secante, não bissecção).
  const COMPLETA: EntradaSimulacao = {
    ...ENTRADA,
    mipMensal: 0.00025,
    dfiMensal: 0.0001,
    taxaAdministracao: 25_00,
  }
  const r = simular(COMPLETA)

  it('a parcela total soma juros, amortização, MIP, DFI e taxa', () => {
    // SAC: 3.802,46 + MIP 80,00 (320 mil × 0,025%) + DFI 40,00 (400 mil × 0,01%) + 25,00
    expect(r.sac.custos.primeiraParcela).toBe(3_947_46)
    expect(r.price.custos.primeiraParcela).toBe(3_174_53)
    expect(r.sac.custos.ultimaParcela).toBe(965_42)
    expect(r.price.custos.ultimaParcela).toBe(3_106_13)
  })

  it('totais pagos com encargos', () => {
    expect(r.sac.custos.totalPago).toBe(883_745_89)
    expect(r.price.custos.totalPago).toBe(1_135_201_66)
    expect(r.comparacao.economiaTotalSac).toBe(1_135_201_66 - 883_745_89)
  })

  it('seguros e taxa somados batem com total pago menos prestações', () => {
    for (const s of [r.sac, r.price]) {
      expect(s.custos.totalSeguros + s.custos.totalTaxaAdministracao).toBe(s.custos.totalPago - s.resumo.totalPago)
      expect(s.custos.totalTaxaAdministracao).toBe(360 * 25_00)
    }
  })

  it('CET: acima dos juros nos dois; na PRICE é menor que no SAC, mesmo custando mais no total', () => {
    expect(r.sac.custos.cetAnual).toBeCloseTo(0.121853, 5)
    expect(r.price.custos.cetAnual).toBeCloseTo(0.121188, 5)
    // Seguro DFI e taxa são fixos: com a dívida alta por mais tempo (PRICE),
    // pesam menos em proporção. CET é taxa, não total.
    expect(r.price.custos.cetAnual).toBeLessThan(r.sac.custos.cetAnual)
    expect(r.price.custos.totalPago).toBeGreaterThan(r.sac.custos.totalPago)
  })

  it('o comprometimento de renda usa a parcela total', () => {
    expect(r.sac.comprometimento.percentual).toBeCloseTo(3_947_46 / 15_000_00, 12)
  })

  it('sem extra informado, não calcula a comparação de extra', () => {
    expect(r.amortizacaoExtra).toBeUndefined()
  })

  describe('FGTS de R$ 20 mil a cada 24 meses', () => {
    const { amortizacaoExtra: extra } = simular({ ...COMPLETA, extraValor: 20_000_00, extraMes: 24, extraIntervalo: 24 })

    it('reduzir prazo: termina antes e economiza mais', () => {
      expect(extra?.SAC.prazo).toMatchObject({ prazoFinal: 192, totalJuros: 288_639_76, economia: 254_700_79, parcelaApos: 3_560_79 })
      expect(extra?.PRICE.prazo).toMatchObject({ prazoFinal: 168, totalJuros: 308_282_63, economia: 487_534_31, parcelaApos: 3_168_76 })
    })

    it('reduzir parcela: parcela menor, economia menor', () => {
      expect(extra?.SAC.parcela).toMatchObject({ prazoFinal: 240, totalJuros: 322_993_54, economia: 216_283_76, parcelaApos: 3_501_27 })
      expect(extra?.PRICE.parcela).toMatchObject({ prazoFinal: 312, totalJuros: 472_014_59, economia: 309_946_66, parcelaApos: 2_977_57 })
    })

    it('em ambos os sistemas, reduzir prazo economiza mais que reduzir parcela', () => {
      for (const sistema of ['SAC', 'PRICE'] as const) {
        expect(extra![sistema].prazo.economia).toBeGreaterThan(extra![sistema].parcela.economia)
        expect(extra![sistema].parcela.parcelaApos).toBeLessThan(extra![sistema].prazo.parcelaApos)
      }
    })

    it('soma dos extras pagos', () => {
      // No modo prazo do SAC o contrato acaba no mês 192: extras nos meses 24, 48, ..., 192 = 8 × R$ 20 mil,
      // mas o último pode ser parcial se o saldo já for menor.
      expect(extra!.SAC.prazo.totalExtras).toBeLessThanOrEqual(8 * 20_000_00)
      expect(extra!.SAC.prazo.totalExtras).toBeGreaterThan(7 * 20_000_00)
    })
  })

  it('um extra que quita tudo deixa parcelaApos = 0', () => {
    const { amortizacaoExtra: extra } = simular({ ...COMPLETA, extraValor: 1_000_000_00, extraMes: 12 })
    expect(extra?.SAC.prazo).toMatchObject({ prazoFinal: 12, parcelaApos: 0 })
  })
})

describe('validarSimulacao: seguros e extra', () => {
  it.each([
    [{ mipMensal: -0.0001 }, 'mipMensal', 'Use um valor entre 0% e 1% ao mês.'],
    [{ dfiMensal: 0.02 }, 'dfiMensal', 'Use um valor entre 0% e 1% ao mês.'],
    [{ taxaAdministracao: -1 }, 'taxaAdministracao', 'A taxa não pode ser negativa.'],
    [{ extraValor: -1 }, 'extraValor', 'O valor extra não pode ser negativo.'],
    [{ extraValor: 100, extraMes: 0 }, 'extraMes', 'Informe um mês entre 1 e 360.'],
    [{ extraValor: 100, extraMes: 361 }, 'extraMes', 'Informe um mês entre 1 e 360.'],
    [{ extraValor: 100, extraMes: 12, extraIntervalo: -24 }, 'extraIntervalo', 'Intervalo inválido.'],
  ] as const)('%o → erro em %s', (alteracao, campo, mensagem) => {
    expect(validarSimulacao({ ...ENTRADA, ...alteracao })).toEqual({ [campo]: mensagem })
  })

  it('com prazo inválido, não acusa também o mês do extra', () => {
    expect(validarSimulacao({ ...ENTRADA, prazoMeses: 0, extraValor: 100, extraMes: 12 })).toEqual({
      prazoMeses: 'O prazo deve ser de 1 a 420 meses.',
    })
  })

  it('extra zero ignora mês e intervalo', () => {
    expect(validarSimulacao({ ...ENTRADA, extraValor: 0, extraMes: Number.NaN, extraIntervalo: -5 })).toEqual({})
  })
})

import { describe, expect, it } from 'vitest'
import { ENCARGOS_EXEMPLO, SEM_ENCARGOS } from './encargos'
import { calcularFaseObra, resumirObra, type ParametrosObra } from './obra'
import { simular, validarSimulacao, type EntradaSimulacao } from './simulacao'
import { taxaMensalDeAnualEfetiva } from './taxas'

// Cenário MCMV: R$ 200 mil financiados, imóvel de R$ 250 mil, 8,16% a.a.,
// 24 meses até as chaves, 30% da obra já executada.
// Valores conferidos com implementação independente em Python (Decimal).
const MCMV: ParametrosObra = {
  financiado: 200_000_00,
  valorImovel: 250_000_00,
  taxaMensal: taxaMensalDeAnualEfetiva(0.0816),
  mesesObra: 24,
  executadaInicial: 0.3,
  encargos: ENCARGOS_EXEMPLO,
}

describe('calcularFaseObra', () => {
  const fase = calcularFaseObra(MCMV)

  it('primeiro mês: encargos só sobre o que já foi liberado (32,9%)', () => {
    expect(fase[0]).toMatchObject({
      mes: 1,
      saldoLiberado: 65_833_33, // 30% + 70% / 24
      juros: 431_75,
      mip: 16_46,
      dfi: 25_00,
      taxaAdministracao: 25_00,
      total: 498_21,
    })
    expect(fase[0]!.percentualObra).toBeCloseTo(0.3 + 0.7 / 24, 12)
  })

  it('último mês: obra em 100% e o financiamento inteiro liberado', () => {
    expect(fase.at(-1)).toMatchObject({ mes: 24, percentualObra: 1, saldoLiberado: 200_000_00, total: 1_411_64 })
  })

  it('total pago na obra e juros', () => {
    expect(resumirObra(fase)).toEqual({
      meses: 24,
      primeiroEncargo: 498_21,
      ultimoEncargo: 1_411_64,
      totalPago: 22_918_16,
      totalJuros: 20_920_64,
    })
  })

  it('o encargo cresce mês a mês, junto com a obra', () => {
    for (let k = 1; k < fase.length; k++) {
      expect(fase[k]!.saldoLiberado).toBeGreaterThan(fase[k - 1]!.saldoLiberado)
      expect(fase[k]!.total).toBeGreaterThanOrEqual(fase[k - 1]!.total)
    }
  })

  it('obra começando do zero: no 1º mês libera 1/N (como nos exemplos dos bancos)', () => {
    const [primeiro] = calcularFaseObra({ ...MCMV, executadaInicial: 0, mesesObra: 36, financiado: 360_000_00, encargos: SEM_ENCARGOS })
    expect(primeiro!.saldoLiberado).toBe(10_000_00)
  })

  it('um mês só: libera tudo', () => {
    expect(calcularFaseObra({ ...MCMV, mesesObra: 1 })).toHaveLength(1)
    expect(calcularFaseObra({ ...MCMV, mesesObra: 1 })[0]!.saldoLiberado).toBe(200_000_00)
  })

  it.each([
    [{ mesesObra: 0 }],
    [{ mesesObra: 61 }],
    [{ mesesObra: 12.5 }],
    [{ executadaInicial: 1 }],
    [{ executadaInicial: -0.1 }],
    [{ financiado: 0 }],
  ])('rejeita parâmetro inválido %o', (alteracao) => {
    expect(() => calcularFaseObra({ ...MCMV, ...alteracao })).toThrow(RangeError)
  })
})

describe('resumirObra', () => {
  it('rejeita lista vazia', () => {
    expect(() => resumirObra([])).toThrow(RangeError)
  })
})

describe('simular com imóvel na planta', () => {
  const ENTRADA: EntradaSimulacao = {
    valorImovel: 250_000_00,
    entrada: 50_000_00,
    taxaAnual: 0.0816,
    prazoMeses: 420,
    rendaMensal: 6_000_00,
    mipMensal: 0.00025,
    dfiMensal: 0.0001,
    taxaAdministracao: 25_00,
  }

  it('sem meses de obra, não há fase de obra', () => {
    expect(simular(ENTRADA).obra).toBeUndefined()
    expect(simular({ ...ENTRADA, obraMeses: 0 }).obra).toBeUndefined()
  })

  it('com obra, soma o custo da obra ao do financiamento em cada sistema', () => {
    const r = simular({ ...ENTRADA, obraMeses: 24, obraExecutada: 0.3 })
    expect(r.obra?.resumo.totalPago).toBe(22_918_16)
    expect(r.obra?.custoTotal.SAC).toBe(22_918_16 + r.sac.custos.totalPago)
    expect(r.obra?.custoTotal.PRICE).toBe(22_918_16 + r.price.custos.totalPago)
    // A fase de obra não muda as parcelas depois das chaves.
    expect(r.sac.custos.primeiraParcela).toBe(simular(ENTRADA).sac.custos.primeiraParcela)
  })

  it.each([
    [{ obraMeses: 61 }, 'obraMeses'],
    [{ obraMeses: 1.5 }, 'obraMeses'],
    [{ obraMeses: 12, obraExecutada: 1 }, 'obraExecutada'],
    [{ obraMeses: 12, obraExecutada: -0.1 }, 'obraExecutada'],
  ] as const)('valida %o → erro em %s', (alteracao, campo) => {
    expect(Object.keys(validarSimulacao({ ...ENTRADA, ...alteracao }))).toEqual([campo])
    expect(() => simular({ ...ENTRADA, ...alteracao })).toThrow(RangeError)
  })
})

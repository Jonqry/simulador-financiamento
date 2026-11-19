import { describe, expect, it } from 'vitest'
import { descreverPrograma, enquadrar, patamaresPelaRenda, PERFIL_PADRAO, sistemaPadrao, TAXAS_MERCADO, type Perfil, type Regiao } from './taxasReferencia'

const perfil = (regiao: Regiao, cotista: boolean, outros: Partial<Perfil> = {}): Perfil => ({ ...PERFIL_PADRAO, regiao, cotista, ...outros })

describe('enquadrar pela renda (imóvel ainda sem valor)', () => {
  it.each([
    // [renda, região, cotista, faixa, taxa]
    [2_000_00, 'NNE', true, 1, 0.04],
    [2_160_00, 'SSECO', false, 1, 0.0475], // limite exato da linha conta para ela
    [2_160_01, 'NNE', true, 1, 0.0425],
    [3_200_00, 'SSECO', true, 1, 0.0475],
    [3_400_00, 'NNE', false, 2, 0.0525],
    [4_900_00, 'NNE', true, 2, 0.065], // exemplo citado pelo governo (Belém)
    [7_000_00, 'NNE', true, 3, 0.0766],
    [7_000_00, 'SSECO', false, 3, 0.0816],
    [9_600_00, 'NNE', false, 3, 0.0816],
    [9_600_01, 'NNE', false, 4, 0.1],
    [13_000_00, 'NNE', false, 4, 0.1],
  ] as const)('renda %i, %s, cotista=%s → Faixa %i, %f', (renda, regiao, cotista, faixa, taxa) => {
    expect(enquadrar(renda, null, perfil(regiao, cotista))).toMatchObject({ programa: 'MCMV', faixa, faixaPelaRenda: faixa, taxaAnual: taxa })
  })

  it('informa o teto do imóvel da faixa', () => {
    expect(enquadrar(7_000_00, null, perfil('NNE', true))).toMatchObject({ faixa: 3, tetoImovel: 400_000_00 })
    expect(enquadrar(12_000_00, null, perfil('NNE', true))).toMatchObject({ faixa: 4, tetoImovel: 600_000_00 })
  })

  it('acima de R$ 13 mil é SBPE, com a taxa de referência de mercado', () => {
    expect(enquadrar(13_000_01, null, perfil('NNE', true))).toEqual({
      programa: 'SBPE',
      motivo: 'renda',
      taxaAnual: TAXAS_MERCADO.referencia,
      tetoImovel: Number.POSITIVE_INFINITY,
    })
  })

  it.each([0, -1, Number.NaN])('rejeita renda inválida (%s)', (renda) => {
    expect(() => enquadrar(renda, null, perfil('NNE', true))).toThrow(RangeError)
  })
})

describe('enquadrar pelo valor do imóvel', () => {
  // Renda de Faixa 3, não cotista, N/NE: 8,16% até R$ 400 mil.
  const faixa3 = (valor: number) => enquadrar(6_000_00, valor, perfil('NNE', false))

  it('R$ 400.000,00 ainda é Faixa 3; R$ 400.000,01 já sobe para a Faixa 4', () => {
    expect(faixa3(400_000_00)).toMatchObject({ programa: 'MCMV', faixa: 3, taxaAnual: 0.0816 })
    expect(faixa3(400_000_01)).toMatchObject({ programa: 'MCMV', faixa: 4, faixaPelaRenda: 3, taxaAnual: 0.1 })
  })

  it('até R$ 600 mil fica na Faixa 4; acima disso sai do MCMV', () => {
    expect(faixa3(600_000_00)).toMatchObject({ programa: 'MCMV', faixa: 4 })
    expect(faixa3(600_000_01)).toEqual({
      programa: 'SBPE',
      motivo: 'imovel',
      taxaAnual: TAXAS_MERCADO.referencia,
      tetoImovel: Number.POSITIVE_INFINITY,
    })
  })

  it('Faixas 1 e 2 acima de R$ 275 mil sobem direto para a Faixa 3 (a Faixa 2 tem o mesmo teto)', () => {
    expect(enquadrar(2_000_00, 275_000_00, perfil('NNE', true))).toMatchObject({ faixa: 1, taxaAnual: 0.04 })
    expect(enquadrar(2_000_00, 275_000_01, perfil('NNE', true))).toMatchObject({ faixa: 3, faixaPelaRenda: 1, taxaAnual: 0.0766 })
  })

  it('na Faixa 4, imóvel acima do teto vai para o SBPE', () => {
    expect(enquadrar(11_000_00, 650_000_00, perfil('NNE', true))).toMatchObject({ programa: 'SBPE', motivo: 'imovel' })
  })

  it('renda acima do MCMV é SBPE com qualquer imóvel', () => {
    expect(enquadrar(20_000_00, 200_000_00, perfil('NNE', true))).toMatchObject({ programa: 'SBPE', motivo: 'renda' })
  })
})

describe('patamaresPelaRenda', () => {
  it('lista os degraus do mais barato ao mais caro, terminando no SBPE', () => {
    expect(patamaresPelaRenda(2_000_00, perfil('NNE', false)).map((p) => [p.programa, p.tetoImovel])).toEqual([
      ['MCMV', 275_000_00],
      ['MCMV', 400_000_00],
      ['MCMV', 600_000_00],
      ['SBPE', Number.POSITIVE_INFINITY],
    ])
  })

  it('renda acima do MCMV tem um degrau só', () => {
    expect(patamaresPelaRenda(15_000_00, perfil('NNE', false))).toHaveLength(1)
  })
})

describe('sistemaPadrao', () => {
  it('MCMV abre em PRICE e SBPE em SAC', () => {
    expect(sistemaPadrao(enquadrar(6_000_00, null, perfil('NNE', false)))).toBe('PRICE')
    expect(sistemaPadrao(enquadrar(20_000_00, null, perfil('NNE', false)))).toBe('SAC')
  })
})

describe('descreverPrograma', () => {
  it('nomeia o programa e a faixa', () => {
    expect(descreverPrograma(enquadrar(6_000_00, 450_000_00, perfil('NNE', false)))).toBe('Minha Casa, Minha Vida · Faixa 4')
    expect(descreverPrograma(enquadrar(20_000_00, null, perfil('NNE', false)))).toBe('SBPE (taxa de mercado)')
  })
})

describe('perfil do cliente', () => {
  it('quem já tem imóvel no nome vai para o SBPE, com qualquer renda ou imóvel', () => {
    expect(enquadrar(3_000_00, 200_000_00, perfil('NNE', false, { temImovel: true }))).toEqual({
      programa: 'SBPE',
      motivo: 'imovelProprio',
      taxaAnual: TAXAS_MERCADO.referencia,
      tetoImovel: Number.POSITIVE_INFINITY,
    })
  })

  it('o teto das Faixas 1 e 2 segue o município: acima dele, sobe para a Faixa 3', () => {
    const cidade = perfil('NNE', true, { tetoFaixa12: 210_000_00 })
    expect(enquadrar(2_000_00, 210_000_00, cidade)).toMatchObject({ faixa: 1, tetoImovel: 210_000_00 })
    expect(enquadrar(2_000_00, 210_000_01, cidade)).toMatchObject({ faixa: 3, faixaPelaRenda: 1, tetoFaixaPelaRenda: 210_000_00 })
  })

  it('o teto da cidade não muda as Faixas 3 e 4', () => {
    expect(enquadrar(6_000_00, 400_000_00, perfil('NNE', false, { tetoFaixa12: 200_000_00 }))).toMatchObject({ faixa: 3 })
  })
})

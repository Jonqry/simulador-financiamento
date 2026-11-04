import { describe, expect, it } from 'vitest'
import { sugerirTaxa, TAXAS_MERCADO } from './taxasReferencia'

describe('sugerirTaxa', () => {
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
    [13_000_00, 'NNE', false, 4, 0.1],
  ] as const)('renda %i, %s, cotista=%s → Faixa %i, %f', (renda, regiao, cotista, faixa, taxa) => {
    expect(sugerirTaxa(renda, regiao, cotista)).toMatchObject({ tipo: 'mcmv', faixa, taxaAnual: taxa })
  })

  it('informa o teto do imóvel da faixa', () => {
    expect(sugerirTaxa(7_000_00, 'NNE', true)).toMatchObject({ faixa: 3, tetoImovel: 400_000_00 })
    expect(sugerirTaxa(12_000_00, 'NNE', true)).toMatchObject({ faixa: 4, tetoImovel: 600_000_00 })
  })

  it('acima de R$ 13 mil devolve a faixa de taxas de mercado', () => {
    expect(sugerirTaxa(13_000_01, 'NNE', true)).toEqual({ tipo: 'mercado', ...TAXAS_MERCADO })
  })

  it.each([0, -1, Number.NaN])('rejeita renda inválida (%s)', (renda) => {
    expect(() => sugerirTaxa(renda, 'NNE', true)).toThrow(RangeError)
  })
})

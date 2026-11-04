import type { Centavos, Taxa } from './financiamento'

/**
 * TAXAS DE REFERÊNCIA DE MERCADO — dados que MUDAM com o tempo.
 *
 * Ficam isolados neste arquivo (e não espalhados pela interface) para que
 * atualizar seja trocar números aqui e a data abaixo. A tela mostra a fonte e
 * a data, e a taxa nunca é aplicada sozinha: o usuário clica em "usar".
 *
 * Para atualizar: confira a tabela do Minha Casa, Minha Vida no site do
 * Ministério das Cidades e as taxas dos bancos, troque os valores e a data.
 */
export const ATUALIZACAO_TAXAS = {
  data: 'novembro de 2026',
  fonteMcmv: 'Ministério das Cidades (quadro de juros de 28/10/2026; faixas da Portaria MCID 333/2026)',
  fonteMercado: 'taxas "a partir de" divulgadas pelos bancos (Caixa, BB, Itaú, Santander, Bradesco) em nov/2026',
} as const

/** N/NE: Norte e Nordeste. S/SE/CO: Sul, Sudeste e Centro-Oeste. */
export type Regiao = 'NNE' | 'SSECO'

interface LinhaMcmv {
  faixa: 1 | 2 | 3 | 4
  /** Renda bruta familiar mensal máxima desta linha. */
  rendaAte: Centavos
  /** Taxa anual por [cotista do FGTS?][região]. */
  taxas: { cotista: Record<Regiao, Taxa>; naoCotista: Record<Regiao, Taxa> }
}

const linha = (faixa: LinhaMcmv['faixa'], rendaAte: Centavos, [c1, c2, n1, n2]: [number, number, number, number]): LinhaMcmv => ({
  faixa,
  rendaAte,
  taxas: { cotista: { NNE: c1 / 100, SSECO: c2 / 100 }, naoCotista: { NNE: n1 / 100, SSECO: n2 / 100 } },
})

// Colunas: [cotista N/NE, cotista S/SE/CO, não cotista N/NE, não cotista S/SE/CO], em % ao ano.
const TABELA_MCMV: readonly LinhaMcmv[] = [
  linha(1, 2_160_00, [4.0, 4.25, 4.5, 4.75]),
  linha(1, 2_850_00, [4.25, 4.5, 4.75, 5.0]),
  linha(1, 3_200_00, [4.5, 4.75, 5.0, 5.25]),
  linha(2, 3_500_00, [4.75, 5.0, 5.25, 5.5]),
  linha(2, 4_000_00, [5.5, 5.5, 6.0, 6.0]),
  linha(2, 5_000_00, [6.5, 6.5, 7.0, 7.0]),
  linha(3, 9_600_00, [7.66, 7.66, 8.16, 8.16]),
  linha(4, 13_000_00, [10.0, 10.0, 10.0, 10.0]),
]

/** Teto do valor do imóvel por faixa (Faixas 1 e 2 variam por município; este é o teto geral). */
export const TETO_IMOVEL_MCMV: Record<LinhaMcmv['faixa'], Centavos> = {
  1: 275_000_00,
  2: 275_000_00,
  3: 400_000_00,
  4: 600_000_00,
}

/** Faixa de taxas de mercado (SBPE), "a partir de", sem contar a TR. */
export const TAXAS_MERCADO = { minima: 0.1026, maxima: 0.15 } as const

export type SugestaoTaxa =
  | { tipo: 'mcmv'; faixa: LinhaMcmv['faixa']; taxaAnual: Taxa; tetoImovel: Centavos }
  | { tipo: 'mercado'; minima: Taxa; maxima: Taxa }

/**
 * Sugere uma taxa de referência pela renda bruta familiar mensal.
 * Até R$ 13 mil: Minha Casa, Minha Vida (depende de região e de ser cotista
 * do FGTS). Acima disso: faixa de taxas de mercado.
 */
export function sugerirTaxa(rendaMensal: Centavos, regiao: Regiao, cotista: boolean): SugestaoTaxa {
  if (!Number.isFinite(rendaMensal) || rendaMensal <= 0) {
    throw new RangeError(`Renda deve ser positiva (recebido: ${rendaMensal})`)
  }
  const encontrada = TABELA_MCMV.find((l) => rendaMensal <= l.rendaAte)
  if (!encontrada) {
    return { tipo: 'mercado', ...TAXAS_MERCADO }
  }
  return {
    tipo: 'mcmv',
    faixa: encontrada.faixa,
    taxaAnual: encontrada.taxas[cotista ? 'cotista' : 'naoCotista'][regiao],
    tetoImovel: TETO_IMOVEL_MCMV[encontrada.faixa],
  }
}

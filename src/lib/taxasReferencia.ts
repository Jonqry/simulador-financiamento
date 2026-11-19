import type { Centavos, Sistema, Taxa } from './financiamento'

/**
 * TAXAS DE REFERÊNCIA DE MERCADO — dados que MUDAM com o tempo.
 *
 * Ficam isolados neste arquivo (e não espalhados pela interface) para que
 * atualizar seja trocar números aqui e a data abaixo. A tela mostra a fonte e
 * a data. A taxa entra sozinha na simulação, mas o corretor pode digitar a do
 * banco por cima (ver `enquadrar`).
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

/**
 * Taxas de mercado (SBPE), "a partir de", sem contar a TR. A `referencia` é a
 * que entra na simulação automática; o corretor troca pela da proposta.
 */
export const TAXAS_MERCADO = { minima: 0.1026, maxima: 0.15, referencia: 0.1026 } as const

export type Faixa = LinhaMcmv['faixa']

/**
 * Em qual programa o cliente se enquadra e com que taxa a simulação roda.
 * `tetoImovel` é o maior imóvel desse enquadramento (no SBPE, sem teto: Infinity).
 */
export type Enquadramento =
  | {
      programa: 'MCMV'
      faixa: Faixa
      /** Faixa só pela renda. Diferente de `faixa` quando o imóvel passou do teto e subiu de faixa. */
      faixaPelaRenda: Faixa
      taxaAnual: Taxa
      tetoImovel: Centavos
    }
  | {
      programa: 'SBPE'
      /** Fora do MCMV pela renda (acima de R$ 13 mil) ou pelo valor do imóvel (acima de todos os tetos). */
      motivo: 'renda' | 'imovel'
      taxaAnual: Taxa
      tetoImovel: Centavos
    }

const taxaDaLinha = (l: LinhaMcmv, regiao: Regiao, cotista: boolean): Taxa => l.taxas[cotista ? 'cotista' : 'naoCotista'][regiao]

/**
 * Os enquadramentos possíveis para essa renda, do mais barato ao mais caro.
 *
 * A faixa vem da renda. Se o imóvel passa do teto da faixa, ele sobe para a
 * próxima faixa cujo teto é maior, com a taxa dela (ex.: renda de Faixa 3 e
 * imóvel de R$ 450 mil → Faixa 4, 10%). Acima do teto da Faixa 4, SBPE.
 * Faixas com o mesmo teto (1 e 2) não viram degraus separados.
 */
export function patamaresPelaRenda(rendaMensal: Centavos, regiao: Regiao, cotista: boolean): Enquadramento[] {
  if (!Number.isFinite(rendaMensal) || rendaMensal <= 0) {
    throw new RangeError(`Renda deve ser positiva (recebido: ${rendaMensal})`)
  }
  const sbpe = (motivo: 'renda' | 'imovel'): Enquadramento => ({
    programa: 'SBPE',
    motivo,
    taxaAnual: TAXAS_MERCADO.referencia,
    tetoImovel: Number.POSITIVE_INFINITY,
  })

  const linha = TABELA_MCMV.find((l) => rendaMensal <= l.rendaAte)
  if (!linha) return [sbpe('renda')]

  const patamares: Enquadramento[] = []
  let tetoAnterior = 0
  for (const outra of TABELA_MCMV) {
    // A linha da própria renda e, acima dela, a primeira linha de cada faixa com teto maior.
    const valeComoDegrau = outra === linha || (outra.faixa > linha.faixa && TETO_IMOVEL_MCMV[outra.faixa] > tetoAnterior)
    if (!valeComoDegrau) continue
    tetoAnterior = TETO_IMOVEL_MCMV[outra.faixa]
    patamares.push({
      programa: 'MCMV',
      faixa: outra.faixa,
      faixaPelaRenda: linha.faixa,
      taxaAnual: taxaDaLinha(outra, regiao, cotista),
      tetoImovel: tetoAnterior,
    })
  }
  patamares.push(sbpe('imovel'))
  return patamares
}

/**
 * Enquadra o cliente pela renda e pelo valor do imóvel. Sem o valor do imóvel
 * (ainda não digitado, ou no modo "quanto posso comprar"), usa a faixa da renda.
 *
 * O teto é inclusivo: R$ 400.000,00 ainda é Faixa 3; R$ 400.000,01 já não é.
 */
export function enquadrar(rendaMensal: Centavos, valorImovel: Centavos | null, regiao: Regiao, cotista: boolean): Enquadramento {
  // O último patamar (SBPE) não tem teto, então o find sempre encontra.
  return patamaresPelaRenda(rendaMensal, regiao, cotista).find((p) => valorImovel === null || valorImovel <= p.tetoImovel)!
}

/** Sistema que abre por padrão: no MCMV quase sempre se usa PRICE; no SBPE, SAC. */
export function sistemaPadrao(enquadramento: Enquadramento): Sistema {
  return enquadramento.programa === 'MCMV' ? 'PRICE' : 'SAC'
}

/** Nome do enquadramento para a tela e para o resumo do cliente. */
export function descreverPrograma(enquadramento: Enquadramento): string {
  return enquadramento.programa === 'MCMV' ? `Minha Casa, Minha Vida · Faixa ${enquadramento.faixa}` : 'SBPE (taxa de mercado)'
}

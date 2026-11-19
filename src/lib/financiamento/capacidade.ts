import { aplicarEncargos, type Encargos } from './encargos'
import { gerarTabela } from './motor'
import { LIMITE_COMPROMETIMENTO_PADRAO } from './renda'
import type { Centavos, Sistema, Taxa } from './tipos'

/**
 * Parte máxima do imóvel que o banco financia (SFH/SBPE: 80%; o resto é
 * entrada). Varia por banco e programa (ex.: 60% para usados no MCMV Faixa 4
 * no Sul/Sudeste), por isso é parâmetro.
 */
export const COTA_FINANCIAMENTO_PADRAO: Taxa = 0.8

export interface ParametrosCapacidade {
  entrada: Centavos
  rendaMensal: Centavos
  taxaMensal: Taxa
  prazoMeses: number
  encargos: Encargos
  /** Fração máxima da renda para a parcela. Padrão: 30%. */
  limiteRenda?: Taxa
  /** Fração máxima do imóvel financiada. Padrão: 80%. */
  cota?: Taxa
}

export interface Capacidade {
  valorMaximoImovel: Centavos
  financiamentoMaximo: Centavos
  /** Maior parcela total (com seguros e taxa) no financiamento máximo. */
  maiorParcela: Centavos
  /**
   * O que impede ir além:
   * - 'renda':   a parcela chegaria ao limite da renda;
   * - 'entrada': a cota de financiamento exige entrada maior.
   */
  limitadoPor: 'renda' | 'entrada'
}

type ParametrosParcela = Pick<ParametrosCapacidade, 'taxaMensal' | 'prazoMeses' | 'encargos'>

function maiorParcelaTotal(sistema: Sistema, principal: Centavos, valorImovel: Centavos, p: ParametrosParcela): Centavos {
  if (principal === 0) return 0
  const tabela = gerarTabela(sistema, { principal, taxaMensal: p.taxaMensal, prazoMeses: p.prazoMeses })
  const comEncargos = aplicarEncargos(tabela, principal, valorImovel, p.encargos)
  return Math.max(...comEncargos.map((parcela) => parcela.total))
}

/**
 * Maior valor entre 0 e `alto` para o qual `cabe` é verdadeiro, por busca
 * binária. Exige que `cabe` seja monotônico (se X cabe, menos que X também) e
 * que `cabe(0)` seja verdadeiro.
 */
function maiorQueCabe(alto: Centavos, cabe: (valor: Centavos) => boolean): Centavos {
  let baixo = 0
  while (baixo < alto) {
    const meio = Math.ceil((baixo + alto) / 2)
    if (cabe(meio)) baixo = meio
    else alto = meio - 1
  }
  return baixo
}

/**
 * Até quanto o cliente pode comprar com a renda e a entrada que tem.
 *
 * Por que busca binária e não fórmula: a parcela depende do arredondamento
 * mês a mês, do MIP (sobre o saldo) e do DFI (sobre o imóvel, que cresce junto
 * com o financiamento). Em vez de uma fórmula aproximada, testamos valores
 * com o MESMO cálculo da simulação. A parcela cresce com o valor financiado,
 * então a busca converge em ~35 passos (log2 de bilhões de centavos), e o
 * resultado nunca passa do limite, por construção.
 */
export function capacidadeDeCompra(sistema: Sistema, p: ParametrosCapacidade): Capacidade {
  const limiteRenda = p.limiteRenda ?? LIMITE_COMPROMETIMENTO_PADRAO
  const cota = p.cota ?? COTA_FINANCIAMENTO_PADRAO
  if (!Number.isFinite(cota) || cota <= 0 || cota >= 1) {
    throw new RangeError(`Cota de financiamento deve estar entre 0 e 1, exclusivos (recebido: ${cota})`)
  }
  if (!Number.isSafeInteger(p.entrada) || p.entrada < 0) {
    throw new RangeError(`Entrada deve ser um inteiro >= 0 em centavos (recebido: ${p.entrada})`)
  }

  const parcelaMaxima = Math.floor(p.rendaMensal * limiteRenda)
  const cabe = (principal: Centavos) => maiorParcelaTotal(sistema, principal, principal + p.entrada, p) <= parcelaMaxima

  // Pela cota: financiamento <= cota × (financiamento + entrada).
  const tetoPelaEntrada = Math.floor((cota * p.entrada) / (1 - cota))
  // A parcela nunca é menor que principal / prazo, então isto é um teto seguro.
  const tetoPelaRenda = parcelaMaxima * p.prazoMeses

  let financiamento: Centavos
  let limitadoPor: Capacidade['limitadoPor']

  if (tetoPelaEntrada <= tetoPelaRenda && cabe(tetoPelaEntrada)) {
    financiamento = tetoPelaEntrada
    limitadoPor = 'entrada'
  } else {
    // Financiar 0 sempre cabe, então a busca binária vale.
    financiamento = maiorQueCabe(Math.min(tetoPelaEntrada, tetoPelaRenda), cabe)
    limitadoPor = 'renda'
  }

  return {
    valorMaximoImovel: financiamento + p.entrada,
    financiamentoMaximo: financiamento,
    maiorParcela: maiorParcelaTotal(sistema, financiamento, financiamento + p.entrada, p),
    limitadoPor,
  }
}

export interface ParametrosEntradaNecessaria extends ParametrosParcela {
  valorImovel: Centavos
  rendaMensal: Centavos
  /** Fração máxima da renda para a parcela. Padrão: 30%. */
  limiteRenda?: Taxa
  /** Fração máxima do imóvel financiada. Padrão: 80%. */
  cota?: Taxa
}

/**
 * Entrada mínima (recursos + FGTS + subsídio) para comprar ESTE imóvel: a
 * maior parcela precisa caber na renda e o financiamento, na cota. É o
 * "quanto falta de entrada" quando a simulação não passa pela renda.
 *
 * Diferente de `capacidadeDeCompra`, aqui o imóvel é fixo: o DFI não muda
 * quando a entrada muda, só o valor financiado.
 */
export function entradaNecessaria(sistema: Sistema, p: ParametrosEntradaNecessaria): Centavos {
  const limiteRenda = p.limiteRenda ?? LIMITE_COMPROMETIMENTO_PADRAO
  const cota = p.cota ?? COTA_FINANCIAMENTO_PADRAO
  const parcelaMaxima = Math.floor(p.rendaMensal * limiteRenda)
  const cabe = (principal: Centavos) => maiorParcelaTotal(sistema, principal, p.valorImovel, p) <= parcelaMaxima
  const alto = Math.min(Math.floor(p.valorImovel * cota), parcelaMaxima * p.prazoMeses)
  return p.valorImovel - maiorQueCabe(alto, cabe)
}

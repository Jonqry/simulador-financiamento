import { capacidadeDeCompra, type Centavos, type Encargos, type Sistema, type Taxa } from './financiamento'
import { patamaresPelaRenda, sistemaPadrao, type Regiao } from './taxasReferencia'

export interface ParametrosImovelPelaRenda {
  rendaMensal: Centavos
  /** Entrada total (recursos + FGTS + subsídio). */
  entrada: Centavos
  prazoMeses: number
  encargos: Encargos
  cota: Taxa
  limiteRenda: Taxa
  /** Converte a taxa anual em mensal (efetiva ou nominal, conforme o formulário). */
  taxaMensalDe: (taxaAnual: Taxa) => Taxa
  regiao: Regiao
  cotista: boolean
  /** Taxa digitada pelo corretor. Com ela, as faixas não entram: vale a mesma taxa para qualquer imóvel. */
  taxaManual: Taxa | null
  /** Sistema escolhido pelo corretor; null = o padrão de cada programa (MCMV → PRICE, SBPE → SAC). */
  sistema: Sistema | null
}

export interface ImovelPelaRenda {
  valorImovel: Centavos
  financiamento: Centavos
  /** O que impede ir além: a renda, a entrada (pela cota) ou o teto da faixa do MCMV. */
  limitadoPor: 'renda' | 'entrada' | 'teto'
}

/**
 * "Quanto esse cliente pode comprar?" com as regras do MCMV.
 *
 * A taxa depende do imóvel (passou do teto, sobe de faixa e de taxa), e o
 * imóvel máximo depende da taxa. Para não andar em círculo, testa cada degrau
 * (faixa da renda, faixas acima, SBPE) com a taxa dele e limitado ao teto
 * dele. Um degrau só vale se o imóvel cai mesmo nele, isto é, passa do teto do
 * degrau anterior. Fica o maior imóvel válido.
 */
export function imovelMaximoPelaRenda(p: ParametrosImovelPelaRenda): ImovelPelaRenda {
  const patamares = patamaresPelaRenda(p.rendaMensal, p.regiao, p.cotista)
  const degraus =
    p.taxaManual === null
      ? patamares
      : [{ ...patamares[0]!, taxaAnual: p.taxaManual, tetoImovel: Number.POSITIVE_INFINITY }]

  let melhor: ImovelPelaRenda | null = null
  let tetoAnterior = 0
  for (const degrau of degraus) {
    const capacidade = capacidadeDeCompra(p.sistema ?? sistemaPadrao(degrau), {
      entrada: p.entrada,
      rendaMensal: p.rendaMensal,
      taxaMensal: p.taxaMensalDe(degrau.taxaAnual),
      prazoMeses: p.prazoMeses,
      encargos: p.encargos,
      cota: p.cota,
      limiteRenda: p.limiteRenda,
    })
    const passouDoTeto = capacidade.valorMaximoImovel > degrau.tetoImovel
    const valorImovel = passouDoTeto ? degrau.tetoImovel : capacidade.valorMaximoImovel
    if (melhor === null || valorImovel > tetoAnterior) {
      melhor = {
        valorImovel,
        financiamento: valorImovel - p.entrada,
        limitadoPor: passouDoTeto ? 'teto' : capacidade.limitadoPor,
      }
    }
    tetoAnterior = degrau.tetoImovel
  }
  return melhor!
}

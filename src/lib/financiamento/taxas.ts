import type { Taxa } from './tipos'

function validarTaxa(taxa: Taxa, nome: string): void {
  if (!Number.isFinite(taxa) || taxa < 0) {
    throw new RangeError(`${nome} deve ser um número maior ou igual a zero (recebido: ${taxa})`)
  }
}

/**
 * Converte taxa anual EFETIVA em taxa mensal equivalente (juros compostos).
 *
 * (1 + anual) = (1 + mensal)^12  →  mensal = (1 + anual)^(1/12) - 1
 *
 * Ex.: 12% a.a. efetiva ≈ 0,9489% a.m. (e não 1%).
 */
export function taxaMensalDeAnualEfetiva(taxaAnual: Taxa): Taxa {
  validarTaxa(taxaAnual, 'Taxa anual')
  return Math.pow(1 + taxaAnual, 1 / 12) - 1
}

/**
 * Converte taxa anual NOMINAL (capitalizada mensalmente) em taxa mensal.
 *
 * Bancos costumam divulgar as duas: a nominal é simplesmente dividida por 12.
 * Ex.: 12% a.a. nominal = 1% a.m. (que equivale a ~12,68% a.a. efetiva).
 */
export function taxaMensalDeAnualNominal(taxaAnual: Taxa): Taxa {
  validarTaxa(taxaAnual, 'Taxa anual')
  return taxaAnual / 12
}

/** Operação inversa: taxa mensal → taxa anual efetiva equivalente. */
export function taxaAnualEfetivaDeMensal(taxaMensal: Taxa): Taxa {
  validarTaxa(taxaMensal, 'Taxa mensal')
  return Math.pow(1 + taxaMensal, 12) - 1
}

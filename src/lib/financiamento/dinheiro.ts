import type { Centavos } from './tipos'

/** Converte um valor em reais (ex.: digitado no formulário) para centavos. */
export function reaisParaCentavos(reais: number): Centavos {
  if (!Number.isFinite(reais)) {
    throw new RangeError(`Valor em reais inválido: ${reais}`)
  }
  return Math.round(reais * 100)
}

export function centavosParaReais(centavos: Centavos): number {
  return centavos / 100
}

const formatadorBRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

/** Formata centavos como moeda brasileira: 123456 → "R$ 1.234,56". */
export function formatarBRL(centavos: Centavos): string {
  return formatadorBRL.format(centavosParaReais(centavos))
}

const formatadorPercentual = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
})

/** Formata uma taxa decimal como percentual: 0.1149 → "11,49%". */
export function formatarPercentual(taxa: number): string {
  return formatadorPercentual.format(taxa)
}

import type { Centavos, ParametrosAmortizacao } from './tipos'
import { assertParametrosValidos } from './validacao'

/**
 * Valor da prestação fixa da Tabela PRICE (fórmula de anuidade):
 *
 *   PMT = P · i / (1 - (1 + i)^-n)
 *
 * Com taxa zero a fórmula vira 0/0, então tratamos à parte: PMT = P / n.
 */
export function calcularPrestacaoPrice({ principal, taxaMensal, prazoMeses }: ParametrosAmortizacao): Centavos {
  assertParametrosValidos({ principal, taxaMensal, prazoMeses })
  if (taxaMensal === 0) {
    return Math.round(principal / prazoMeses)
  }
  const fator = taxaMensal / (1 - Math.pow(1 + taxaMensal, -prazoMeses))
  return Math.round(principal * fator)
}

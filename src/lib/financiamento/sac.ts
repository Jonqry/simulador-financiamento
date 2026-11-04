import { gerarTabela } from './motor'
import type { Parcela, ParametrosAmortizacao } from './tipos'

/**
 * Sistema de Amortização Constante (SAC).
 *
 * - A amortização é a mesma todo mês: principal / prazo.
 * - Os juros incidem sobre o saldo devedor, que cai linearmente.
 * - Resultado: prestações decrescentes; a primeira é a maior.
 *
 * Arredondamento: juros são arredondados ao centavo a cada mês, e a
 * amortização base usa Math.floor. A sobra de centavos (no máximo
 * prazo - 1 centavos) é absorvida pela última parcela, garantindo que o
 * saldo termine exatamente em zero.
 *
 * O cálculo em si fica no motor (motor.ts), compartilhado com a PRICE.
 */
export function calcularSAC(params: ParametrosAmortizacao): Parcela[] {
  return gerarTabela('SAC', params).map(({ amortizacaoExtra: _extra, ...parcela }) => parcela)
}

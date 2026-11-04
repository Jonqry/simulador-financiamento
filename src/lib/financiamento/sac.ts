import type { Parcela, ParametrosAmortizacao } from './tipos'
import { assertParametrosValidos } from './validacao'

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
 */
export function calcularSAC(params: ParametrosAmortizacao): Parcela[] {
  assertParametrosValidos(params)
  const { principal, taxaMensal, prazoMeses } = params

  const amortizacaoBase = Math.floor(principal / prazoMeses)
  const parcelas: Parcela[] = []
  let saldo = principal

  for (let numero = 1; numero <= prazoMeses; numero++) {
    const juros = Math.round(saldo * taxaMensal)
    const amortizacao = numero === prazoMeses ? saldo : amortizacaoBase
    saldo -= amortizacao

    parcelas.push({
      numero,
      prestacao: juros + amortizacao,
      juros,
      amortizacao,
      saldoDevedor: saldo,
    })
  }

  return parcelas
}

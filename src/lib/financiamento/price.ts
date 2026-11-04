import type { Centavos, Parcela, ParametrosAmortizacao } from './tipos'
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

/**
 * Sistema Francês de Amortização (Tabela PRICE).
 *
 * - A prestação é fixa durante todo o contrato.
 * - No início quase tudo é juros; a amortização cresce mês a mês.
 * - Resultado: parcela inicial menor que a do SAC, mas mais juros no total.
 *
 * Arredondamento: a prestação é arredondada ao centavo, então todo mês paga-se
 * até meio centavo a mais ou a menos que o valor exato. Essa diferença rende
 * juros até o fim do contrato, e a última parcela quita o saldo restante.
 * Em prazos longos o ajuste chega a alguns reais (ex.: R$ 10,85 em 360 meses
 * a 11,49% a.a.). Limite: 0,5 centavo × ((1 + i)^n - 1) / i. Ver docs/DECISOES.md.
 */
export function calcularPRICE(params: ParametrosAmortizacao): Parcela[] {
  const prestacaoFixa = calcularPrestacaoPrice(params)
  const { principal, taxaMensal, prazoMeses } = params

  const parcelas: Parcela[] = []
  let saldo = principal

  for (let numero = 1; numero <= prazoMeses; numero++) {
    const juros = Math.round(saldo * taxaMensal)
    // Math.min protege contra saldo negativo em entradas degeneradas
    // (ex.: principal de poucos centavos), onde o arredondamento domina.
    const amortizacao = numero === prazoMeses ? saldo : Math.min(prestacaoFixa - juros, saldo)
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

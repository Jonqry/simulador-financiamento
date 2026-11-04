import { gerarTabela } from './motor'
import type { Parcela, ParametrosAmortizacao } from './tipos'

export { calcularPrestacaoPrice } from './prestacao'

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
 *
 * O cálculo em si fica no motor (motor.ts), compartilhado com o SAC.
 */
export function calcularPRICE(params: ParametrosAmortizacao): Parcela[] {
  return gerarTabela('PRICE', params).map(({ amortizacaoExtra: _extra, ...parcela }) => parcela)
}

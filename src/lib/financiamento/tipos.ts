/**
 * Valor monetário em centavos (inteiro).
 *
 * Todo dinheiro dentro do módulo de cálculo trafega em centavos para evitar
 * erros de ponto flutuante (ex.: 0.1 + 0.2 !== 0.3). A conversão para reais
 * acontece só nas bordas: na entrada do formulário e na formatação para tela.
 */
export type Centavos = number

/** Taxa em forma decimal: 1% = 0.01. */
export type Taxa = number

export type Sistema = 'SAC' | 'PRICE'

/** Uma linha da tabela de amortização. */
export interface Parcela {
  /** Número da parcela, começando em 1. */
  numero: number
  /** Valor pago no mês (juros + amortização). */
  prestacao: Centavos
  juros: Centavos
  amortizacao: Centavos
  /** Saldo devedor depois do pagamento desta parcela. */
  saldoDevedor: Centavos
}

export interface ParametrosAmortizacao {
  principal: Centavos
  taxaMensal: Taxa
  prazoMeses: number
}

export interface ResumoSistema {
  primeiraPrestacao: Centavos
  ultimaPrestacao: Centavos
  totalPago: Centavos
  totalJuros: Centavos
}

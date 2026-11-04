import type { ParametrosAmortizacao } from './tipos'

/** Prazo máximo usual no SFH (35 anos). */
export const PRAZO_MAXIMO_MESES = 420

/**
 * Garante que os parâmetros fazem sentido antes de calcular.
 *
 * Lança RangeError porque, se chegou aqui com dado inválido, é bug de quem
 * chamou: a UI deve validar o formulário antes (ver `validarSimulacao`).
 */
export function assertParametrosValidos({ principal, taxaMensal, prazoMeses }: ParametrosAmortizacao): void {
  if (!Number.isSafeInteger(principal) || principal <= 0) {
    throw new RangeError(`Principal deve ser um inteiro positivo em centavos (recebido: ${principal})`)
  }
  if (!Number.isFinite(taxaMensal) || taxaMensal < 0) {
    throw new RangeError(`Taxa mensal deve ser maior ou igual a zero (recebido: ${taxaMensal})`)
  }
  if (!Number.isInteger(prazoMeses) || prazoMeses < 1 || prazoMeses > PRAZO_MAXIMO_MESES) {
    throw new RangeError(`Prazo deve ser um inteiro entre 1 e ${PRAZO_MAXIMO_MESES} meses (recebido: ${prazoMeses})`)
  }
}

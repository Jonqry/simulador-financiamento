import type { Centavos, Taxa } from './tipos'

/**
 * Limite de comprometimento de renda usado por padrão: 30% da renda bruta
 * mensal. É a referência mais comum nos bancos para crédito imobiliário,
 * mas cada instituição tem sua regra, por isso o valor é configurável.
 */
export const LIMITE_COMPROMETIMENTO_PADRAO: Taxa = 0.3

/** Distância (em pontos percentuais) do limite a partir da qual já alertamos. */
export const MARGEM_ATENCAO_PADRAO: Taxa = 0.05

export type NivelComprometimento = 'ok' | 'atencao' | 'acima'

export interface Comprometimento {
  /** Fração da renda tomada pela prestação: 0.25 = 25%. */
  percentual: Taxa
  nivel: NivelComprometimento
  limite: Taxa
}

export interface OpcoesComprometimento {
  limite?: Taxa
  margemAtencao?: Taxa
}

/**
 * Classifica quanto da renda a prestação compromete.
 *
 * - ok:      percentual <= limite - margem   (ex.: até 25%)
 * - atencao: entre os dois                   (ex.: 25% a 30%)
 * - acima:   percentual > limite             (ex.: acima de 30%)
 */
export function avaliarComprometimento(
  prestacao: Centavos,
  rendaMensal: Centavos,
  { limite = LIMITE_COMPROMETIMENTO_PADRAO, margemAtencao = MARGEM_ATENCAO_PADRAO }: OpcoesComprometimento = {},
): Comprometimento {
  if (!Number.isFinite(rendaMensal) || rendaMensal <= 0) {
    throw new RangeError(`Renda mensal deve ser positiva (recebido: ${rendaMensal})`)
  }
  if (!Number.isFinite(prestacao) || prestacao < 0) {
    throw new RangeError(`Prestação não pode ser negativa (recebido: ${prestacao})`)
  }

  const percentual = prestacao / rendaMensal
  let nivel: NivelComprometimento = 'ok'
  if (percentual > limite) {
    nivel = 'acima'
  } else if (percentual > limite - margemAtencao) {
    nivel = 'atencao'
  }

  return { percentual, nivel, limite }
}

/** Renda mínima para que a prestação caiba no limite. Útil para a mensagem de alerta. */
export function rendaMinimaNecessaria(prestacao: Centavos, limite: Taxa = LIMITE_COMPROMETIMENTO_PADRAO): Centavos {
  if (!Number.isFinite(limite) || limite <= 0 || limite > 1) {
    throw new RangeError(`Limite deve estar entre 0 (exclusivo) e 1 (recebido: ${limite})`)
  }
  // 21 / 0.35 dá 60.00000000000001 em ponto flutuante; sem o toFixed o
  // Math.ceil devolveria 61. Arredondar a 6 casas antes elimina esse ruído.
  return Math.ceil(Number((prestacao / limite).toFixed(6)))
}

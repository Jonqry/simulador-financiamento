import {
  reaisParaCentavos,
  validarSimulacao,
  type CampoSimulacao,
  type EntradaSimulacao,
  type ErrosSimulacao,
} from '../financiamento'
import { formatarNumeroBR, parseNumeroBR } from './numero'

/**
 * Estado do formulário: o TEXTO de cada campo, exatamente como digitado.
 *
 * Guardar string (e não number) permite estados intermediários válidos
 * enquanto a pessoa digita ("11," a caminho de "11,49") e mostrar o erro sem
 * apagar o que ela escreveu. A conversão para número acontece em `converter`.
 */
export type ValoresFormulario = Record<CampoSimulacao, string>

/** Unidade em que cada campo é digitado (reais, % a.a. ou meses). */
const VALORES_PADRAO_NUMERICOS: Record<CampoSimulacao, number> = {
  valorImovel: 400_000,
  entrada: 80_000,
  taxaAnual: 11.49,
  prazoMeses: 360,
  rendaMensal: 15_000,
}

export const CAMPOS: readonly CampoSimulacao[] = ['valorImovel', 'entrada', 'taxaAnual', 'prazoMeses', 'rendaMensal']

export function formatarValor(campo: CampoSimulacao, valor: number): string {
  return formatarNumeroBR(valor, campo === 'taxaAnual' ? 4 : 2)
}

export const VALORES_PADRAO: ValoresFormulario = Object.fromEntries(
  CAMPOS.map((campo) => [campo, formatarValor(campo, VALORES_PADRAO_NUMERICOS[campo])]),
) as ValoresFormulario

export type ResultadoConversao =
  | { ok: true; entrada: EntradaSimulacao }
  | { ok: false; erros: ErrosSimulacao }

/**
 * Converte o texto do formulário na entrada do módulo de cálculo:
 * reais → centavos, % → decimal. Erros de formato ("abc") e de regra
 * (entrada maior que o imóvel) saem no mesmo objeto, por campo.
 */
export function converter(valores: ValoresFormulario): ResultadoConversao {
  const numeros = {} as Record<CampoSimulacao, number>
  const errosFormato: ErrosSimulacao = {}

  for (const campo of CAMPOS) {
    const numero = parseNumeroBR(valores[campo])
    if (numero === null) {
      errosFormato[campo] = valores[campo].trim() === '' ? 'Campo obrigatório.' : 'Digite um número válido.'
      numeros[campo] = Number.NaN
    } else {
      numeros[campo] = numero
    }
  }

  const entrada: EntradaSimulacao = {
    valorImovel: Number.isFinite(numeros.valorImovel) ? reaisParaCentavos(numeros.valorImovel) : Number.NaN,
    entrada: Number.isFinite(numeros.entrada) ? reaisParaCentavos(numeros.entrada) : Number.NaN,
    taxaAnual: numeros.taxaAnual / 100,
    prazoMeses: numeros.prazoMeses,
    rendaMensal: Number.isFinite(numeros.rendaMensal) ? reaisParaCentavos(numeros.rendaMensal) : Number.NaN,
  }

  // O erro de formato tem prioridade: "Digite um número válido" é mais útil
  // que "Informe o valor do imóvel" quando a pessoa digitou "abc".
  const erros = { ...validarSimulacao(entrada), ...errosFormato }
  return Object.keys(erros).length > 0 ? { ok: false, erros } : { ok: true, entrada }
}

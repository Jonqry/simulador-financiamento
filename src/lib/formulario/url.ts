import type { CampoSimulacao } from '../financiamento'
import { parseNumeroBR } from './numero'
import { CAMPOS, CAMPOS_EXTRA, formatarValor, VALORES_PADRAO, type ValoresFormulario } from './valores'

/**
 * Nome curto de cada campo na URL. Curto e em português para o link ficar
 * legível quando colado no WhatsApp:
 * ?valor=400000&entrada=80000&taxa=11.49&prazo=360&renda=15000
 */
export const PARAMETROS_URL: Record<CampoSimulacao, string> = {
  valorImovel: 'valor',
  entrada: 'entrada',
  taxaAnual: 'taxa',
  prazoMeses: 'prazo',
  rendaMensal: 'renda',
  mipMensal: 'mip',
  dfiMensal: 'dfi',
  taxaAdministracao: 'adm',
  extraValor: 'extra',
  extraMes: 'mesExtra',
  extraIntervalo: 'repetir',
}

/**
 * Lê os valores do formulário a partir da query string.
 *
 * Na URL os números estão em formato de máquina ("11.49", sem milhar), lidos
 * com Number(). No formulário viram formato brasileiro ("11,49"). São dois
 * formatos de propósito: a URL precisa ser inequívoca; o input, familiar.
 *
 * Parâmetro ausente ou inválido cai no valor padrão: um link quebrado ou
 * editado à mão nunca deixa a tela vazia.
 */
export function lerDaUrl(search: string): ValoresFormulario {
  const params = new URLSearchParams(search)
  const valores = { ...VALORES_PADRAO }

  for (const campo of CAMPOS) {
    const bruto = params.get(PARAMETROS_URL[campo])
    if (bruto === null || bruto.trim() === '') continue
    const numero = Number(bruto)
    if (Number.isFinite(numero)) {
      valores[campo] = formatarValor(campo, numero)
    }
  }

  return valores
}

/**
 * Gera a query string (sem "?") a partir do formulário. Campos que não são
 * números ficam de fora: não faz sentido compartilhar um valor inválido.
 * Os campos de pagamento extra só entram quando há valor extra.
 */
export function paraQueryString(valores: ValoresFormulario): string {
  const params = new URLSearchParams()
  const temExtra = (parseNumeroBR(valores.extraValor) ?? 0) > 0
  for (const campo of CAMPOS) {
    if (!temExtra && CAMPOS_EXTRA.includes(campo)) continue
    const numero = parseNumeroBR(valores[campo])
    if (numero !== null) {
      params.set(PARAMETROS_URL[campo], String(numero))
    }
  }
  return params.toString()
}

import { parseNumeroBR } from './numero'
import {
  CAMPOS,
  CAMPOS_EXTRA,
  entradaEmPercentual,
  ESTADO_PADRAO,
  formatarValor,
  OPCOES_PADRAO,
  type CampoFormulario,
  type EstadoFormulario,
  type OpcoesFormulario,
} from './valores'

/**
 * Nome curto de cada campo na URL. Curto e em português para o link ficar
 * legível quando colado no WhatsApp:
 * ?valor=400000&entrada=80000&prazo=360&renda=15000
 */
export const PARAMETROS_URL: Record<CampoFormulario, string> = {
  valorImovel: 'valor',
  entrada: 'entrada',
  fgtsEntrada: 'fgts',
  subsidio: 'subsidio',
  taxaAnual: 'taxa',
  prazoMeses: 'prazo',
  rendaMensal: 'renda',
  mipMensal: 'mip',
  dfiMensal: 'dfi',
  taxaAdministracao: 'adm',
  cotaFinanciamento: 'cota',
  limiteRenda: 'limite',
  obraMeses: 'obra',
  obraExecutada: 'executada',
  extraValor: 'extra',
  extraMes: 'mesExtra',
  extraIntervalo: 'repetir',
  tetoFaixa12: 'teto12',
}

/**
 * Lê o formulário a partir da query string.
 *
 * Na URL os números estão em formato de máquina ("11.49", sem milhar), lidos
 * com Number(). No formulário viram formato brasileiro ("11,49"). São dois
 * formatos de propósito: a URL precisa ser inequívoca; o input, familiar.
 *
 * - Parâmetro ausente ou inválido cai no valor padrão: um link quebrado ou
 *   editado à mão nunca deixa a tela vazia.
 * - Link com `taxa=` reabre com a taxa manual: é a taxa que o corretor usou
 *   (inclusive em links feitos antes da taxa automática).
 * - O prazo vem sempre em meses; com `prazoEm=anos`, o campo mostra anos.
 * - A entrada pode vir como percentual do imóvel: `entrada=20%`.
 */
export function lerDaUrl(search: string): EstadoFormulario {
  const params = new URLSearchParams(search)
  const valores = { ...ESTADO_PADRAO.valores }
  const sistema = params.get('sistema')
  const opcoes: OpcoesFormulario = {
    modo: params.get('modo') === 'renda' ? 'renda' : 'imovel',
    regiao: params.get('regiao') === 'SSECO' ? 'SSECO' : 'NNE',
    cotista: params.get('cotista') === '1',
    temImovel: params.get('temImovel') === '1',
    taxaManual: false,
    taxaNominal: params.get('nominal') === '1',
    prazoEmAnos: params.get('prazoEm') === 'anos',
    sistema: sistema === 'SAC' || sistema === 'PRICE' ? sistema : null,
    comparar: params.get('comparar') === '1',
  }

  for (const campo of CAMPOS) {
    const bruto = params.get(PARAMETROS_URL[campo])?.trim() ?? ''
    const percentual = campo === 'entrada' && bruto.endsWith('%')
    const numero = Number(percentual ? bruto.slice(0, -1) : bruto)
    if (bruto === '' || !Number.isFinite(numero)) continue
    if (campo === 'taxaAnual') opcoes.taxaManual = true
    if (campo === 'prazoMeses' && opcoes.prazoEmAnos) {
      valores[campo] = formatarValor(campo, numero / 12)
    } else {
      valores[campo] = formatarValor(campo, numero) + (percentual ? '%' : '')
    }
  }

  return { valores, opcoes }
}

/**
 * Gera a query string (sem "?") a partir do formulário. Campos que não são
 * números ficam de fora: não faz sentido compartilhar um valor inválido.
 * Os campos de pagamento extra só entram quando há valor extra, a taxa só
 * quando é manual, e as opções só quando diferem do padrão.
 */
export function paraQueryString({ valores, opcoes }: EstadoFormulario): string {
  const params = new URLSearchParams()
  const temExtra = (parseNumeroBR(valores.extraValor) ?? 0) > 0
  for (const campo of CAMPOS) {
    if (!temExtra && CAMPOS_EXTRA.includes(campo)) continue
    if (campo === 'taxaAnual' && !opcoes.taxaManual) continue
    const numero = parseNumeroBR(valores[campo])
    if (numero === null) continue
    if (campo === 'prazoMeses' && opcoes.prazoEmAnos) {
      params.set(PARAMETROS_URL[campo], String(Math.round(numero * 12)))
    } else {
      const percentual = campo === 'entrada' && entradaEmPercentual(valores.entrada)
      params.set(PARAMETROS_URL[campo], String(numero) + (percentual ? '%' : ''))
    }
  }

  const p = OPCOES_PADRAO
  if (opcoes.modo !== p.modo) params.set('modo', opcoes.modo)
  if (opcoes.regiao !== p.regiao) params.set('regiao', opcoes.regiao)
  if (opcoes.cotista) params.set('cotista', '1')
  if (opcoes.temImovel) params.set('temImovel', '1')
  if (opcoes.taxaNominal) params.set('nominal', '1')
  if (opcoes.prazoEmAnos) params.set('prazoEm', 'anos')
  if (opcoes.sistema) params.set('sistema', opcoes.sistema)
  if (opcoes.comparar) params.set('comparar', '1')
  return params.toString()
}

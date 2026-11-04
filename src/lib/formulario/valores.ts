import {
  COTA_FINANCIAMENTO_PADRAO,
  ENCARGOS_EXEMPLO,
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

/** Como cada campo é digitado e convertido. */
type Unidade = 'reais' | 'percentual' | 'inteiro'

interface ConfigCampo {
  unidade: Unidade
  /** Vazio é erro? Os opcionais vazios valem 0 (ou "não informado"). */
  obrigatorio: boolean
  /** Valor inicial, na unidade digitada. null = começa vazio. */
  padrao: number | null
}

/** Uma tabela de configuração em vez de um if por campo: campo novo = uma linha aqui. */
// Cenário inicial típico do Minha Casa, Minha Vida (Faixa 3): imóvel de
// R$ 250 mil com 20% de entrada, 35 anos, renda de R$ 6 mil e a taxa da
// Faixa 3 para não cotista (8,16%). Nele o SAC passa de 30% da renda e a
// PRICE cabe: o trade-off que o simulador existe para mostrar.
const CONFIG: Record<CampoSimulacao, ConfigCampo> = {
  valorImovel: { unidade: 'reais', obrigatorio: true, padrao: 250_000 },
  entrada: { unidade: 'reais', obrigatorio: true, padrao: 50_000 },
  taxaAnual: { unidade: 'percentual', obrigatorio: true, padrao: 8.16 },
  prazoMeses: { unidade: 'inteiro', obrigatorio: true, padrao: 420 },
  rendaMensal: { unidade: 'reais', obrigatorio: true, padrao: 6_000 },
  mipMensal: { unidade: 'percentual', obrigatorio: false, padrao: ENCARGOS_EXEMPLO.mipMensal * 100 },
  dfiMensal: { unidade: 'percentual', obrigatorio: false, padrao: ENCARGOS_EXEMPLO.dfiMensal * 100 },
  taxaAdministracao: { unidade: 'reais', obrigatorio: false, padrao: ENCARGOS_EXEMPLO.taxaAdministracao / 100 },
  cotaFinanciamento: { unidade: 'percentual', obrigatorio: false, padrao: COTA_FINANCIAMENTO_PADRAO * 100 },
  extraValor: { unidade: 'reais', obrigatorio: false, padrao: null },
  extraMes: { unidade: 'inteiro', obrigatorio: false, padrao: null },
  extraIntervalo: { unidade: 'inteiro', obrigatorio: false, padrao: 0 },
}

export const CAMPOS = Object.keys(CONFIG) as readonly CampoSimulacao[]

/** Campos de pagamento extra: só entram na URL quando há valor extra. */
export const CAMPOS_EXTRA: readonly CampoSimulacao[] = ['extraValor', 'extraMes', 'extraIntervalo']

export function formatarValor(campo: CampoSimulacao, valor: number): string {
  return formatarNumeroBR(valor, CONFIG[campo].unidade === 'percentual' ? 4 : 2)
}

export const VALORES_PADRAO: ValoresFormulario = Object.fromEntries(
  CAMPOS.map((campo) => {
    const padrao = CONFIG[campo].padrao
    return [campo, padrao === null ? '' : formatarValor(campo, padrao)]
  }),
) as ValoresFormulario

export type ResultadoConversao =
  | { ok: true; entrada: EntradaSimulacao }
  | { ok: false; erros: ErrosSimulacao }

function paraUnidadeDoCalculo(unidade: Unidade, numero: number): number {
  if (unidade === 'reais') return reaisParaCentavos(numero)
  if (unidade === 'percentual') return numero / 100
  return numero
}

/**
 * Converte o texto do formulário na entrada do módulo de cálculo:
 * reais → centavos, % → decimal. Erros de formato ("abc") e de regra
 * (entrada maior que o imóvel) saem no mesmo objeto, por campo.
 */
export function converter(valores: ValoresFormulario): ResultadoConversao {
  const entrada: Partial<Record<CampoSimulacao, number>> = {}
  const errosFormato: ErrosSimulacao = {}

  for (const campo of CAMPOS) {
    const { unidade, obrigatorio } = CONFIG[campo]
    const texto = valores[campo]
    const numero = parseNumeroBR(texto)

    if (numero !== null) {
      entrada[campo] = paraUnidadeDoCalculo(unidade, numero)
    } else if (texto.trim() !== '') {
      errosFormato[campo] = 'Digite um número válido.'
      entrada[campo] = Number.NaN
    } else if (obrigatorio) {
      errosFormato[campo] = 'Campo obrigatório.'
      entrada[campo] = Number.NaN
    }
    // Opcional vazio: fica de fora (o cálculo usa 0 / "não informado").
  }

  // O erro de formato tem prioridade: "Digite um número válido" é mais útil
  // que "Informe o valor do imóvel" quando a pessoa digitou "abc".
  const entradaCompleta = entrada as EntradaSimulacao
  const erros = { ...validarSimulacao(entradaCompleta), ...errosFormato }
  return Object.keys(erros).length > 0 ? { ok: false, erros } : { ok: true, entrada: entradaCompleta }
}

import {
  COTA_FINANCIAMENTO_PADRAO,
  ENCARGOS_EXEMPLO,
  encargosDaEntrada,
  formatarBRL,
  entradaTotal,
  LIMITE_COMPROMETIMENTO_PADRAO,
  reaisParaCentavos,
  taxaMensalDaEntrada,
  validarSimulacao,
  type CampoSimulacao,
  type EntradaSimulacao,
  type Sistema,
} from '../financiamento'
import { imovelMaximoPelaRenda, type ImovelPelaRenda } from '../imovelPelaRenda'
import { enquadrar, TETO_IMOVEL_MCMV, type Enquadramento, type Perfil, type Regiao } from '../taxasReferencia'
import { formatarNumeroBR, parseNumeroBR } from './numero'

/**
 * Estado do formulário: o TEXTO de cada campo, exatamente como digitado.
 *
 * Guardar string (e não number) permite estados intermediários válidos
 * enquanto a pessoa digita ("11," a caminho de "11,49") e mostrar o erro sem
 * apagar o que ela escreveu. A conversão para número acontece em `converter`.
 */
export type ValoresFormulario = Record<CampoFormulario, string>

/**
 * Campos digitados: os da simulação, o teto das Faixas 1 e 2 no município (que só entra no
 * enquadramento) e a idade do comprador mais velho (que só limita o prazo).
 */
export type CampoFormulario = CampoSimulacao | 'tetoFaixa12' | 'idade'

export type ErrosFormulario = Partial<Record<CampoFormulario, string>>

/** Escolhas do formulário que não são números digitados. */
export interface OpcoesFormulario {
  /** 'imovel': o corretor informa o imóvel. 'renda': o simulador calcula o imóvel máximo. */
  modo: 'imovel' | 'renda'
  regiao: Regiao
  cotista: boolean
  /** Já tem imóvel no nome: fora do MCMV (SBPE). */
  temImovel: boolean
  /** false: a taxa vem do enquadramento (MCMV/SBPE). true: vale a taxa digitada. */
  taxaManual: boolean
  /** Taxa manual nominal (a automática é sempre nominal, como as tabelas são divulgadas). */
  taxaNominal: boolean
  /** O campo de prazo está em anos (na conta e na URL o prazo é sempre em meses). */
  prazoEmAnos: boolean
  /** Sistema escolhido pelo corretor; null = o padrão do programa (MCMV → PRICE, SBPE → SAC). */
  sistema: Sistema | null
  /** Mostra o outro sistema lado a lado. */
  comparar: boolean
}

export interface EstadoFormulario {
  valores: ValoresFormulario
  opcoes: OpcoesFormulario
}

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
// R$ 250 mil com 20% de entrada, 35 anos e renda de R$ 6 mil. A taxa vem
// sozinha do enquadramento (Faixa 3, não cotista: 8,16%), por isso começa vazia.
const CONFIG: Record<CampoFormulario, ConfigCampo> = {
  valorImovel: { unidade: 'reais', obrigatorio: true, padrao: 250_000 },
  entrada: { unidade: 'reais', obrigatorio: true, padrao: 50_000 },
  fgtsEntrada: { unidade: 'reais', obrigatorio: false, padrao: null },
  subsidio: { unidade: 'reais', obrigatorio: false, padrao: null },
  taxaAnual: { unidade: 'percentual', obrigatorio: true, padrao: null },
  prazoMeses: { unidade: 'inteiro', obrigatorio: true, padrao: 420 },
  rendaMensal: { unidade: 'reais', obrigatorio: true, padrao: 6_000 },
  mipMensal: { unidade: 'percentual', obrigatorio: false, padrao: ENCARGOS_EXEMPLO.mipMensal * 100 },
  dfiMensal: { unidade: 'percentual', obrigatorio: false, padrao: ENCARGOS_EXEMPLO.dfiMensal * 100 },
  taxaAdministracao: { unidade: 'reais', obrigatorio: false, padrao: ENCARGOS_EXEMPLO.taxaAdministracao / 100 },
  cotaFinanciamento: { unidade: 'percentual', obrigatorio: false, padrao: COTA_FINANCIAMENTO_PADRAO * 100 },
  limiteRenda: { unidade: 'percentual', obrigatorio: false, padrao: LIMITE_COMPROMETIMENTO_PADRAO * 100 },
  obraMeses: { unidade: 'inteiro', obrigatorio: false, padrao: null },
  obraExecutada: { unidade: 'percentual', obrigatorio: false, padrao: null },
  extraValor: { unidade: 'reais', obrigatorio: false, padrao: null },
  extraMes: { unidade: 'inteiro', obrigatorio: false, padrao: null },
  extraIntervalo: { unidade: 'inteiro', obrigatorio: false, padrao: 0 },
  tetoFaixa12: { unidade: 'reais', obrigatorio: false, padrao: TETO_IMOVEL_MCMV[1] / 100 },
  idade: { unidade: 'inteiro', obrigatorio: false, padrao: null },
}

export const CAMPOS = Object.keys(CONFIG) as readonly CampoFormulario[]

/** Campos de pagamento extra: só entram na URL quando há valor extra. */
export const CAMPOS_EXTRA: readonly CampoFormulario[] = ['extraValor', 'extraMes', 'extraIntervalo']

export function formatarValor(campo: CampoFormulario, valor: number): string {
  return formatarNumeroBR(valor, CONFIG[campo].unidade === 'percentual' ? 4 : 2)
}

export const VALORES_PADRAO: ValoresFormulario = Object.fromEntries(
  CAMPOS.map((campo) => {
    const padrao = CONFIG[campo].padrao
    return [campo, padrao === null ? '' : formatarValor(campo, padrao)]
  }),
) as ValoresFormulario

export const OPCOES_PADRAO: OpcoesFormulario = {
  modo: 'imovel',
  regiao: 'NNE',
  cotista: false,
  temImovel: false,
  taxaManual: false,
  taxaNominal: false,
  prazoEmAnos: false,
  sistema: null,
  comparar: false,
}

export const ESTADO_PADRAO: EstadoFormulario = { valores: VALORES_PADRAO, opcoes: OPCOES_PADRAO }

/** A entrada pode ser digitada como percentual do imóvel: "20%". */
export const entradaEmPercentual = (texto: string) => texto.includes('%')

/** Texto do prazo ao trocar a unidade: "420" meses ↔ "35" anos. Texto inválido fica como está. */
export function converterTextoPrazo(texto: string, paraAnos: boolean): string {
  const numero = parseNumeroBR(texto)
  if (numero === null) return texto
  return paraAnos ? formatarValor('prazoMeses', numero / 12) : formatarValor('prazoMeses', Math.round(numero * 12))
}

export type ResultadoConversao =
  | {
      ok: true
      entrada: EntradaSimulacao
      enquadramento: Enquadramento
      perfil: Perfil
      /** No modo pela renda: o que limitou o imóvel calculado. */
      imovelPelaRenda?: ImovelPelaRenda
    }
  | {
      ok: false
      erros: ErrosFormulario
      /** Quando a renda já é válida, o enquadramento sai mesmo com outros erros (a tela mostra a faixa). */
      enquadramento: Enquadramento | null
    }

function paraUnidadeDoCalculo(unidade: Unidade, numero: number): number {
  if (unidade === 'reais') return reaisParaCentavos(numero)
  if (unidade === 'percentual') return numero / 100
  return numero
}

/**
 * Imóvel máximo pela renda com os números já convertidos do formulário.
 * Usado no modo "quanto posso comprar" e nas saídas de uma simulação reprovada.
 */
export function calcularImovelPelaRenda(entrada: EntradaSimulacao, opcoes: OpcoesFormulario, perfil: Perfil): ImovelPelaRenda {
  return imovelMaximoPelaRenda({
    rendaMensal: entrada.rendaMensal,
    entrada: entradaTotal(entrada),
    prazoMeses: entrada.prazoMeses,
    encargos: encargosDaEntrada(entrada),
    cota: entrada.cotaFinanciamento ?? COTA_FINANCIAMENTO_PADRAO,
    limiteRenda: entrada.limiteRenda ?? LIMITE_COMPROMETIMENTO_PADRAO,
    taxaMensalDe: (taxaAnual) => taxaMensalDaEntrada({ taxaAnual, taxaNominal: entrada.taxaNominal }),
    perfil,
    taxaManual: opcoes.taxaManual ? entrada.taxaAnual : null,
    sistema: opcoes.sistema,
  })
}

/** Idade + prazo não pode passar de 80 anos e 6 meses (966 meses). */
export const PRAZO_LIMITE_IDADE_MESES = 80 * 12 + 6

/** Imóvel provisório no modo pela renda, só para validar os outros campos antes de calcular o imóvel. */
const IMOVEL_PROVISORIO = Number.MAX_SAFE_INTEGER

/**
 * Converte o texto do formulário na entrada do módulo de cálculo:
 * reais → centavos, % → decimal, anos → meses. Também decide a taxa (pelo
 * enquadramento, a não ser que o corretor tenha digitado uma) e, no modo pela
 * renda, o valor do imóvel. Erros de formato ("abc") e de regra (entrada maior
 * que o imóvel) saem no mesmo objeto, por campo.
 */
export function converter(valores: ValoresFormulario, opcoes: OpcoesFormulario): ResultadoConversao {
  const pelaRenda = opcoes.modo === 'renda'
  const numeros: Partial<Record<CampoFormulario, number>> = {}
  const errosFormato: ErrosFormulario = {}

  for (const campo of CAMPOS) {
    // Campos que o próprio simulador preenche: o imóvel (pela renda) e a taxa (automática).
    if ((campo === 'valorImovel' && pelaRenda) || (campo === 'taxaAnual' && !opcoes.taxaManual)) continue
    const { unidade, obrigatorio } = CONFIG[campo]
    const texto = valores[campo]
    const numero = parseNumeroBR(texto)

    if (numero !== null) {
      numeros[campo] = paraUnidadeDoCalculo(unidade, numero)
    } else if (texto.trim() !== '') {
      errosFormato[campo] = 'Digite um número válido.'
      numeros[campo] = Number.NaN
    } else if (obrigatorio) {
      errosFormato[campo] = 'Campo obrigatório.'
      numeros[campo] = Number.NaN
    }
    // Opcional vazio: fica de fora (o cálculo usa 0 / "não informado").
  }

  // As taxas das tabelas (MCMV e SBPE) são nominais; a manual segue a escolha do corretor.
  const { tetoFaixa12, idade, ...daSimulacao } = numeros
  const entrada = { ...daSimulacao, taxaNominal: !opcoes.taxaManual || opcoes.taxaNominal } as EntradaSimulacao
  if (opcoes.prazoEmAnos) entrada.prazoMeses = Math.round(entrada.prazoMeses * 12)
  if (pelaRenda) entrada.valorImovel = IMOVEL_PROVISORIO

  if (entradaEmPercentual(valores.entrada) && !errosFormato.entrada) {
    if (pelaRenda) {
      errosFormato.entrada = 'Para calcular o imóvel pela renda, informe a entrada em reais.'
    } else if (Number.isFinite(entrada.valorImovel)) {
      // "20%": percentual do imóvel, e não R$ 20.
      entrada.entrada = Math.round((entrada.valorImovel * parseNumeroBR(valores.entrada)!) / 100)
    }
  }

  const rendaValida = Number.isFinite(entrada.rendaMensal) && entrada.rendaMensal > 0
  // Sem renda não há enquadramento: a taxa automática fica num valor neutro e o erro aparece na renda.
  if (!opcoes.taxaManual) entrada.taxaAnual = 0

  const errosRegra: ErrosFormulario = {}
  const tetoGeral = TETO_IMOVEL_MCMV[1]
  if (tetoFaixa12 !== undefined && !errosFormato.tetoFaixa12 && (tetoFaixa12 <= 0 || tetoFaixa12 > tetoGeral)) {
    errosRegra.tetoFaixa12 = `Use um valor de até ${formatarBRL(tetoGeral)}.`
  }
  // Idade + prazo até 80 anos e 6 meses (regra das seguradoras). A idade é em anos
  // completos; o banco usa a data de nascimento, então o limite real pode ser alguns meses menor.
  if (idade !== undefined && !errosFormato.idade) {
    if (!Number.isInteger(idade) || idade < 18 || idade > 80) {
      errosRegra.idade = 'Use uma idade entre 18 e 80 anos.'
    } else if (Number.isFinite(entrada.prazoMeses) && entrada.prazoMeses > PRAZO_LIMITE_IDADE_MESES - idade * 12) {
      errosRegra.prazoMeses = `Com ${idade} anos, o prazo vai até ${PRAZO_LIMITE_IDADE_MESES - idade * 12} meses: idade + prazo até 80 anos e 6 meses.`
    }
  }
  const tetoValido = tetoFaixa12 !== undefined && !errosFormato.tetoFaixa12 && !errosRegra.tetoFaixa12
  const perfil: Perfil = {
    regiao: opcoes.regiao,
    cotista: opcoes.cotista,
    temImovel: opcoes.temImovel,
    tetoFaixa12: tetoValido ? tetoFaixa12 : tetoGeral,
  }
  let imovelPelaRenda: ImovelPelaRenda | undefined
  let enquadramento: Enquadramento | null = null

  if (rendaValida) {
    if (pelaRenda && Object.keys({ ...validarSimulacao(entrada), ...errosFormato }).length === 0) {
      imovelPelaRenda = calcularImovelPelaRenda(entrada, opcoes, perfil)
      entrada.valorImovel = imovelPelaRenda.valorImovel
      if (imovelPelaRenda.financiamento === 0) {
        if (imovelPelaRenda.limitadoPor === 'entrada') {
          errosRegra.entrada = 'Sem entrada não dá para financiar: o banco cobre só parte do imóvel (veja a cota).'
        } else {
          errosRegra.rendaMensal = 'Com essa renda, a parcela não cabe em nenhum financiamento.'
        }
      }
    }
    const valorConhecido = Number.isFinite(entrada.valorImovel) && entrada.valorImovel !== IMOVEL_PROVISORIO
    enquadramento = enquadrar(entrada.rendaMensal, valorConhecido ? entrada.valorImovel : null, perfil)
    if (!opcoes.taxaManual) entrada.taxaAnual = enquadramento.taxaAnual
  }

  // Ordem de prioridade: erro de formato ("Digite um número válido") > erro do modo pela renda > regra geral.
  const regraGeral = validarSimulacao(entrada)
  if (errosRegra.entrada || errosRegra.rendaMensal) delete regraGeral.entrada
  const erros = { ...regraGeral, ...errosRegra, ...errosFormato }
  if (Object.keys(erros).length > 0) return { ok: false, erros, enquadramento }
  return { ok: true, entrada, enquadramento: enquadramento!, perfil, ...(imovelPelaRenda && { imovelPelaRenda }) }
}

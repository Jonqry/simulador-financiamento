import { capacidadeDeCompra, type Capacidade } from './capacidade'
import { calcularCetAnual } from './cet'
import { aplicarEncargos, type ComEncargos, type Encargos } from './encargos'
import { extrasRecorrentes, gerarTabela, type ModoAmortizacaoExtra, type ParcelaComExtra } from './motor'
import { avaliarComprometimento, type Comprometimento } from './renda'
import { taxaMensalDeAnualEfetiva } from './taxas'
import type { Centavos, Parcela, ParametrosAmortizacao, ResumoSistema, Sistema, Taxa } from './tipos'
import { PRAZO_MAXIMO_MESES } from './validacao'

/**
 * Dados que o usuário informa no formulário (já convertidos para centavos).
 * Plano de propósito (sem objetos aninhados): cada campo do formulário é uma
 * chave, e os erros de validação usam as mesmas chaves.
 */
export interface EntradaSimulacao {
  valorImovel: Centavos
  entrada: Centavos
  /** Taxa de juros anual efetiva, em decimal (11,49% = 0.1149). */
  taxaAnual: Taxa
  prazoMeses: number
  rendaMensal: Centavos
  /** Seguro MIP, % ao mês sobre o saldo devedor (0,025% = 0.00025). Padrão: 0. */
  mipMensal?: Taxa
  /** Seguro DFI, % ao mês sobre o valor do imóvel. Padrão: 0. */
  dfiMensal?: Taxa
  /** Taxa de administração mensal. Padrão: 0. */
  taxaAdministracao?: Centavos
  /** Pagamento extra (ex.: FGTS). 0 ou ausente = sem simulação de extra. */
  extraValor?: Centavos
  /** Mês do (primeiro) pagamento extra. */
  extraMes?: number
  /** Repetir o extra a cada N meses (24 = regra do FGTS). 0 = uma vez só. */
  extraIntervalo?: number
}

export type ParcelaSimulada = ComEncargos<Parcela>

/** Totais que incluem seguros e taxa: o que o cliente realmente paga. */
export interface ResumoCustos {
  primeiraParcela: Centavos
  ultimaParcela: Centavos
  totalSeguros: Centavos
  totalTaxaAdministracao: Centavos
  totalPago: Centavos
  /** Custo efetivo total anual estimado (decimal). */
  cetAnual: Taxa
}

export interface ResultadoSistema {
  parcelas: ParcelaSimulada[]
  /** Só juros + amortização. */
  resumo: ResumoSistema
  /** Com seguros e taxa. */
  custos: ResumoCustos
  /** Avaliado sobre a MAIOR parcela total (no SAC, a primeira). */
  comprometimento: Comprometimento
}

export interface ResumoExtra {
  /** Em quantos meses o contrato termina com os extras. */
  prazoFinal: number
  totalJuros: Centavos
  totalPago: Centavos
  totalExtras: Centavos
  /** Quanto se deixa de pagar em relação ao cenário sem extra (juros + seguros + taxa). */
  economia: Centavos
  /** Parcela total no mês seguinte ao primeiro extra. */
  parcelaApos: Centavos
}

export type ComparacaoExtra = Record<Sistema, Record<ModoAmortizacaoExtra, ResumoExtra>>

export interface ResultadoSimulacao {
  entrada: Centavos
  valorFinanciado: Centavos
  taxaMensal: Taxa
  sac: ResultadoSistema
  price: ResultadoSistema
  comparacao: {
    /** Quanto o SAC economiza em juros em relação à PRICE (>= 0 se taxa > 0). */
    economiaJurosSac: Centavos
    /** Diferença no total pago (com seguros e taxa). */
    economiaTotalSac: Centavos
    /** Quanto a 1ª parcela total do SAC é maior que a da PRICE. */
    diferencaPrimeiraParcela: Centavos
  }
  /** Até quanto o cliente pode comprar com essa renda, entrada, taxa e prazo. */
  capacidade: Record<Sistema, Capacidade>
  /** Presente só quando há pagamento extra informado. */
  amortizacaoExtra?: ComparacaoExtra
}

export type CampoSimulacao = keyof EntradaSimulacao
export type ErrosSimulacao = Partial<Record<CampoSimulacao, string>>

const ehInteiroEntre = (n: number, min: number, max: number) => Number.isInteger(n) && n >= min && n <= max

/**
 * Validação voltada ao usuário: devolve mensagens por campo em vez de lançar
 * exceção, para a UI exibir cada erro ao lado do input correspondente.
 */
export function validarSimulacao(e: EntradaSimulacao): ErrosSimulacao {
  const erros: ErrosSimulacao = {}

  if (!Number.isFinite(e.valorImovel) || e.valorImovel <= 0) {
    erros.valorImovel = 'Informe o valor do imóvel.'
  }
  if (!Number.isFinite(e.entrada) || e.entrada < 0) {
    erros.entrada = 'A entrada não pode ser negativa.'
  } else if (!erros.valorImovel && e.entrada >= e.valorImovel) {
    erros.entrada = 'A entrada precisa ser menor que o valor do imóvel.'
  }
  if (!Number.isFinite(e.taxaAnual) || e.taxaAnual < 0 || e.taxaAnual > 1) {
    erros.taxaAnual = 'A taxa anual deve estar entre 0% e 100%.'
  }
  const prazoValido = ehInteiroEntre(e.prazoMeses, 1, PRAZO_MAXIMO_MESES)
  if (!prazoValido) {
    erros.prazoMeses = `O prazo deve ser de 1 a ${PRAZO_MAXIMO_MESES} meses.`
  }
  if (!Number.isFinite(e.rendaMensal) || e.rendaMensal <= 0) {
    erros.rendaMensal = 'Informe a renda mensal.'
  }

  for (const campo of ['mipMensal', 'dfiMensal'] as const) {
    const taxa = e[campo] ?? 0
    if (!Number.isFinite(taxa) || taxa < 0 || taxa > 0.01) {
      erros[campo] = 'Use um valor entre 0% e 1% ao mês.'
    }
  }
  const taxaAdministracao = e.taxaAdministracao ?? 0
  if (!Number.isFinite(taxaAdministracao) || taxaAdministracao < 0) {
    erros.taxaAdministracao = 'A taxa não pode ser negativa.'
  }

  const extraValor = e.extraValor ?? 0
  if (!Number.isFinite(extraValor) || extraValor < 0) {
    erros.extraValor = 'O valor extra não pode ser negativo.'
  } else if (extraValor > 0) {
    const extraMes = e.extraMes ?? Number.NaN
    if (prazoValido && !ehInteiroEntre(extraMes, 1, e.prazoMeses)) {
      erros.extraMes = `Informe um mês entre 1 e ${e.prazoMeses}.`
    }
    const intervalo = e.extraIntervalo ?? 0
    if (!ehInteiroEntre(intervalo, 0, PRAZO_MAXIMO_MESES)) {
      erros.extraIntervalo = 'Intervalo inválido.'
    }
  }

  return erros
}

export function resumir(parcelas: Parcela[]): ResumoSistema {
  const primeira = parcelas[0]
  const ultima = parcelas.at(-1)
  if (!primeira || !ultima) {
    throw new RangeError('Não é possível resumir uma tabela sem parcelas')
  }

  let totalPago = 0
  let totalJuros = 0
  for (const p of parcelas) {
    totalPago += p.prestacao
    totalJuros += p.juros
  }

  return {
    primeiraPrestacao: primeira.prestacao,
    ultimaPrestacao: ultima.prestacao,
    totalPago,
    totalJuros,
  }
}

/** Totais com encargos. Os extras (se houver) entram no fluxo do CET. */
function resumirCustos(parcelas: ComEncargos<Parcela & Partial<ParcelaComExtra>>[], principal: Centavos): ResumoCustos {
  let totalSeguros = 0
  let totalTaxaAdministracao = 0
  let totalPago = 0
  for (const p of parcelas) {
    totalSeguros += p.mip + p.dfi
    totalTaxaAdministracao += p.taxaAdministracao
    totalPago += p.total + (p.amortizacaoExtra ?? 0)
  }
  return {
    primeiraParcela: parcelas[0]!.total,
    ultimaParcela: parcelas.at(-1)!.total,
    totalSeguros,
    totalTaxaAdministracao,
    totalPago,
    cetAnual: calcularCetAnual(
      principal,
      parcelas.map((p) => p.total + (p.amortizacaoExtra ?? 0)),
    ),
  }
}

function montarResultado(parcelas: ParcelaSimulada[], principal: Centavos, rendaMensal: Centavos): ResultadoSistema {
  const maiorParcela = Math.max(...parcelas.map((p) => p.total))
  return {
    parcelas,
    resumo: resumir(parcelas),
    custos: resumirCustos(parcelas, principal),
    comprometimento: avaliarComprometimento(maiorParcela, rendaMensal),
  }
}

function simularExtra(
  sistema: Sistema,
  params: ParametrosAmortizacao,
  entrada: EntradaSimulacao,
  encargos: Encargos,
  semExtra: ResultadoSistema,
): Record<ModoAmortizacaoExtra, ResumoExtra> {
  const primeiroMes = entrada.extraMes!
  const extras = extrasRecorrentes(primeiroMes, entrada.extraValor!, entrada.extraIntervalo ?? 0, params.prazoMeses)

  const resumirModo = (modo: ModoAmortizacaoExtra): ResumoExtra => {
    const tabela = aplicarEncargos(gerarTabela(sistema, params, { extras, modo }), params.principal, entrada.valorImovel, encargos)
    const custos = resumirCustos(tabela, params.principal)
    const totalExtras = tabela.reduce((soma, p) => soma + p.amortizacaoExtra, 0)
    return {
      prazoFinal: tabela.length,
      totalJuros: tabela.reduce((soma, p) => soma + p.juros, 0),
      totalPago: custos.totalPago,
      totalExtras,
      economia: semExtra.custos.totalPago - custos.totalPago,
      // Se o extra quitou tudo, não há parcela depois.
      parcelaApos: tabela[primeiroMes]?.total ?? 0,
    }
  }

  return { prazo: resumirModo('prazo'), parcela: resumirModo('parcela') }
}

/** Ponto de entrada da UI: calcula SAC e PRICE lado a lado e compara. */
export function simular(entrada: EntradaSimulacao): ResultadoSimulacao {
  const erros = validarSimulacao(entrada)
  const primeiroErro = Object.values(erros)[0]
  if (primeiroErro) {
    throw new RangeError(primeiroErro)
  }

  const valorFinanciado = entrada.valorImovel - entrada.entrada
  const taxaMensal = taxaMensalDeAnualEfetiva(entrada.taxaAnual)
  const params = { principal: valorFinanciado, taxaMensal, prazoMeses: entrada.prazoMeses }
  const encargos: Encargos = {
    mipMensal: entrada.mipMensal ?? 0,
    dfiMensal: entrada.dfiMensal ?? 0,
    taxaAdministracao: entrada.taxaAdministracao ?? 0,
  }

  const tabela = (sistema: Sistema) =>
    aplicarEncargos(
      gerarTabela(sistema, params).map(({ amortizacaoExtra: _extra, ...parcela }) => parcela),
      valorFinanciado,
      entrada.valorImovel,
      encargos,
    )
  const paramsCapacidade = {
    entrada: entrada.entrada,
    rendaMensal: entrada.rendaMensal,
    taxaMensal,
    prazoMeses: entrada.prazoMeses,
    encargos,
  }
  const sac = montarResultado(tabela('SAC'), valorFinanciado, entrada.rendaMensal)
  const price = montarResultado(tabela('PRICE'), valorFinanciado, entrada.rendaMensal)

  const resultado: ResultadoSimulacao = {
    entrada: entrada.entrada,
    valorFinanciado,
    taxaMensal,
    sac,
    price,
    comparacao: {
      economiaJurosSac: price.resumo.totalJuros - sac.resumo.totalJuros,
      economiaTotalSac: price.custos.totalPago - sac.custos.totalPago,
      diferencaPrimeiraParcela: sac.custos.primeiraParcela - price.custos.primeiraParcela,
    },
    capacidade: {
      SAC: capacidadeDeCompra('SAC', paramsCapacidade),
      PRICE: capacidadeDeCompra('PRICE', paramsCapacidade),
    },
  }

  if ((entrada.extraValor ?? 0) > 0) {
    resultado.amortizacaoExtra = {
      SAC: simularExtra('SAC', params, entrada, encargos, sac),
      PRICE: simularExtra('PRICE', params, entrada, encargos, price),
    }
  }

  return resultado
}

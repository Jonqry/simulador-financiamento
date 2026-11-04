import { avaliarComprometimento, type Comprometimento } from './renda'
import { calcularPRICE } from './price'
import { calcularSAC } from './sac'
import { taxaMensalDeAnualEfetiva } from './taxas'
import type { Centavos, Parcela, ResumoSistema, Taxa } from './tipos'
import { PRAZO_MAXIMO_MESES } from './validacao'

/** Dados que o usuário informa no formulário (já convertidos para centavos). */
export interface EntradaSimulacao {
  valorImovel: Centavos
  entrada: Centavos
  /** Taxa de juros anual efetiva, em decimal (11,49% = 0.1149). */
  taxaAnual: Taxa
  prazoMeses: number
  rendaMensal: Centavos
}

export interface ResultadoSistema {
  parcelas: Parcela[]
  resumo: ResumoSistema
  /** Avaliado sobre a MAIOR prestação (no SAC, a primeira). */
  comprometimento: Comprometimento
}

export interface ResultadoSimulacao {
  valorFinanciado: Centavos
  taxaMensal: Taxa
  sac: ResultadoSistema
  price: ResultadoSistema
  comparacao: {
    /** Quanto o SAC economiza em juros em relação à PRICE (>= 0 se taxa > 0). */
    economiaJurosSac: Centavos
    /** Quanto a 1ª parcela do SAC é maior que a da PRICE. */
    diferencaPrimeiraParcela: Centavos
  }
}

export type CampoSimulacao = keyof EntradaSimulacao
export type ErrosSimulacao = Partial<Record<CampoSimulacao, string>>

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
  if (!Number.isInteger(e.prazoMeses) || e.prazoMeses < 1 || e.prazoMeses > PRAZO_MAXIMO_MESES) {
    erros.prazoMeses = `O prazo deve ser de 1 a ${PRAZO_MAXIMO_MESES} meses.`
  }
  if (!Number.isFinite(e.rendaMensal) || e.rendaMensal <= 0) {
    erros.rendaMensal = 'Informe a renda mensal.'
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

function montarResultado(parcelas: Parcela[], rendaMensal: Centavos): ResultadoSistema {
  const maiorPrestacao = Math.max(...parcelas.map((p) => p.prestacao))
  return {
    parcelas,
    resumo: resumir(parcelas),
    comprometimento: avaliarComprometimento(maiorPrestacao, rendaMensal),
  }
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

  const sac = montarResultado(calcularSAC(params), entrada.rendaMensal)
  const price = montarResultado(calcularPRICE(params), entrada.rendaMensal)

  return {
    valorFinanciado,
    taxaMensal,
    sac,
    price,
    comparacao: {
      economiaJurosSac: price.resumo.totalJuros - sac.resumo.totalJuros,
      diferencaPrimeiraParcela: sac.resumo.primeiraPrestacao - price.resumo.primeiraPrestacao,
    },
  }
}

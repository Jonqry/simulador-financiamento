import { calcularPrestacaoPrice } from './prestacao'
import type { Centavos, Parcela, ParametrosAmortizacao, Sistema } from './tipos'
import { assertParametrosValidos } from './validacao'

/**
 * O que fazer depois de um pagamento extra:
 * - 'prazo':   mantém a parcela e termina antes (economiza mais juros);
 * - 'parcela': mantém o prazo e recalcula uma parcela menor.
 */
export type ModoAmortizacaoExtra = 'prazo' | 'parcela'

export interface AmortizacaoExtra {
  /** Mês em que o extra é pago, junto com a parcela daquele mês. */
  mes: number
  valor: Centavos
}

export interface ParcelaComExtra extends Parcela {
  /** Pagamento extra feito neste mês (0 se não houve). */
  amortizacaoExtra: Centavos
}

export interface OpcoesTabela {
  extras?: AmortizacaoExtra[]
  modo?: ModoAmortizacaoExtra
}

function agruparExtras(extras: AmortizacaoExtra[], prazoMeses: number): Map<number, Centavos> {
  const porMes = new Map<number, Centavos>()
  for (const { mes, valor } of extras) {
    if (!Number.isInteger(mes) || mes < 1 || mes > prazoMeses) {
      throw new RangeError(`Mês do pagamento extra deve estar entre 1 e ${prazoMeses} (recebido: ${mes})`)
    }
    if (!Number.isSafeInteger(valor) || valor < 0) {
      throw new RangeError(`Valor do pagamento extra deve ser um inteiro >= 0 em centavos (recebido: ${valor})`)
    }
    porMes.set(mes, (porMes.get(mes) ?? 0) + valor)
  }
  return porMes
}

/**
 * Motor único das tabelas de amortização. SAC e PRICE diferem só na regra
 * da amortização regular de cada mês:
 *
 * - SAC:   amortização fixa (principal / prazo);
 * - PRICE: prestação fixa, amortização = prestação - juros.
 *
 * Todo o resto é igual: juros sobre o saldo, arredondamento ao centavo,
 * última parcela quitando o saldo, e os pagamentos extras.
 *
 * Sem extras, o resultado é idêntico ao das versões anteriores de
 * calcularSAC/calcularPRICE (os testes antigos continuam valendo).
 */
export function gerarTabela(
  sistema: Sistema,
  params: ParametrosAmortizacao,
  { extras = [], modo = 'prazo' }: OpcoesTabela = {},
): ParcelaComExtra[] {
  assertParametrosValidos(params)
  const { principal, taxaMensal, prazoMeses } = params
  const extrasPorMes = agruparExtras(extras, prazoMeses)

  // "Regra" da parcela regular. No modo 'parcela' ela é recalculada após cada extra.
  let amortizacaoSac = Math.floor(principal / prazoMeses)
  let prestacaoPrice = sistema === 'PRICE' ? calcularPrestacaoPrice(params) : 0

  const parcelas: ParcelaComExtra[] = []
  let saldo = principal

  // Para quando o saldo zera: com extras no modo 'prazo', o contrato acaba antes.
  for (let numero = 1; numero <= prazoMeses && saldo > 0; numero++) {
    const juros = Math.round(saldo * taxaMensal)

    let amortizacao: Centavos
    if (numero === prazoMeses) {
      amortizacao = saldo
    } else if (sistema === 'SAC') {
      amortizacao = Math.min(amortizacaoSac, saldo)
    } else {
      // Math.min protege contra saldo negativo em entradas degeneradas
      // (ex.: principal de poucos centavos), onde o arredondamento domina.
      amortizacao = Math.min(prestacaoPrice - juros, saldo)
    }
    saldo -= amortizacao

    // O extra nunca passa do que falta pagar.
    const amortizacaoExtra = Math.min(extrasPorMes.get(numero) ?? 0, saldo)
    saldo -= amortizacaoExtra

    parcelas.push({ numero, prestacao: juros + amortizacao, juros, amortizacao, saldoDevedor: saldo, amortizacaoExtra })

    if (amortizacaoExtra > 0 && modo === 'parcela' && saldo > 0) {
      const restantes = prazoMeses - numero
      if (sistema === 'SAC') {
        amortizacaoSac = Math.floor(saldo / restantes)
      } else {
        prestacaoPrice = calcularPrestacaoPrice({ principal: saldo, taxaMensal, prazoMeses: restantes })
      }
    }
  }

  return parcelas
}

/**
 * Lista de extras recorrentes. Ex.: FGTS a cada 24 meses a partir do mês 12
 * → meses 12, 36, 60... (a regra do FGTS exige 2 anos entre usos).
 * intervalo = 0 significa um único pagamento.
 */
export function extrasRecorrentes(primeiroMes: number, valor: Centavos, intervalo: number, prazoMeses: number): AmortizacaoExtra[] {
  if (!Number.isInteger(intervalo) || intervalo < 0) {
    throw new RangeError(`Intervalo deve ser um inteiro >= 0 (recebido: ${intervalo})`)
  }
  if (intervalo === 0) return [{ mes: primeiroMes, valor }]
  const extras: AmortizacaoExtra[] = []
  for (let mes = primeiroMes; mes <= prazoMeses; mes += intervalo) extras.push({ mes, valor })
  return extras
}

import { formatarBRL, formatarPercentual, type ResultadoSimulacao } from './financiamento'

export interface DadosResumo {
  valorImovel: number
  entrada: number
  taxaAnual: number
  prazoMeses: number
  temEncargos: boolean
  /** Descrição do extra para a frase (ex.: "R$ 20.000,00 a cada 2 anos"). */
  descricaoExtra?: string
}

function prazoEmTexto(meses: number): string {
  const anos = meses / 12
  return Number.isInteger(anos) ? `${meses} meses (${anos} anos)` : `${meses} meses`
}

/**
 * Texto pronto para o corretor colar no WhatsApp do cliente.
 *
 * Usa *negrito* do WhatsApp e não inclui a renda do cliente: a mensagem pode
 * ser encaminhada, e renda é dado pessoal. Termina com o link, que reabre a
 * simulação completa.
 */
export function gerarResumoCliente(dados: DadosResumo, r: ResultadoSimulacao, link: string): string {
  const { sac, price } = r
  const linhas = [
    '*Simulação de financiamento imobiliário*',
    `Imóvel: ${formatarBRL(dados.valorImovel)} · Entrada: ${formatarBRL(dados.entrada)}`,
    `Financiado: ${formatarBRL(r.valorFinanciado)} em ${prazoEmTexto(dados.prazoMeses)}, juros de ${formatarPercentual(dados.taxaAnual)} ao ano`,
    '',
    '*SAC* (parcelas que diminuem)',
    `1ª parcela: ${formatarBRL(sac.custos.primeiraParcela)} · última: ${formatarBRL(sac.custos.ultimaParcela)}`,
    `Total pago: ${formatarBRL(sac.custos.totalPago)}`,
    '',
    '*PRICE* (parcelas fixas)',
    `Parcela: ${formatarBRL(price.custos.primeiraParcela)}`,
    `Total pago: ${formatarBRL(price.custos.totalPago)}`,
  ]

  if (r.obra) {
    const { resumo } = r.obra
    linhas.push(
      '',
      `*Durante a obra* (${resumo.meses} meses até as chaves)`,
      `De ${formatarBRL(resumo.primeiroEncargo)} a ${formatarBRL(resumo.ultimoEncargo)} por mês, total de ${formatarBRL(resumo.totalPago)}. As parcelas acima começam depois das chaves.`,
    )
  }

  if (r.comparacao.economiaTotalSac > 0) {
    linhas.push('', `No SAC o total fica ${formatarBRL(r.comparacao.economiaTotalSac)} menor, mas a 1ª parcela é mais alta.`)
  }

  if (r.amortizacaoExtra && dados.descricaoExtra) {
    linhas.push(
      '',
      `Usando ${dados.descricaoExtra} para reduzir o prazo, a economia é de ${formatarBRL(r.amortizacaoExtra.SAC.prazo.economia)} no SAC.`,
    )
  }

  linhas.push(
    '',
    dados.temEncargos
      ? 'Parcelas já com seguros e taxa de administração. Valores aproximados: as condições finais dependem da aprovação do banco.'
      : 'Valores aproximados, sem seguros e taxas: as condições finais dependem da aprovação do banco.',
    '',
    `Veja os detalhes: ${link}`,
  )

  return linhas.join('\n')
}

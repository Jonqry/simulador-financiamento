import { formatarBRL, formatarPercentual, type ResultadoSimulacao, type Sistema } from './financiamento'

export interface DadosResumo {
  valorImovel: number
  entrada: number
  taxaAnual: number
  prazoMeses: number
  temEncargos: boolean
  /** Descrição do extra para a frase (ex.: "R$ 20.000,00 a cada 2 anos"). */
  descricaoExtra?: string
  /** Sistema em destaque: vem primeiro (e sozinho, se não estiver comparando). */
  sistema: Sistema
  /** Inclui o outro sistema e a comparação entre os dois. */
  comparar: boolean
  /** Programa e faixa (ex.: "Minha Casa, Minha Vida · Faixa 3"). */
  programa?: string
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
function blocoSistema(sistema: Sistema, r: ResultadoSimulacao): string[] {
  if (sistema === 'SAC') {
    return [
      '*SAC* (parcelas que diminuem)',
      `1ª parcela: ${formatarBRL(r.sac.custos.primeiraParcela)} · última: ${formatarBRL(r.sac.custos.ultimaParcela)}`,
      `Total pago: ${formatarBRL(r.sac.custos.totalPago)}`,
    ]
  }
  return ['*PRICE* (parcelas fixas)', `Parcela: ${formatarBRL(r.price.custos.primeiraParcela)}`, `Total pago: ${formatarBRL(r.price.custos.totalPago)}`]
}

export function gerarResumoCliente(dados: DadosResumo, r: ResultadoSimulacao, link: string): string {
  const outro: Sistema = dados.sistema === 'SAC' ? 'PRICE' : 'SAC'
  const linhas = [
    '*Simulação de financiamento imobiliário*',
    ...(dados.programa ? [dados.programa] : []),
    `Imóvel: ${formatarBRL(dados.valorImovel)} · Entrada: ${formatarBRL(dados.entrada)}`,
    `Financiado: ${formatarBRL(r.valorFinanciado)} em ${prazoEmTexto(dados.prazoMeses)}, juros de ${formatarPercentual(dados.taxaAnual)} ao ano`,
    '',
    ...blocoSistema(dados.sistema, r),
    ...(dados.comparar ? ['', ...blocoSistema(outro, r)] : []),
  ]

  if (r.obra) {
    const { resumo } = r.obra
    linhas.push(
      '',
      `*Durante a obra* (${resumo.meses} meses até as chaves)`,
      `De ${formatarBRL(resumo.primeiroEncargo)} a ${formatarBRL(resumo.ultimoEncargo)} por mês, total de ${formatarBRL(resumo.totalPago)}. As parcelas acima começam depois das chaves.`,
    )
  }

  if (dados.comparar && r.comparacao.economiaTotalSac > 0) {
    linhas.push('', `No SAC o total fica ${formatarBRL(r.comparacao.economiaTotalSac)} menor, mas a 1ª parcela é mais alta.`)
  }

  if (r.amortizacaoExtra && dados.descricaoExtra) {
    linhas.push(
      '',
      `Usando ${dados.descricaoExtra} para reduzir o prazo, a economia é de ${formatarBRL(r.amortizacaoExtra[dados.sistema].prazo.economia)} ${dados.sistema === 'SAC' ? 'no SAC' : 'na PRICE'}.`,
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

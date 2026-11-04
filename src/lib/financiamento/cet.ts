import type { Centavos, Taxa } from './tipos'

/**
 * Taxa interna de retorno mensal: a taxa i que faz o valor presente dos
 * pagamentos igualar o valor liberado.
 *
 *   valorLiberado = Σ pagamento_k / (1 + i)^k,   k = 1..n
 *
 * Resolvida por BISSECÇÃO. Newton-Raphson converge mais rápido, mas pode
 * divergir com chute ruim. Aqui a função é monótona (mais taxa → menor valor
 * presente), então a bissecção sempre converge, e 100 iterações custam
 * menos de 1 ms mesmo com 420 parcelas.
 */
export function taxaInternaRetorno(valorLiberado: Centavos, pagamentos: Centavos[]): Taxa {
  if (!Number.isFinite(valorLiberado) || valorLiberado <= 0) {
    throw new RangeError(`Valor liberado deve ser positivo (recebido: ${valorLiberado})`)
  }
  if (pagamentos.length === 0 || pagamentos.some((p) => !Number.isFinite(p) || p < 0)) {
    throw new RangeError('Informe ao menos um pagamento, todos maiores ou iguais a zero')
  }

  const valorPresenteMenosLiberado = (taxa: number) => {
    let soma = 0
    let desconto = 1
    for (const pagamento of pagamentos) {
      desconto /= 1 + taxa
      soma += pagamento * desconto
    }
    return soma - valorLiberado
  }

  let baixa = -0.99
  let alta = 1 // 100% ao mês: muito acima de qualquer financiamento real
  if (valorPresenteMenosLiberado(baixa) < 0 || valorPresenteMenosLiberado(alta) > 0) {
    throw new RangeError('Não existe taxa entre -99% e 100% ao mês para esse fluxo')
  }

  for (let iteracao = 0; iteracao < 100; iteracao++) {
    const meio = (baixa + alta) / 2
    if (valorPresenteMenosLiberado(meio) > 0) baixa = meio
    else alta = meio
  }
  return (baixa + alta) / 2
}

/**
 * Custo Efetivo Total (CET) anual estimado: a taxa "de verdade" do contrato,
 * considerando tudo que se paga por mês (juros, seguros e taxa), não só os
 * juros nominais.
 *
 * Simplificação: o CET oficial (Resolução CMN 3.517) também inclui custos
 * pagos na contratação (avaliação, registro, tarifas), que o simulador não pede.
 */
export function calcularCetAnual(valorLiberado: Centavos, pagamentos: Centavos[]): Taxa {
  return Math.pow(1 + taxaInternaRetorno(valorLiberado, pagamentos), 12) - 1
}

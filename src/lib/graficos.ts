import type { Centavos, Parcela } from './financiamento'

export interface PontoSaldo {
  mes: number
  sac: Centavos
  price: Centavos
}

/**
 * Junta os saldos dos dois sistemas num único array para o gráfico de linhas.
 * Começa no mês 0 com o valor financiado, para a curva partir do topo.
 */
export function dadosSaldo(principal: Centavos, sac: Parcela[], price: Parcela[]): PontoSaldo[] {
  if (sac.length !== price.length) {
    throw new RangeError('SAC e PRICE precisam ter o mesmo prazo')
  }
  return [
    { mes: 0, sac: principal, price: principal },
    ...sac.map((parcela, k) => ({ mes: parcela.numero, sac: parcela.saldoDevedor, price: price[k]!.saldoDevedor })),
  ]
}

export interface PontoComposicao {
  mes: number
  juros: Centavos
  amortizacao: Centavos
}

/** Separa juros e amortização de cada parcela para o gráfico de áreas empilhadas. */
export function dadosComposicao(parcelas: Parcela[]): PontoComposicao[] {
  return parcelas.map(({ numero, juros, amortizacao }) => ({ mes: numero, juros, amortizacao }))
}

/** Marcas do eixo X a cada N anos: [0, 60, 120, ...] meses. */
export function marcasAnuais(prazoMeses: number): number[] {
  const anos = prazoMeses / 12
  const passoAnos = anos <= 5 ? 1 : anos <= 15 ? 3 : 5
  const passo = passoAnos * 12
  const marcas: number[] = []
  for (let mes = 0; mes <= prazoMeses; mes += passo) marcas.push(mes)
  return marcas
}

/** Rótulo do tooltip: mês 13 → "Mês 13 · ano 2". */
export function rotuloMes(mes: number): string {
  if (mes === 0) return 'Início'
  const ano = Math.floor((mes - 1) / 12) + 1
  return `Mês ${mes} · ano ${ano}`
}

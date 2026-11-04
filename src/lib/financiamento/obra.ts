import type { Encargos } from './encargos'
import type { Centavos, Taxa } from './tipos'

/** Limite de sanidade para o prazo restante de obra (5 anos). */
export const MESES_OBRA_MAXIMO = 60

/**
 * Uma linha da fase de obra ("juros de obra" / "taxa de evolução de obra").
 *
 * Na compra na planta, o banco libera o dinheiro à construtora conforme a obra
 * avança. Até a entrega das chaves, o cliente paga encargos sobre o valor JÁ
 * LIBERADO, sem amortizar nada: a dívida não diminui nessa fase.
 */
export interface ParcelaObra {
  mes: number
  /** Quanto da obra está concluído neste mês (0.5 = 50%). */
  percentualObra: Taxa
  /** Parte do financiamento já liberada à construtora. */
  saldoLiberado: Centavos
  juros: Centavos
  mip: Centavos
  dfi: Centavos
  taxaAdministracao: Centavos
  total: Centavos
}

export interface ParametrosObra {
  financiado: Centavos
  valorImovel: Centavos
  taxaMensal: Taxa
  /** Meses que faltam até a entrega das chaves. */
  mesesObra: number
  /** Quanto da obra já está executado na assinatura (0.3 = 30%). */
  executadaInicial: Taxa
  encargos: Encargos
}

/**
 * Encargos mês a mês até as chaves.
 *
 * Modelo: a obra evolui de forma LINEAR do percentual já executado até 100%
 * no último mês, e o banco libera o mesmo percentual do financiamento. Cada
 * mês paga:
 *
 *   juros = saldo liberado × taxa mensal
 *   MIP   = saldo liberado × MIP      (o seguro cobre só o que já é dívida)
 *   DFI   = valor do imóvel × DFI
 *   + taxa de administração
 *
 * Simplificações assumidas: cronograma real de medições não é linear e a TR
 * não entra (como no resto do simulador). Ver docs/DECISOES.md.
 */
export function calcularFaseObra(p: ParametrosObra): ParcelaObra[] {
  if (!Number.isInteger(p.mesesObra) || p.mesesObra < 1 || p.mesesObra > MESES_OBRA_MAXIMO) {
    throw new RangeError(`Meses de obra devem ser um inteiro entre 1 e ${MESES_OBRA_MAXIMO} (recebido: ${p.mesesObra})`)
  }
  if (!Number.isFinite(p.executadaInicial) || p.executadaInicial < 0 || p.executadaInicial >= 1) {
    throw new RangeError(`Obra executada deve estar entre 0% e 99% (recebido: ${p.executadaInicial})`)
  }
  if (!Number.isSafeInteger(p.financiado) || p.financiado <= 0) {
    throw new RangeError(`Valor financiado deve ser um inteiro positivo em centavos (recebido: ${p.financiado})`)
  }

  const { financiado, valorImovel, taxaMensal, mesesObra, executadaInicial, encargos } = p
  const dfi = Math.round(valorImovel * encargos.dfiMensal)

  return Array.from({ length: mesesObra }, (_, k) => {
    const mes = k + 1
    const ultimo = mes === mesesObra
    // No último mês, 100% exatos: 0,3 + 0,7 × 24/24 dá 0,9999999999999999 em
    // ponto flutuante, e o saldo liberado tem de ser o financiamento inteiro.
    const percentualObra = ultimo ? 1 : executadaInicial + ((1 - executadaInicial) * mes) / mesesObra
    const saldoLiberado = ultimo ? financiado : Math.round(financiado * percentualObra)
    const juros = Math.round(saldoLiberado * taxaMensal)
    const mip = Math.round(saldoLiberado * encargos.mipMensal)
    const taxaAdministracao = encargos.taxaAdministracao
    return {
      mes,
      percentualObra,
      saldoLiberado,
      juros,
      mip,
      dfi,
      taxaAdministracao,
      total: juros + mip + dfi + taxaAdministracao,
    }
  })
}

export interface ResumoObra {
  meses: number
  primeiroEncargo: Centavos
  ultimoEncargo: Centavos
  totalPago: Centavos
  totalJuros: Centavos
}

export function resumirObra(parcelas: ParcelaObra[]): ResumoObra {
  const primeira = parcelas[0]
  const ultima = parcelas.at(-1)
  if (!primeira || !ultima) {
    throw new RangeError('Não é possível resumir uma fase de obra sem meses')
  }
  return {
    meses: parcelas.length,
    primeiroEncargo: primeira.total,
    ultimoEncargo: ultima.total,
    totalPago: parcelas.reduce((soma, p) => soma + p.total, 0),
    totalJuros: parcelas.reduce((soma, p) => soma + p.juros, 0),
  }
}

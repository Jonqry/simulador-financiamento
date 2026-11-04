import type { Centavos, Parcela, Taxa } from './tipos'

/**
 * Custos mensais que o banco cobra junto com a parcela.
 *
 * - MIP (Morte e Invalidez Permanente): % ao mês sobre o SALDO DEVEDOR.
 *   Cai junto com a dívida. A alíquota depende da idade de quem financia.
 * - DFI (Danos Físicos ao Imóvel): % ao mês sobre o VALOR DO IMÓVEL.
 *   Fica praticamente constante o contrato todo.
 * - Taxa de administração: valor fixo mensal em reais.
 */
export interface Encargos {
  mipMensal: Taxa
  dfiMensal: Taxa
  taxaAdministracao: Centavos
}

export const SEM_ENCARGOS: Encargos = { mipMensal: 0, dfiMensal: 0, taxaAdministracao: 0 }

/**
 * Valores de exemplo para o formulário. Variam por banco, seguradora e idade;
 * o usuário deve trocar pelos do contrato dele.
 */
export const ENCARGOS_EXEMPLO: Encargos = { mipMensal: 0.00025, dfiMensal: 0.0001, taxaAdministracao: 25_00 }

export interface ValoresEncargos {
  mip: Centavos
  dfi: Centavos
  taxaAdministracao: Centavos
  /** O que sai do bolso no mês: prestação (juros + amortização) + seguros + taxa. */
  total: Centavos
}

export type ComEncargos<T extends Parcela> = T & ValoresEncargos

function validarEncargos({ mipMensal, dfiMensal, taxaAdministracao }: Encargos): void {
  for (const [nome, taxa] of [
    ['MIP', mipMensal],
    ['DFI', dfiMensal],
  ] as const) {
    if (!Number.isFinite(taxa) || taxa < 0) {
      throw new RangeError(`${nome} deve ser maior ou igual a zero (recebido: ${taxa})`)
    }
  }
  if (!Number.isSafeInteger(taxaAdministracao) || taxaAdministracao < 0) {
    throw new RangeError(`Taxa de administração deve ser um inteiro >= 0 em centavos (recebido: ${taxaAdministracao})`)
  }
}

/**
 * Acrescenta seguros e taxa a cada parcela de uma tabela já calculada.
 *
 * Fica separado do motor de amortização de propósito: encargos não mudam a
 * dívida, só o valor pago. Assim SAC, PRICE e os cenários com amortização
 * extra ganham encargos sem repetir código.
 *
 * O MIP de cada mês usa o saldo ANTES do pagamento daquele mês.
 */
export function aplicarEncargos<T extends Parcela>(
  parcelas: T[],
  principal: Centavos,
  valorImovel: Centavos,
  encargos: Encargos,
): ComEncargos<T>[] {
  validarEncargos(encargos)
  const dfi = Math.round(valorImovel * encargos.dfiMensal)

  return parcelas.map((parcela, k) => {
    const saldoAnterior = k === 0 ? principal : parcelas[k - 1]!.saldoDevedor
    const mip = Math.round(saldoAnterior * encargos.mipMensal)
    const taxaAdministracao = encargos.taxaAdministracao
    return { ...parcela, mip, dfi, taxaAdministracao, total: parcela.prestacao + mip + dfi + taxaAdministracao }
  })
}

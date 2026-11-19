import { describe, expect, it } from 'vitest'
import { capacidadeDeCompra, ENCARGOS_EXEMPLO, taxaMensalDeAnualEfetiva } from './financiamento'
import { imovelMaximoPelaRenda, type ParametrosImovelPelaRenda } from './imovelPelaRenda'

const BASE: ParametrosImovelPelaRenda = {
  rendaMensal: 6_000_00,
  entrada: 50_000_00,
  prazoMeses: 420,
  encargos: ENCARGOS_EXEMPLO,
  cota: 0.8,
  limiteRenda: 0.3,
  taxaMensalDe: taxaMensalDeAnualEfetiva,
  regiao: 'NNE',
  cotista: false,
  taxaManual: null,
  sistema: null,
}

/** Capacidade com uma taxa fixa, para comparar. */
const capacidade = (taxaAnual: number, p: Partial<ParametrosImovelPelaRenda> = {}, sistema: 'SAC' | 'PRICE' = 'PRICE') => {
  const q = { ...BASE, ...p }
  return capacidadeDeCompra(sistema, {
    entrada: q.entrada,
    rendaMensal: q.rendaMensal,
    taxaMensal: taxaMensalDeAnualEfetiva(taxaAnual),
    prazoMeses: q.prazoMeses,
    encargos: q.encargos,
    cota: q.cota,
    limiteRenda: q.limiteRenda,
  })
}

describe('imovelMaximoPelaRenda', () => {
  it('dentro da faixa da renda: igual à capacidade com a taxa da faixa, no sistema do programa (PRICE)', () => {
    const r = imovelMaximoPelaRenda(BASE)
    const esperado = capacidade(0.0816) // Faixa 3, N/NE, não cotista
    expect(r).toEqual({
      valorImovel: esperado.valorMaximoImovel,
      financiamento: esperado.financiamentoMaximo,
      limitadoPor: esperado.limitadoPor,
    })
  })

  it('quando a capacidade passa do teto da faixa e a próxima faixa não alcança, fica no teto', () => {
    // Renda de R$ 7 mil e entrada de R$ 130 mil: a 8,16% passaria de R$ 400 mil,
    // mas a 10% (Faixa 4) não chega lá. O máximo é o teto da Faixa 3.
    const p = { rendaMensal: 7_000_00, entrada: 130_000_00 }
    expect(capacidade(0.0816, p).valorMaximoImovel).toBeGreaterThan(400_000_00)
    expect(capacidade(0.1, p).valorMaximoImovel).toBeLessThanOrEqual(400_000_00)
    expect(imovelMaximoPelaRenda({ ...BASE, ...p })).toEqual({
      valorImovel: 400_000_00,
      financiamento: 270_000_00,
      limitadoPor: 'teto',
    })
  })

  it('quando a próxima faixa ainda passa do teto anterior, sobe de faixa (Faixa 3 → 4)', () => {
    const p = { rendaMensal: 9_500_00, entrada: 250_000_00 }
    const faixa4 = capacidade(0.1, p)
    expect(faixa4.valorMaximoImovel).toBeGreaterThan(400_000_00)
    expect(imovelMaximoPelaRenda({ ...BASE, ...p })).toEqual({
      valorImovel: faixa4.valorMaximoImovel,
      financiamento: faixa4.financiamentoMaximo,
      limitadoPor: faixa4.limitadoPor,
    })
  })

  it('renda acima do MCMV: SBPE, no SAC', () => {
    const p = { rendaMensal: 20_000_00, entrada: 400_000_00 }
    const sbpe = capacidade(0.1026, p, 'SAC')
    expect(imovelMaximoPelaRenda({ ...BASE, ...p }).valorImovel).toBe(sbpe.valorMaximoImovel)
  })

  it('respeita o sistema escolhido pelo corretor', () => {
    expect(imovelMaximoPelaRenda({ ...BASE, sistema: 'SAC' }).valorImovel).toBe(capacidade(0.0816, {}, 'SAC').valorMaximoImovel)
  })

  it('com taxa manual, ignora faixas e tetos', () => {
    const p = { rendaMensal: 7_000_00, entrada: 130_000_00 }
    const r = imovelMaximoPelaRenda({ ...BASE, ...p, taxaManual: 0.0816 })
    expect(r.valorImovel).toBe(capacidade(0.0816, p).valorMaximoImovel)
    expect(r.valorImovel).toBeGreaterThan(400_000_00)
  })

  it('limitado pela entrada (cota) dentro da faixa', () => {
    expect(imovelMaximoPelaRenda({ ...BASE, rendaMensal: 9_000_00, entrada: 20_000_00 })).toEqual({
      valorImovel: 100_000_00,
      financiamento: 80_000_00,
      limitadoPor: 'entrada',
    })
  })
})

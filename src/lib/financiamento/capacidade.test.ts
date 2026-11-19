import { describe, expect, it } from 'vitest'
import { capacidadeDeCompra, entradaNecessaria, type ParametrosCapacidade } from './capacidade'
import { aplicarEncargos, ENCARGOS_EXEMPLO, SEM_ENCARGOS } from './encargos'
import { gerarTabela } from './motor'
import { taxaMensalDeAnualEfetiva } from './taxas'
import type { Sistema } from './tipos'

// Cenários e resultados conferidos com implementação independente em Python
// (varredura com refinamento decimal, em vez de busca binária).
const BASE: ParametrosCapacidade = {
  entrada: 80_000_00,
  rendaMensal: 15_000_00,
  taxaMensal: taxaMensalDeAnualEfetiva(0.1149),
  prazoMeses: 360,
  encargos: ENCARGOS_EXEMPLO,
}

const maiorParcela = (sistema: Sistema, principal: number, p: ParametrosCapacidade) =>
  Math.max(
    ...aplicarEncargos(
      gerarTabela(sistema, { principal, taxaMensal: p.taxaMensal, prazoMeses: p.prazoMeses }),
      principal,
      principal + p.entrada,
      p.encargos,
    ).map((parcela) => parcela.total),
  )

describe('capacidadeDeCompra', () => {
  it('entrada de R$ 80 mil com cota de 80%: imóvel de até R$ 400 mil (limitado pela entrada)', () => {
    for (const sistema of ['SAC', 'PRICE'] as const) {
      expect(capacidadeDeCompra(sistema, BASE)).toMatchObject({
        valorMaximoImovel: 400_000_00,
        financiamentoMaximo: 320_000_00,
        limitadoPor: 'entrada',
      })
    }
  })

  it('com entrada alta, quem limita é a renda; a PRICE permite imóvel maior', () => {
    const p = { ...BASE, entrada: 300_000_00 }
    expect(capacidadeDeCompra('SAC', p)).toMatchObject({
      valorMaximoImovel: 663_370_87,
      financiamentoMaximo: 363_370_87,
      limitadoPor: 'renda',
    })
    expect(capacidadeDeCompra('PRICE', p)).toMatchObject({
      valorMaximoImovel: 752_773_03,
      financiamentoMaximo: 452_773_03,
      limitadoPor: 'renda',
    })
  })

  it('o resultado é o MÁXIMO: cabe na renda, e 1 centavo a mais já não cabe', () => {
    const p = { ...BASE, entrada: 300_000_00 }
    const limite = Math.floor(p.rendaMensal * 0.3)
    for (const sistema of ['SAC', 'PRICE'] as const) {
      const { financiamentoMaximo, maiorParcela: parcela } = capacidadeDeCompra(sistema, p)
      expect(parcela).toBe(maiorParcela(sistema, financiamentoMaximo, p))
      expect(parcela).toBeLessThanOrEqual(limite)
      expect(maiorParcela(sistema, financiamentoMaximo + 1, p)).toBeGreaterThan(limite)
    }
  })

  it('sem encargos, prazo de 35 anos: SAC limitado pela renda, PRICE pela entrada', () => {
    const p = { ...BASE, rendaMensal: 10_000_00, taxaMensal: taxaMensalDeAnualEfetiva(0.1), prazoMeses: 420, encargos: SEM_ENCARGOS }
    expect(capacidadeDeCompra('SAC', p)).toMatchObject({ valorMaximoImovel: 369_713_35, limitadoPor: 'renda' })
    expect(capacidadeDeCompra('PRICE', p)).toMatchObject({ valorMaximoImovel: 400_000_00, limitadoPor: 'entrada' })
  })

  it('sem entrada, a cota de 80% não deixa financiar nada', () => {
    expect(capacidadeDeCompra('SAC', { ...BASE, entrada: 0 })).toEqual({
      valorMaximoImovel: 0,
      financiamentoMaximo: 0,
      maiorParcela: 0,
      limitadoPor: 'entrada',
    })
  })

  it('renda que não cobre nem os encargos fixos: financiamento zero, limitado pela renda', () => {
    // 30% de R$ 200 = R$ 60, menos que só a taxa de administração + DFI de um imóvel qualquer.
    const resultado = capacidadeDeCompra('SAC', { ...BASE, rendaMensal: 200_00, encargos: { ...ENCARGOS_EXEMPLO, taxaAdministracao: 100_00 } })
    expect(resultado).toMatchObject({ financiamentoMaximo: 0, valorMaximoImovel: 80_000_00, limitadoPor: 'renda' })
  })

  it('aceita limite de renda e cota personalizados', () => {
    const p = { ...BASE, entrada: 300_000_00 }
    const padrao = capacidadeDeCompra('SAC', p)
    expect(capacidadeDeCompra('SAC', { ...p, limiteRenda: 0.35 }).financiamentoMaximo).toBeGreaterThan(padrao.financiamentoMaximo)
    // Cota de 60%: entrada de R$ 80 mil permite imóvel de até R$ 200 mil.
    expect(capacidadeDeCompra('SAC', { ...BASE, cota: 0.6 })).toMatchObject({ valorMaximoImovel: 200_000_00, limitadoPor: 'entrada' })
  })

  it.each([0, 1, -0.1, Number.NaN])('rejeita cota inválida (%s)', (cota) => {
    expect(() => capacidadeDeCompra('SAC', { ...BASE, cota })).toThrow(RangeError)
  })

  it('rejeita entrada inválida', () => {
    expect(() => capacidadeDeCompra('SAC', { ...BASE, entrada: -1 })).toThrow(RangeError)
  })
})

describe('entradaNecessaria', () => {
  // O mesmo imóvel de R$ 400 mil, com renda que não aguenta financiar 80%.
  const IMOVEL = {
    valorImovel: 400_000_00,
    rendaMensal: 9_000_00,
    taxaMensal: taxaMensalDeAnualEfetiva(0.1149),
    prazoMeses: 360,
    encargos: ENCARGOS_EXEMPLO,
  }
  const maiorParcelaComImovelFixo = (sistema: Sistema, principal: number) =>
    Math.max(
      ...aplicarEncargos(
        gerarTabela(sistema, { principal, taxaMensal: IMOVEL.taxaMensal, prazoMeses: IMOVEL.prazoMeses }),
        principal,
        IMOVEL.valorImovel,
        IMOVEL.encargos,
      ).map((parcela) => parcela.total),
    )

  it.each(['SAC', 'PRICE'] as const)('%s: é a menor entrada que faz a parcela caber nos 30%% da renda', (sistema) => {
    const entrada = entradaNecessaria(sistema, IMOVEL)
    const financiado = IMOVEL.valorImovel - entrada
    expect(entrada).toBeGreaterThan(80_000_00) // mais que os 20% da cota
    expect(maiorParcelaComImovelFixo(sistema, financiado)).toBeLessThanOrEqual(2_700_00)
    expect(maiorParcelaComImovelFixo(sistema, financiado + 1)).toBeGreaterThan(2_700_00)
  })

  it('a PRICE pede menos entrada que o SAC', () => {
    expect(entradaNecessaria('PRICE', IMOVEL)).toBeLessThan(entradaNecessaria('SAC', IMOVEL))
  })

  it('com renda de sobra, quem manda é a cota', () => {
    expect(entradaNecessaria('SAC', { ...IMOVEL, rendaMensal: 100_000_00 })).toBe(80_000_00)
    expect(entradaNecessaria('SAC', { ...IMOVEL, rendaMensal: 100_000_00, cota: 0.6 })).toBe(160_000_00)
  })

  it('respeita outro limite de renda', () => {
    expect(entradaNecessaria('PRICE', { ...IMOVEL, limiteRenda: 0.35 })).toBeLessThan(entradaNecessaria('PRICE', IMOVEL))
  })
})

import { describe, expect, it } from 'vitest'
import { extrasRecorrentes, gerarTabela, type ParcelaComExtra } from './motor'
import { calcularPRICE } from './price'
import { calcularSAC } from './sac'
import { taxaMensalDeAnualEfetiva } from './taxas'
import type { ParametrosAmortizacao, Sistema } from './tipos'

const soma = (parcelas: ParcelaComExtra[], campo: 'juros' | 'amortizacao' | 'amortizacaoExtra') =>
  parcelas.reduce((total, p) => total + p[campo], 0)

const REAL: ParametrosAmortizacao = { principal: 320_000_00, taxaMensal: taxaMensalDeAnualEfetiva(0.1149), prazoMeses: 360 }
const SISTEMAS: Sistema[] = ['SAC', 'PRICE']

describe('gerarTabela sem extras', () => {
  it('é idêntica a calcularSAC e calcularPRICE', () => {
    const semExtra = (sistema: Sistema) =>
      gerarTabela(sistema, REAL).map(({ amortizacaoExtra, ...parcela }) => {
        expect(amortizacaoExtra).toBe(0)
        return parcela
      })
    expect(semExtra('SAC')).toEqual(calcularSAC(REAL))
    expect(semExtra('PRICE')).toEqual(calcularPRICE(REAL))
  })
})

describe('gerarTabela com pagamento extra', () => {
  // Exemplo conferível à mão: R$ 1.200 a juros zero em 12 meses, extra de R$ 300 no mês 3.
  const SIMPLES: ParametrosAmortizacao = { principal: 1_200_00, taxaMensal: 0, prazoMeses: 12 }
  const EXTRA = [{ mes: 3, valor: 300_00 }]

  it('SAC reduzindo prazo: mantém R$ 100 por mês e termina 3 meses antes', () => {
    const tabela = gerarTabela('SAC', SIMPLES, { extras: EXTRA, modo: 'prazo' })
    expect(tabela).toHaveLength(9)
    expect(tabela[2]).toMatchObject({ numero: 3, prestacao: 100_00, amortizacaoExtra: 300_00, saldoDevedor: 600_00 })
    expect(tabela.every((p) => p.prestacao === 100_00)).toBe(true)
  })

  it('SAC reduzindo parcela: mantém os 12 meses e a parcela cai para R$ 66,66', () => {
    const tabela = gerarTabela('SAC', SIMPLES, { extras: EXTRA, modo: 'parcela' })
    expect(tabela).toHaveLength(12)
    // Saldo de R$ 600 em 9 meses restantes = R$ 66,66 (a última absorve os centavos).
    expect(tabela[3]!.prestacao).toBe(66_66)
    expect(tabela.at(-1)!.prestacao).toBe(66_72)
  })

  it('PRICE reduzindo parcela recalcula a prestação para o prazo restante', () => {
    const params = { principal: 100_000_00, taxaMensal: 0.01, prazoMeses: 10 }
    const tabela = gerarTabela('PRICE', params, { extras: [{ mes: 5, valor: 20_000_00 }], modo: 'parcela' })
    const saldoAposExtra = tabela[4]!.saldoDevedor
    // Nova PMT = saldo × i / (1 - 1,01^-5), conferível com a fórmula de anuidade.
    const esperada = Math.round((saldoAposExtra * 0.01) / (1 - Math.pow(1.01, -5)))
    expect(tabela[5]!.prestacao).toBe(esperada)
    expect(tabela).toHaveLength(10)
  })

  it('o extra nunca passa do saldo: um extra gigante quita o contrato', () => {
    const tabela = gerarTabela('PRICE', REAL, { extras: [{ mes: 10, valor: 1_000_000_00 }] })
    expect(tabela).toHaveLength(10)
    expect(tabela.at(-1)!.saldoDevedor).toBe(0)
    expect(soma(tabela, 'amortizacao') + soma(tabela, 'amortizacaoExtra')).toBe(REAL.principal)
  })

  it('soma extras no mesmo mês', () => {
    const tabela = gerarTabela('SAC', SIMPLES, { extras: [{ mes: 2, valor: 100_00 }, { mes: 2, valor: 50_00 }] })
    expect(tabela[1]!.amortizacaoExtra).toBe(150_00)
  })

  describe.each(SISTEMAS)('%s com FGTS a cada 24 meses (R$ 20 mil)', (sistema) => {
    const extras = extrasRecorrentes(24, 20_000_00, 24, REAL.prazoMeses)
    const base = gerarTabela(sistema, REAL)
    const prazo = gerarTabela(sistema, REAL, { extras, modo: 'prazo' })
    const parcela = gerarTabela(sistema, REAL, { extras, modo: 'parcela' })

    it.each([
      ['prazo', prazo],
      ['parcela', parcela],
    ] as const)('modo %s: dívida quitada exatamente, sem saldo negativo', (_modo, tabela) => {
      expect(soma(tabela, 'amortizacao') + soma(tabela, 'amortizacaoExtra')).toBe(REAL.principal)
      expect(tabela.at(-1)!.saldoDevedor).toBe(0)
      expect(tabela.every((p) => p.saldoDevedor >= 0 && p.amortizacao >= 0 && p.prestacao === p.juros + p.amortizacao)).toBe(true)
    })

    it('reduzir prazo termina antes de reduzir parcela', () => {
      // Atenção: com extras recorrentes, até o modo 'parcela' pode terminar antes
      // do prazo original, porque um dos extras acaba quitando o saldo restante.
      expect(prazo.length).toBeLessThan(parcela.length)
      expect(parcela.length).toBeLessThanOrEqual(base.length)
    })

    it('com um único extra, reduzir parcela mantém o prazo original', () => {
      const unico = gerarTabela(sistema, REAL, { extras: [{ mes: 24, valor: 20_000_00 }], modo: 'parcela' })
      expect(unico).toHaveLength(base.length)
      expect(unico[24]!.prestacao).toBeLessThan(base[24]!.prestacao)
    })

    it('reduzir prazo economiza mais juros que reduzir parcela', () => {
      expect(soma(prazo, 'juros')).toBeLessThan(soma(parcela, 'juros'))
      expect(soma(parcela, 'juros')).toBeLessThan(soma(base, 'juros'))
    })
  })

  it.each([
    [{ mes: 0, valor: 100 }],
    [{ mes: 361, valor: 100 }],
    [{ mes: 1.5, valor: 100 }],
    [{ mes: 10, valor: -1 }],
    [{ mes: 10, valor: 0.5 }],
  ])('rejeita extra inválido %o', (extra) => {
    expect(() => gerarTabela('SAC', REAL, { extras: [extra] })).toThrow(RangeError)
  })
})

describe('extrasRecorrentes', () => {
  it('a cada 24 meses a partir do mês 12, sem passar do prazo', () => {
    expect(extrasRecorrentes(12, 500, 24, 100).map((e) => e.mes)).toEqual([12, 36, 60, 84])
  })

  it('intervalo 0 é um pagamento só', () => {
    expect(extrasRecorrentes(12, 500, 0, 100)).toEqual([{ mes: 12, valor: 500 }])
  })

  it('rejeita intervalo negativo ou fracionado', () => {
    expect(() => extrasRecorrentes(12, 500, -1, 100)).toThrow(RangeError)
    expect(() => extrasRecorrentes(12, 500, 1.5, 100)).toThrow(RangeError)
  })
})

import { describe, expect, it } from 'vitest'
import { calcularCetAnual, taxaInternaRetorno } from './cet'
import { aplicarEncargos, ENCARGOS_EXEMPLO, SEM_ENCARGOS } from './encargos'
import { calcularPRICE } from './price'
import { calcularSAC } from './sac'
import { taxaMensalDeAnualEfetiva } from './taxas'

const PEQUENO = { principal: 1_000_00, taxaMensal: 0.01, prazoMeses: 3 }

describe('aplicarEncargos', () => {
  it('MIP sobre o saldo anterior, DFI sobre o imóvel, taxa fixa', () => {
    // Imóvel de R$ 2.000; MIP 1% a.m.; DFI 0,5% a.m.; taxa R$ 2.
    const tabela = aplicarEncargos(calcularSAC(PEQUENO), PEQUENO.principal, 2_000_00, {
      mipMensal: 0.01,
      dfiMensal: 0.005,
      taxaAdministracao: 2_00,
    })
    expect(tabela.map(({ mip, dfi, taxaAdministracao, total }) => ({ mip, dfi, taxaAdministracao, total }))).toEqual([
      // saldo anterior 1.000,00 → MIP 10,00; DFI 2.000 × 0,5% = 10,00
      { mip: 1000, dfi: 1000, taxaAdministracao: 200, total: 34333 + 1000 + 1000 + 200 },
      // saldo anterior 666,67 → MIP 6,67
      { mip: 667, dfi: 1000, taxaAdministracao: 200, total: 34000 + 667 + 1000 + 200 },
      // saldo anterior 333,34 → MIP 3,33
      { mip: 333, dfi: 1000, taxaAdministracao: 200, total: 33667 + 333 + 1000 + 200 },
    ])
  })

  it('preserva os campos originais da parcela', () => {
    const [primeira] = aplicarEncargos(calcularSAC(PEQUENO), PEQUENO.principal, 2_000_00, SEM_ENCARGOS)
    expect(primeira).toMatchObject({ numero: 1, prestacao: 34333, juros: 1000, amortizacao: 33333, total: 34333 })
  })

  it.each([
    { ...ENCARGOS_EXEMPLO, mipMensal: -0.1 },
    { ...ENCARGOS_EXEMPLO, dfiMensal: Number.NaN },
    { ...ENCARGOS_EXEMPLO, taxaAdministracao: -1 },
    { ...ENCARGOS_EXEMPLO, taxaAdministracao: 2.5 },
  ])('rejeita encargos inválidos %o', (encargos) => {
    expect(() => aplicarEncargos(calcularSAC(PEQUENO), PEQUENO.principal, 2_000_00, encargos)).toThrow(RangeError)
  })
})

describe('taxaInternaRetorno', () => {
  it('um pagamento: 100 → 110 é 10%', () => {
    expect(taxaInternaRetorno(100, [110])).toBeCloseTo(0.1, 12)
  })

  it('dois pagamentos: 1.000 → 600 + 600 ≈ 13,07%', () => {
    // 600/(1+i) + 600/(1+i)² = 1000 → i = (-0,4 + √(0,16 + 2,4·... )) conferido: 0,130662
    expect(taxaInternaRetorno(1000, [600, 600])).toBeCloseTo(0.130662, 6)
  })

  it('pagar exatamente o emprestado é taxa zero', () => {
    expect(taxaInternaRetorno(1000, [500, 500])).toBeCloseTo(0, 12)
  })

  it('pagar menos que o emprestado dá taxa negativa', () => {
    expect(taxaInternaRetorno(1000, [450, 450])).toBeLessThan(0)
  })

  it.each([
    [0, [100]],
    [100, []],
    [100, [-1]],
    [100, [1_000_000]], // taxa acima de 100% ao mês
    [1_000_000, [1]], // taxa abaixo de -99% ao mês
  ])('rejeita fluxo sem solução ou inválido (%s, %o)', (valor, pagamentos) => {
    expect(() => taxaInternaRetorno(valor, pagamentos)).toThrow(RangeError)
  })
})

describe('calcularCetAnual', () => {
  const params = { principal: 320_000_00, taxaMensal: taxaMensalDeAnualEfetiva(0.1149), prazoMeses: 360 }

  it.each([
    ['PRICE', calcularPRICE],
    ['SAC', calcularSAC],
  ] as const)('%s sem encargos: CET ≈ a própria taxa de juros (11,49% a.a.)', (_nome, calcular) => {
    const pagamentos = calcular(params).map((p) => p.prestacao)
    // Diferença só do arredondamento ao centavo.
    expect(calcularCetAnual(params.principal, pagamentos)).toBeCloseTo(0.1149, 5)
  })

  it('com seguros e taxa, o CET fica acima dos juros', () => {
    const tabela = aplicarEncargos(calcularSAC(params), params.principal, 400_000_00, ENCARGOS_EXEMPLO)
    const cet = calcularCetAnual(params.principal, tabela.map((p) => p.total))
    expect(cet).toBeGreaterThan(0.1149)
    expect(cet).toBeLessThan(0.15)
  })
})

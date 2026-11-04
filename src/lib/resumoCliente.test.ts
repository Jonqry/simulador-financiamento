import { describe, expect, it } from 'vitest'
import { simular, type EntradaSimulacao } from './financiamento'
import { gerarResumoCliente, type DadosResumo } from './resumoCliente'

const normalizar = (s: string) => s.replace(/ /g, ' ')

const ENTRADA: EntradaSimulacao = {
  valorImovel: 400_000_00,
  entrada: 80_000_00,
  taxaAnual: 0.1149,
  prazoMeses: 360,
  rendaMensal: 15_000_00,
  mipMensal: 0.00025,
  dfiMensal: 0.0001,
  taxaAdministracao: 25_00,
}
const DADOS: DadosResumo = { valorImovel: 400_000_00, entrada: 80_000_00, taxaAnual: 0.1149, prazoMeses: 360, temEncargos: true }
const LINK = 'https://exemplo.app/?valor=400000'

describe('gerarResumoCliente', () => {
  it('monta o texto completo para WhatsApp', () => {
    expect(normalizar(gerarResumoCliente(DADOS, simular(ENTRADA), LINK))).toBe(
      [
        '*Simulação de financiamento imobiliário*',
        'Imóvel: R$ 400.000,00 · Entrada: R$ 80.000,00',
        'Financiado: R$ 320.000,00 em 360 meses (30 anos), juros de 11,49% ao ano',
        '',
        '*SAC* (parcelas que diminuem)',
        '1ª parcela: R$ 3.947,46 · última: R$ 965,42',
        'Total pago: R$ 883.745,89',
        '',
        '*PRICE* (parcelas fixas)',
        'Parcela: R$ 3.174,53',
        'Total pago: R$ 1.135.201,66',
        '',
        'No SAC o total fica R$ 251.455,77 menor, mas a 1ª parcela é mais alta.',
        '',
        'Parcelas já com seguros e taxa de administração. Valores aproximados: as condições finais dependem da aprovação do banco.',
        '',
        'Veja os detalhes: https://exemplo.app/?valor=400000',
      ].join('\n'),
    )
  })

  it('não inclui a renda do cliente', () => {
    expect(normalizar(gerarResumoCliente(DADOS, simular(ENTRADA), LINK))).not.toContain('15.000')
  })

  it('inclui a economia com amortização extra quando houver', () => {
    const r = simular({ ...ENTRADA, extraValor: 20_000_00, extraMes: 24, extraIntervalo: 24 })
    const texto = normalizar(gerarResumoCliente({ ...DADOS, descricaoExtra: 'R$ 20.000,00 a cada 2 anos' }, r, LINK))
    expect(texto).toContain('Usando R$ 20.000,00 a cada 2 anos para reduzir o prazo, a economia é de R$ 254.700,79 no SAC.')
  })

  it('inclui a fase de obra quando o imóvel é na planta', () => {
    const r = simular({ ...ENTRADA, obraMeses: 24, obraExecutada: 0.3 })
    const texto = normalizar(gerarResumoCliente(DADOS, r, LINK))
    expect(texto).toContain('*Durante a obra* (24 meses até as chaves)')
    expect(texto).toContain('As parcelas acima começam depois das chaves.')
  })

  it('sem encargos e sem juros: aviso adequado e sem frase de economia', () => {
    const r = simular({ ...ENTRADA, taxaAnual: 0, mipMensal: 0, dfiMensal: 0, taxaAdministracao: 0, prazoMeses: 100 })
    const texto = normalizar(gerarResumoCliente({ ...DADOS, taxaAnual: 0, prazoMeses: 100, temEncargos: false }, r, LINK))
    expect(texto).toContain('em 100 meses, juros')
    expect(texto).toContain('sem seguros e taxas')
    expect(texto).not.toContain('No SAC o total fica')
  })
})

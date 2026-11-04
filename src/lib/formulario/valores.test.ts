import { describe, expect, it } from 'vitest'
import { converter, VALORES_PADRAO, type ValoresFormulario } from './valores'

describe('VALORES_PADRAO', () => {
  it('vem formatado em padrão brasileiro', () => {
    expect(VALORES_PADRAO).toEqual({
      valorImovel: '400.000',
      entrada: '80.000',
      taxaAnual: '11,49',
      prazoMeses: '360',
      rendaMensal: '15.000',
    })
  })
})

describe('converter', () => {
  it('converte reais em centavos e % em decimal', () => {
    const resultado = converter(VALORES_PADRAO)
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return
    expect(resultado.entrada).toEqual({
      valorImovel: 400_000_00,
      entrada: 80_000_00,
      taxaAnual: expect.closeTo(0.1149, 10),
      prazoMeses: 360,
      rendaMensal: 15_000_00,
    })
  })

  it('aceita centavos digitados', () => {
    const resultado = converter({ ...VALORES_PADRAO, rendaMensal: '8.750,35' })
    expect(resultado.ok && resultado.entrada.rendaMensal).toBe(8_750_35)
  })

  it('diferencia campo vazio de texto inválido', () => {
    const valores: ValoresFormulario = { ...VALORES_PADRAO, valorImovel: '', rendaMensal: 'abc' }
    expect(converter(valores)).toEqual({
      ok: false,
      erros: { valorImovel: 'Campo obrigatório.', rendaMensal: 'Digite um número válido.' },
    })
  })

  it('erro de formato tem prioridade sobre o de regra no mesmo campo', () => {
    const resultado = converter({ ...VALORES_PADRAO, entrada: 'x' })
    expect(resultado).toEqual({ ok: false, erros: { entrada: 'Digite um número válido.' } })
  })

  it('repassa os erros de regra do módulo de cálculo', () => {
    const resultado = converter({ ...VALORES_PADRAO, entrada: '400.000', prazoMeses: '500' })
    expect(resultado).toEqual({
      ok: false,
      erros: {
        entrada: 'A entrada precisa ser menor que o valor do imóvel.',
        prazoMeses: 'O prazo deve ser de 1 a 420 meses.',
      },
    })
  })

  it('prazo com casas decimais é recusado', () => {
    const resultado = converter({ ...VALORES_PADRAO, prazoMeses: '360,5' })
    expect(resultado.ok).toBe(false)
  })
})

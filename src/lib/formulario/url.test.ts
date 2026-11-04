import { describe, expect, it } from 'vitest'
import { lerDaUrl, paraQueryString } from './url'
import { VALORES_PADRAO } from './valores'

describe('lerDaUrl', () => {
  it('sem parâmetros usa os valores padrão', () => {
    expect(lerDaUrl('')).toEqual(VALORES_PADRAO)
  })

  it('lê todos os campos e formata em padrão brasileiro', () => {
    expect(lerDaUrl('?valor=550000&entrada=110000.5&taxa=10.25&prazo=420&renda=20000')).toEqual({
      valorImovel: '550.000',
      entrada: '110.000,5',
      taxaAnual: '10,25',
      prazoMeses: '420',
      rendaMensal: '20.000',
    })
  })

  it('parâmetros ausentes, vazios ou inválidos caem no padrão', () => {
    expect(lerDaUrl('?valor=abc&taxa=&prazo=240')).toEqual({ ...VALORES_PADRAO, prazoMeses: '240' })
  })

  it('preserva a precisão da taxa (até 4 casas)', () => {
    expect(lerDaUrl('?taxa=9.8765').taxaAnual).toBe('9,8765')
  })

  it('ignora parâmetros desconhecidos', () => {
    expect(lerDaUrl('?utm_source=whatsapp&prazo=300')).toEqual({ ...VALORES_PADRAO, prazoMeses: '300' })
  })
})

describe('paraQueryString', () => {
  it('gera números em formato de máquina com nomes curtos', () => {
    expect(paraQueryString(VALORES_PADRAO)).toBe('valor=400000&entrada=80000&taxa=11.49&prazo=360&renda=15000')
  })

  it('omite campos que não são números', () => {
    expect(paraQueryString({ ...VALORES_PADRAO, entrada: 'abc', rendaMensal: '' })).toBe(
      'valor=400000&taxa=11.49&prazo=360',
    )
  })

  it('ida e volta: ler o que foi escrito devolve os mesmos valores', () => {
    const valores = { ...VALORES_PADRAO, valorImovel: '1.234.567,89', taxaAnual: '9,8765' }
    expect(lerDaUrl(`?${paraQueryString(valores)}`)).toEqual(valores)
  })
})

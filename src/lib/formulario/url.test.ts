import { describe, expect, it } from 'vitest'
import { lerDaUrl, paraQueryString } from './url'
import { VALORES_PADRAO } from './valores'

describe('lerDaUrl', () => {
  it('sem parâmetros usa os valores padrão', () => {
    expect(lerDaUrl('')).toEqual(VALORES_PADRAO)
  })

  it('lê todos os campos e formata em padrão brasileiro', () => {
    expect(
      lerDaUrl('?valor=550000&entrada=110000.5&taxa=10.25&prazo=420&renda=20000&mip=0.03&dfi=0.0075&adm=30&cota=90&obra=24&executada=30&extra=20000&mesExtra=24&repetir=24'),
    ).toEqual({
      valorImovel: '550.000',
      entrada: '110.000,5',
      taxaAnual: '10,25',
      prazoMeses: '420',
      rendaMensal: '20.000',
      mipMensal: '0,03',
      dfiMensal: '0,0075',
      taxaAdministracao: '30',
      cotaFinanciamento: '90',
      obraMeses: '24',
      obraExecutada: '30',
      extraValor: '20.000',
      extraMes: '24',
      extraIntervalo: '24',
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
    expect(paraQueryString(VALORES_PADRAO)).toBe(
      'valor=250000&entrada=50000&taxa=8.16&prazo=420&renda=6000&mip=0.025&dfi=0.01&adm=25&cota=80',
    )
  })

  it('omite campos que não são números', () => {
    expect(paraQueryString({ ...VALORES_PADRAO, entrada: 'abc', rendaMensal: '' })).toBe(
      'valor=250000&taxa=8.16&prazo=420&mip=0.025&dfi=0.01&adm=25&cota=80',
    )
  })

  it('sem valor extra, os campos de extra ficam fora do link', () => {
    const query = paraQueryString({ ...VALORES_PADRAO, extraValor: '', extraMes: '12', extraIntervalo: '24' })
    expect(query).not.toMatch(/extra|mesExtra|repetir/)
  })

  it('com valor extra, os campos de extra entram no link', () => {
    const query = paraQueryString({ ...VALORES_PADRAO, extraValor: '20.000', extraMes: '12', extraIntervalo: '24' })
    expect(query).toContain('extra=20000&mesExtra=12&repetir=24')
  })

  it('ida e volta: ler o que foi escrito devolve os mesmos valores', () => {
    const valores = { ...VALORES_PADRAO, valorImovel: '1.234.567,89', taxaAnual: '9,8765' }
    expect(lerDaUrl(`?${paraQueryString(valores)}`)).toEqual(valores)
  })
})

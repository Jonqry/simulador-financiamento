import { describe, expect, it } from 'vitest'
import { lerDaUrl, paraQueryString } from './url'
import { ESTADO_PADRAO, OPCOES_PADRAO, VALORES_PADRAO, type EstadoFormulario } from './valores'

const comValores = (valores: Partial<typeof VALORES_PADRAO>, opcoes: Partial<typeof OPCOES_PADRAO> = {}): EstadoFormulario => ({
  valores: { ...VALORES_PADRAO, ...valores },
  opcoes: { ...OPCOES_PADRAO, ...opcoes },
})

describe('lerDaUrl', () => {
  it('sem parâmetros usa o estado padrão', () => {
    expect(lerDaUrl('')).toEqual(ESTADO_PADRAO)
  })

  it('lê todos os campos e formata em padrão brasileiro', () => {
    expect(
      lerDaUrl(
        '?valor=550000&entrada=110000.5&fgts=15000&subsidio=5000&taxa=10.25&prazo=420&renda=20000&mip=0.03&dfi=0.0075&adm=30&cota=90&limite=25&obra=24&executada=30&extra=20000&mesExtra=24&repetir=24',
      ).valores,
    ).toEqual({
      valorImovel: '550.000',
      entrada: '110.000,5',
      fgtsEntrada: '15.000',
      subsidio: '5.000',
      taxaAnual: '10,25',
      prazoMeses: '420',
      rendaMensal: '20.000',
      mipMensal: '0,03',
      dfiMensal: '0,0075',
      taxaAdministracao: '30',
      cotaFinanciamento: '90',
      limiteRenda: '25',
      obraMeses: '24',
      obraExecutada: '30',
      extraValor: '20.000',
      extraMes: '24',
      extraIntervalo: '24',
      tetoFaixa12: '275.000',
    })
  })

  it('lê as opções', () => {
    expect(lerDaUrl('?modo=renda&regiao=SSECO&cotista=1&temImovel=1&nominal=1&prazoEm=anos&sistema=SAC&comparar=1').opcoes).toEqual({
      modo: 'renda',
      regiao: 'SSECO',
      cotista: true,
      temImovel: true,
      taxaManual: false,
      taxaNominal: true,
      prazoEmAnos: true,
      sistema: 'SAC',
      comparar: true,
    })
  })

  it('opções desconhecidas caem no padrão', () => {
    expect(lerDaUrl('?modo=x&regiao=y&sistema=z&cotista=sim').opcoes).toEqual(OPCOES_PADRAO)
  })

  it('link com taxa reabre com a taxa manual (inclusive links antigos)', () => {
    const { valores, opcoes } = lerDaUrl('?taxa=9.8765')
    expect(opcoes.taxaManual).toBe(true)
    expect(valores.taxaAnual).toBe('9,8765') // preserva até 4 casas
  })

  it('sem taxa no link, a taxa é automática', () => {
    expect(lerDaUrl('?valor=300000').opcoes.taxaManual).toBe(false)
  })

  it('prazo em anos: o link guarda meses e o campo mostra anos', () => {
    expect(lerDaUrl('?prazo=354&prazoEm=anos').valores.prazoMeses).toBe('29,5')
  })

  it('entrada em percentual do imóvel', () => {
    expect(lerDaUrl('?entrada=20%25').valores.entrada).toBe('20%')
  })

  it('parâmetros ausentes, vazios ou inválidos caem no padrão', () => {
    expect(lerDaUrl('?valor=abc&taxa=&prazo=240&entrada=x%25')).toEqual(comValores({ prazoMeses: '240' }))
  })

  it('ignora parâmetros desconhecidos', () => {
    expect(lerDaUrl('?utm_source=whatsapp&prazo=300')).toEqual(comValores({ prazoMeses: '300' }))
  })
})

describe('paraQueryString', () => {
  it('gera números em formato de máquina com nomes curtos; taxa automática fica de fora', () => {
    expect(paraQueryString(ESTADO_PADRAO)).toBe(
      'valor=250000&entrada=50000&prazo=420&renda=6000&mip=0.025&dfi=0.01&adm=25&cota=80&limite=30&teto12=275000',
    )
  })

  it('taxa manual entra no link', () => {
    expect(paraQueryString(comValores({ taxaAnual: '9,5' }, { taxaManual: true }))).toContain('taxa=9.5')
  })

  it('omite campos que não são números', () => {
    expect(paraQueryString(comValores({ entrada: 'abc', rendaMensal: '' }))).toBe(
      'valor=250000&prazo=420&mip=0.025&dfi=0.01&adm=25&cota=80&limite=30&teto12=275000',
    )
  })

  it('sem valor extra, os campos de extra ficam fora do link', () => {
    const query = paraQueryString(comValores({ extraValor: '', extraMes: '12', extraIntervalo: '24' }))
    expect(query).not.toMatch(/extra|mesExtra|repetir/)
  })

  it('com valor extra, os campos de extra entram no link', () => {
    const query = paraQueryString(comValores({ extraValor: '20.000', extraMes: '12', extraIntervalo: '24' }))
    expect(query).toContain('extra=20000&mesExtra=12&repetir=24')
  })

  it('só grava as opções diferentes do padrão', () => {
    const query = paraQueryString(
      comValores({}, { modo: 'renda', regiao: 'SSECO', cotista: true, temImovel: true, taxaNominal: true, sistema: 'PRICE', comparar: true }),
    )
    expect(query).toContain('modo=renda&regiao=SSECO&cotista=1&temImovel=1&nominal=1&sistema=PRICE&comparar=1')
  })

  it.each<[Partial<typeof VALORES_PADRAO>, Partial<typeof OPCOES_PADRAO>]>([
    [{ valorImovel: '1.234.567,89', taxaAnual: '9,8765' }, { taxaManual: true }],
    [{ prazoMeses: '29,5' }, { prazoEmAnos: true }],
    [{ entrada: '20%' }, {}],
    [{ fgtsEntrada: '12.000', subsidio: '30.000', limiteRenda: '25', tetoFaixa12: '210.000' }, { cotista: true, temImovel: true }],
  ])('ida e volta: ler o que foi escrito devolve o mesmo estado (%o)', (valores, opcoes) => {
    const estado = comValores(valores, opcoes)
    expect(lerDaUrl(`?${paraQueryString(estado)}`)).toEqual(estado)
  })
})

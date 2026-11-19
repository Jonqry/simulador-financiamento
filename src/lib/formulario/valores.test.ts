import { describe, expect, it } from 'vitest'
import { taxaMensalDeAnualEfetiva } from '../financiamento'
import { imovelMaximoPelaRenda } from '../imovelPelaRenda'
import {
  converter,
  converterTextoPrazo,
  OPCOES_PADRAO,
  VALORES_PADRAO,
  type OpcoesFormulario,
  type ValoresFormulario,
} from './valores'

const conv = (valores: Partial<ValoresFormulario> = {}, opcoes: Partial<OpcoesFormulario> = {}) =>
  converter({ ...VALORES_PADRAO, ...valores }, { ...OPCOES_PADRAO, ...opcoes })

/** Atalho para os testes que só olham a entrada convertida. */
function entradaOk(valores: Partial<ValoresFormulario> = {}, opcoes: Partial<OpcoesFormulario> = {}) {
  const r = conv(valores, opcoes)
  if (!r.ok) throw new Error(`esperava sucesso, veio ${JSON.stringify(r.erros)}`)
  return r
}

describe('VALORES_PADRAO', () => {
  it('vem formatado em padrão brasileiro, com a taxa vazia (é automática)', () => {
    expect(VALORES_PADRAO).toEqual({
      valorImovel: '250.000',
      entrada: '50.000',
      fgtsEntrada: '',
      subsidio: '',
      taxaAnual: '',
      prazoMeses: '420',
      rendaMensal: '6.000',
      mipMensal: '0,025',
      dfiMensal: '0,01',
      taxaAdministracao: '25',
      cotaFinanciamento: '80',
      limiteRenda: '30',
      obraMeses: '',
      obraExecutada: '',
      extraValor: '',
      extraMes: '',
      extraIntervalo: '0',
    })
  })
})

describe('converter', () => {
  it('converte reais em centavos e % em decimal, com a taxa do enquadramento', () => {
    const r = entradaOk()
    expect(r.entrada).toEqual({
      valorImovel: 250_000_00,
      entrada: 50_000_00,
      taxaAnual: 0.0816,
      taxaNominal: false,
      prazoMeses: 420,
      rendaMensal: 6_000_00,
      mipMensal: expect.closeTo(0.00025, 12),
      dfiMensal: expect.closeTo(0.0001, 12),
      taxaAdministracao: 25_00,
      cotaFinanciamento: expect.closeTo(0.8, 12),
      limiteRenda: expect.closeTo(0.3, 12),
      extraIntervalo: 0,
    })
    expect(r.enquadramento).toMatchObject({ programa: 'MCMV', faixa: 3 })
  })

  it('campos opcionais vazios não são erro (seguros zerados, sem extra)', () => {
    expect(conv({ mipMensal: '', dfiMensal: '', taxaAdministracao: '', limiteRenda: '' }).ok).toBe(true)
  })

  it('cota vazia vale 80%; cota fora de 10% a 90% é erro', () => {
    expect(conv({ cotaFinanciamento: '' }).ok).toBe(true)
    expect(conv({ cotaFinanciamento: '95' })).toMatchObject({ ok: false, erros: { cotaFinanciamento: 'Use um valor entre 10% e 90%.' } })
  })

  it('limite de renda fora de 10% a 50% é erro', () => {
    expect(conv({ limiteRenda: '60' })).toMatchObject({ ok: false, erros: { limiteRenda: 'Use um valor entre 10% e 50%.' } })
  })

  it('campo opcional com texto inválido é erro', () => {
    expect(conv({ mipMensal: 'x' })).toMatchObject({ ok: false, erros: { mipMensal: 'Digite um número válido.' } })
  })

  it('valor extra sem mês pede o mês', () => {
    expect(conv({ extraValor: '20.000' })).toMatchObject({ ok: false, erros: { extraMes: 'Informe um mês entre 1 e 420.' } })
  })

  it('converte o pagamento extra', () => {
    expect(entradaOk({ extraValor: '20.000', extraMes: '24', extraIntervalo: '24' }).entrada).toMatchObject({
      extraValor: 20_000_00,
      extraMes: 24,
      extraIntervalo: 24,
    })
  })

  it('aceita centavos digitados', () => {
    expect(entradaOk({ rendaMensal: '8.750,35' }).entrada.rendaMensal).toBe(8_750_35)
  })

  it('diferencia campo vazio de texto inválido', () => {
    expect(conv({ valorImovel: '', prazoMeses: 'abc' })).toEqual({
      ok: false,
      erros: { valorImovel: 'Campo obrigatório.', prazoMeses: 'Digite um número válido.' },
      enquadramento: expect.any(Object),
    })
  })

  it('erro de formato tem prioridade sobre o de regra no mesmo campo', () => {
    expect(conv({ entrada: 'x' })).toMatchObject({ ok: false, erros: { entrada: 'Digite um número válido.' } })
  })

  it('repassa os erros de regra do módulo de cálculo', () => {
    expect(conv({ entrada: '250.000', prazoMeses: '500' })).toMatchObject({
      ok: false,
      erros: {
        entrada: 'A entrada precisa ser menor que o valor do imóvel.',
        prazoMeses: 'O prazo deve ser de 1 a 420 meses.',
      },
    })
  })

  it('prazo com casas decimais é recusado', () => {
    expect(conv({ prazoMeses: '360,5' }).ok).toBe(false)
  })
})

describe('converter: taxa automática', () => {
  it('a taxa segue o imóvel: R$ 400.000 é Faixa 3 (8,16%) e R$ 400.001 já é Faixa 4 (10%)', () => {
    expect(entradaOk({ valorImovel: '400.000' }).entrada.taxaAnual).toBe(0.0816)
    const acima = entradaOk({ valorImovel: '400.001' })
    expect(acima.entrada.taxaAnual).toBe(0.1)
    expect(acima.enquadramento).toMatchObject({ programa: 'MCMV', faixa: 4, faixaPelaRenda: 3 })
  })

  it('a taxa segue a região e o FGTS', () => {
    expect(entradaOk({ rendaMensal: '4.900' }, { cotista: true }).entrada.taxaAnual).toBe(0.065)
    expect(entradaOk({ rendaMensal: '3.400' }, { regiao: 'SSECO' }).entrada.taxaAnual).toBe(0.055)
  })

  it('ignora o texto do campo de taxa enquanto ela é automática', () => {
    expect(entradaOk({ taxaAnual: 'qualquer coisa' }).entrada.taxaAnual).toBe(0.0816)
  })

  it('sem renda válida não há taxa: o erro aparece só na renda', () => {
    expect(conv({ rendaMensal: '' })).toEqual({ ok: false, erros: { rendaMensal: 'Campo obrigatório.' }, enquadramento: null })
  })

  it('com a renda válida, o enquadramento sai mesmo com erro em outro campo', () => {
    expect(conv({ prazoMeses: 'x' })).toMatchObject({ ok: false, enquadramento: { programa: 'MCMV', faixa: 3 } })
  })
})

describe('converter: taxa manual e nominal', () => {
  it('com taxa manual vale a taxa digitada, mesmo acima do teto da faixa', () => {
    expect(entradaOk({ taxaAnual: '9,5', valorImovel: '500.000' }, { taxaManual: true }).entrada.taxaAnual).toBeCloseTo(0.095, 12)
  })

  it('taxa manual vazia é erro', () => {
    expect(conv({ taxaAnual: '' }, { taxaManual: true })).toMatchObject({ ok: false, erros: { taxaAnual: 'Campo obrigatório.' } })
  })

  it('repassa a opção de taxa nominal', () => {
    expect(entradaOk({}, { taxaNominal: true }).entrada.taxaNominal).toBe(true)
  })
})

describe('converter: entrada, FGTS e subsídio', () => {
  it('entrada em percentual do imóvel ("20%")', () => {
    expect(entradaOk({ entrada: '20%' }).entrada.entrada).toBe(50_000_00)
    expect(entradaOk({ entrada: '12,5 %', valorImovel: '300.000' }).entrada.entrada).toBe(37_500_00)
  })

  it('entrada em percentual sem imóvel válido: o erro fica no imóvel', () => {
    expect(conv({ entrada: '20%', valorImovel: 'abc' })).toMatchObject({ ok: false, erros: { valorImovel: 'Digite um número válido.' } })
  })

  it('percentual inválido é erro de formato', () => {
    expect(conv({ entrada: 'x%' })).toMatchObject({ ok: false, erros: { entrada: 'Digite um número válido.' } })
  })

  it('FGTS e subsídio somam à entrada na regra "menor que o imóvel"', () => {
    expect(entradaOk({ fgtsEntrada: '10.000', subsidio: '5.000' }).entrada).toMatchObject({ fgtsEntrada: 10_000_00, subsidio: 5_000_00 })
    expect(conv({ fgtsEntrada: '150.000', subsidio: '50.000' })).toMatchObject({
      ok: false,
      erros: { entrada: 'A entrada precisa ser menor que o valor do imóvel.' },
    })
  })

  it('FGTS ou subsídio negativos são erro', () => {
    expect(conv({ fgtsEntrada: '-1', subsidio: '-1' })).toMatchObject({
      ok: false,
      erros: { fgtsEntrada: 'O valor não pode ser negativo.', subsidio: 'O valor não pode ser negativo.' },
    })
  })
})

describe('converter: prazo em anos', () => {
  it('converte anos em meses', () => {
    expect(entradaOk({ prazoMeses: '35' }, { prazoEmAnos: true }).entrada.prazoMeses).toBe(420)
    expect(entradaOk({ prazoMeses: '29,5' }, { prazoEmAnos: true }).entrada.prazoMeses).toBe(354)
  })

  it('anos acima do máximo dão o mesmo erro de prazo', () => {
    expect(conv({ prazoMeses: '36' }, { prazoEmAnos: true })).toMatchObject({ ok: false, erros: { prazoMeses: 'O prazo deve ser de 1 a 420 meses.' } })
  })
})

describe('converter: modo "quanto posso comprar" (pela renda)', () => {
  const RENDA = { modo: 'renda' } as const

  it('calcula o imóvel máximo e enquadra por ele', () => {
    const r = entradaOk({ valorImovel: 'ignorado' }, RENDA)
    const esperado = imovelMaximoPelaRenda({
      rendaMensal: 6_000_00,
      entrada: 50_000_00,
      prazoMeses: 420,
      encargos: { mipMensal: 0.00025, dfiMensal: 0.0001, taxaAdministracao: 25_00 },
      cota: 0.8,
      limiteRenda: 0.3,
      taxaMensalDe: taxaMensalDeAnualEfetiva,
      regiao: 'NNE',
      cotista: false,
      taxaManual: null,
      sistema: null,
    })
    expect(r.entrada.valorImovel).toBe(esperado.valorImovel)
    expect(r.imovelPelaRenda).toEqual(esperado)
    expect(r.entrada.taxaAnual).toBe(r.enquadramento.taxaAnual)
  })

  it('com taxa manual, usa a taxa digitada', () => {
    const manual = entradaOk({ taxaAnual: '12' }, { ...RENDA, taxaManual: true })
    const automatica = entradaOk({}, RENDA)
    expect(manual.entrada.taxaAnual).toBeCloseTo(0.12, 12)
    expect(manual.entrada.valorImovel).toBeLessThan(automatica.entrada.valorImovel)
  })

  it('sem entrada não dá para financiar: o erro fica na entrada', () => {
    expect(conv({ entrada: '0' }, RENDA)).toMatchObject({
      ok: false,
      erros: { entrada: 'Sem entrada não dá para financiar: o banco cobre só parte do imóvel (veja a cota).' },
    })
  })

  it('renda que não paga nem a taxa de administração: o erro fica na renda', () => {
    expect(conv({ rendaMensal: '50' }, RENDA)).toMatchObject({
      ok: false,
      erros: { rendaMensal: 'Com essa renda, a parcela não cabe em nenhum financiamento.' },
    })
  })

  it('com erro em outro campo não calcula e não acusa o imóvel (que nem aparece)', () => {
    expect(conv({ prazoMeses: 'x' }, RENDA)).toMatchObject({ ok: false, erros: { prazoMeses: 'Digite um número válido.' } })
    const r = conv({ prazoMeses: 'x' }, RENDA)
    expect(!r.ok && r.erros.valorImovel).toBe(undefined)
  })

  it('entrada em percentual não serve: ainda não há imóvel', () => {
    expect(conv({ entrada: '20%' }, RENDA)).toMatchObject({
      ok: false,
      erros: { entrada: 'Para calcular o imóvel pela renda, informe a entrada em reais.' },
    })
  })
})

describe('converterTextoPrazo', () => {
  it.each([
    ['420', true, '35'],
    ['354', true, '29,5'],
    ['35', false, '420'],
    ['29,5', false, '354'],
    ['abc', true, 'abc'],
  ] as const)('%s (para anos: %s) → %s', (texto, paraAnos, esperado) => {
    expect(converterTextoPrazo(texto, paraAnos)).toBe(esperado)
  })
})

describe('converter: modo pela renda com condições vazias', () => {
  it('cota, limite e seguros vazios usam os padrões (80%, 30%, sem seguros)', () => {
    const vazio = entradaOk({ cotaFinanciamento: '', limiteRenda: '', mipMensal: '', dfiMensal: '', taxaAdministracao: '' }, { modo: 'renda' })
    const explicito = entradaOk({ cotaFinanciamento: '80', limiteRenda: '30', mipMensal: '0', dfiMensal: '0', taxaAdministracao: '0' }, { modo: 'renda' })
    expect(vazio.entrada.valorImovel).toBe(explicito.entrada.valorImovel)
  })
})

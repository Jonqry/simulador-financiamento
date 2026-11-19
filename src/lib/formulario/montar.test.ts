import { describe, expect, it } from 'vitest'
import { montarSimulacao, type Simulacao } from './montar'
import { converter, ESTADO_PADRAO, OPCOES_PADRAO, VALORES_PADRAO, type OpcoesFormulario, type ValoresFormulario } from './valores'

const montar = (valores: Partial<ValoresFormulario> = {}, opcoes: Partial<OpcoesFormulario> = {}) =>
  montarSimulacao({ valores: { ...VALORES_PADRAO, ...valores }, opcoes: { ...OPCOES_PADRAO, ...opcoes } })

function ok(s: Simulacao) {
  if (!s.ok) throw new Error(`esperava sucesso, veio ${JSON.stringify(s.erros)}`)
  return s
}

describe('montarSimulacao', () => {
  it('cenário padrão: MCMV Faixa 3, PRICE em destaque e dentro da renda', () => {
    const s = ok(montarSimulacao(ESTADO_PADRAO))
    expect(s.enquadramento).toMatchObject({ programa: 'MCMV', faixa: 3 })
    expect(s).toMatchObject({ sistema: 'PRICE', outroSistema: 'SAC', reprovado: false })
    expect(s.saidas).toBeUndefined()
    expect(s.resultado.price.custos.primeiraParcela).toBe(1_508_57) // Caixa: R$ 1.508,16 (MIP pela idade)
  })

  it('SBPE abre em SAC', () => {
    const s = ok(montar({ valorImovel: '700.000', entrada: '200.000', rendaMensal: '25.000' }))
    expect(s.enquadramento.programa).toBe('SBPE')
    expect(s).toMatchObject({ sistema: 'SAC', outroSistema: 'PRICE' })
  })

  it('o sistema escolhido pelo corretor vale sobre o padrão do programa', () => {
    expect(ok(montar({}, { sistema: 'SAC' }))).toMatchObject({ sistema: 'SAC', outroSistema: 'PRICE' })
  })

  it('repassa os erros do formulário', () => {
    expect(montar({ rendaMensal: '' })).toEqual({ ok: false, erros: { rendaMensal: 'Campo obrigatório.' }, enquadramento: null })
  })

  it('no modo pela renda, informa o que limitou o imóvel', () => {
    const s = ok(montar({}, { modo: 'renda' }))
    expect(s.imovelPelaRenda).toMatchObject({ limitadoPor: expect.any(String) })
    expect(s.entrada.valorImovel).toBe(s.imovelPelaRenda!.valorImovel)
    expect(s.reprovado).toBe(false) // o imóvel máximo cabe na renda, por construção
  })
})

describe('montarSimulacao: reprovado pela renda', () => {
  // No cenário padrão, o SAC usa 31,68% da renda: escolhendo SAC, passa do limite.
  const reprovada = ok(montar({}, { sistema: 'SAC' }))

  it('reprova quando a maior parcela do sistema em destaque passa do limite', () => {
    expect(reprovada.reprovado).toBe(true)
    expect(reprovada.resultado.sac.comprometimento.nivel).toBe('acima')
  })

  it('aponta que o outro sistema cabe', () => {
    expect(reprovada.saidas?.outroSistemaCabe).toBe(true)
  })

  it('imóvel máximo: o mesmo do modo "quanto posso comprar"', () => {
    const pelaRenda = converter(VALORES_PADRAO, { ...OPCOES_PADRAO, modo: 'renda', sistema: 'SAC' })
    expect(pelaRenda.ok && pelaRenda.entrada.valorImovel).toBe(reprovada.saidas?.imovelMaximo)
    expect(reprovada.saidas!.imovelMaximo).toBeLessThan(250_000_00)
  })

  it('com a entrada necessária, a simulação passa; com R$ 1 a menos, não', () => {
    const entrada = reprovada.saidas!.entradaNecessaria / 100
    const reais = (v: number) => v.toFixed(2).replace('.', ',')
    expect(ok(montar({ entrada: reais(entrada) }, { sistema: 'SAC' })).reprovado).toBe(false)
    expect(ok(montar({ entrada: reais(entrada - 1) }, { sistema: 'SAC' })).reprovado).toBe(true)
  })

  it('com a renda necessária, a simulação passa', () => {
    const renda = (reprovada.saidas!.rendaNecessaria / 100).toFixed(2).replace('.', ',')
    expect(ok(montar({ rendaMensal: renda }, { sistema: 'SAC' })).reprovado).toBe(false)
  })

  it('quando nenhum sistema cabe, diz isso', () => {
    const s = ok(montar({ rendaMensal: '4.000' }))
    expect(s.reprovado).toBe(true)
    expect(s.saidas?.outroSistemaCabe).toBe(false)
  })
})

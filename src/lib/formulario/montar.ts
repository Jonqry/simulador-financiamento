import {
  encargosDaEntrada,
  entradaNecessaria,
  rendaMinimaNecessaria,
  simular,
  type Centavos,
  type EntradaSimulacao,
  type ResultadoSimulacao,
  type Sistema,
} from '../financiamento'
import type { ImovelPelaRenda } from '../imovelPelaRenda'
import { sistemaPadrao, type Enquadramento } from '../taxasReferencia'
import { calcularImovelPelaRenda, converter, type ErrosFormulario, type EstadoFormulario } from './valores'

/** O que resolveria uma simulação reprovada pela renda. */
export interface Saidas {
  /** Maior imóvel que cabe na renda com a entrada atual (o mesmo cálculo do modo "quanto posso comprar"). */
  imovelMaximo: Centavos
  /** Entrada total (recursos + FGTS + subsídio) que faria ESTE imóvel caber. */
  entradaNecessaria: Centavos
  /** Renda para a maior parcela caber no limite. */
  rendaNecessaria: Centavos
  /** O outro sistema cabe na renda? (ex.: no SBPE o SAC não passa, mas a PRICE sim) */
  outroSistemaCabe: boolean
}

export type Simulacao =
  | {
      ok: true
      entrada: EntradaSimulacao
      resultado: ResultadoSimulacao
      enquadramento: Enquadramento
      /** Sistema mostrado em destaque: o escolhido, ou o padrão do programa. */
      sistema: Sistema
      outroSistema: Sistema
      /** A maior parcela do sistema em destaque passa do limite de renda: não dá para seguir com essa simulação. */
      reprovado: boolean
      saidas?: Saidas
      imovelPelaRenda?: ImovelPelaRenda
    }
  | { ok: false; erros: ErrosFormulario; enquadramento: Enquadramento | null }

const chave = (sistema: Sistema) => (sistema === 'SAC' ? 'sac' : 'price')

/** Formulário → simulação pronta para a tela, com o sistema em destaque e, se reprovada, as saídas. */
export function montarSimulacao({ valores, opcoes }: EstadoFormulario): Simulacao {
  const conversao = converter(valores, opcoes)
  if (!conversao.ok) return conversao

  const { entrada, enquadramento, perfil } = conversao
  const resultado = simular(entrada)
  const sistema = opcoes.sistema ?? sistemaPadrao(enquadramento)
  const outroSistema: Sistema = sistema === 'SAC' ? 'PRICE' : 'SAC'
  const principal = resultado[chave(sistema)]
  const reprovado = principal.comprometimento.nivel === 'acima'

  const simulacao: Simulacao = {
    ok: true,
    entrada,
    resultado,
    enquadramento,
    sistema,
    outroSistema,
    reprovado,
    ...(conversao.imovelPelaRenda && { imovelPelaRenda: conversao.imovelPelaRenda }),
  }

  if (reprovado) {
    simulacao.saidas = {
      // O mesmo cálculo do modo "quanto posso comprar", com as mesmas opções.
      imovelMaximo: calcularImovelPelaRenda(entrada, opcoes, perfil).valorImovel,
      entradaNecessaria: entradaNecessaria(sistema, {
        valorImovel: entrada.valorImovel,
        rendaMensal: entrada.rendaMensal,
        taxaMensal: resultado.taxaMensal,
        prazoMeses: entrada.prazoMeses,
        encargos: encargosDaEntrada(entrada),
        limiteRenda: resultado.limiteRenda,
        cota: resultado.cotaFinanciamento,
      }),
      rendaNecessaria: rendaMinimaNecessaria(Math.max(...principal.parcelas.map((p) => p.total)), resultado.limiteRenda),
      outroSistemaCabe: resultado[chave(outroSistema)].comprometimento.nivel !== 'acima',
    }
  }

  return simulacao
}

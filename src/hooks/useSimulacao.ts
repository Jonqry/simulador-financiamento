import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import type { CampoSimulacao, ErrosSimulacao } from '../lib/financiamento'
import { montarSimulacao, type Simulacao } from '../lib/formulario/montar'
import { parseNumeroBR } from '../lib/formulario/numero'
import { lerDaUrl, paraQueryString } from '../lib/formulario/url'
import {
  converter,
  converterTextoPrazo,
  entradaEmPercentual,
  ESTADO_PADRAO,
  formatarValor,
  type EstadoFormulario,
  type OpcoesFormulario,
  type ValoresFormulario,
} from '../lib/formulario/valores'
import type { Enquadramento } from '../lib/taxasReferencia'

export type SimulacaoPronta = Extract<Simulacao, { ok: true }>

export interface EstadoSimulacao {
  valores: ValoresFormulario
  opcoes: OpcoesFormulario
  /** Digitar na taxa troca para a taxa manual. */
  alterar: (campo: CampoSimulacao, texto: string) => void
  alterarOpcao: <K extends keyof OpcoesFormulario>(opcao: K, valor: OpcoesFormulario[K]) => void
  usarTaxaAutomatica: () => void
  /** Ao sair do campo: "320000" vira "320.000". Texto inválido fica como está. */
  formatar: (campo: CampoSimulacao) => void
  /** Volta ao cenário inicial (próximo cliente). */
  reiniciar: () => void
  erros: ErrosSimulacao
  /** Programa e faixa com os valores atuais (null enquanto a renda é inválida). */
  enquadramento: Enquadramento | null
  /** null enquanto houver campo inválido. */
  simulacao: SimulacaoPronta | null
}

/**
 * Estado da simulação, com a URL como fonte de verdade compartilhável.
 *
 * - Estado inicial: lido da URL (quem abre um link vê os mesmos números).
 * - A cada alteração: a URL é reescrita com `history.replaceState`, que não
 *   cria entrada no histórico; com `pushState`, cada tecla digitada viraria
 *   um "voltar" do navegador.
 * - O cálculo usa `useDeferredValue`: o input responde na hora e o React
 *   recalcula tabela e gráficos (420 linhas × 2) com prioridade mais baixa.
 */
export function useSimulacao(): EstadoSimulacao {
  const [estado, setEstado] = useState<EstadoFormulario>(() => lerDaUrl(window.location.search))

  useEffect(() => {
    const query = paraQueryString(estado)
    const url = query ? `${window.location.pathname}?${query}` : window.location.pathname
    window.history.replaceState(null, '', url)
  }, [estado])

  const adiado = useDeferredValue(estado)

  // Erros vêm do estado atual (feedback imediato no campo);
  // o resultado pesado vem do estado adiado.
  const conversaoAtual = useMemo(() => converter(estado.valores, estado.opcoes), [estado])
  const simulacao = useMemo(() => montarSimulacao(adiado), [adiado])

  const mudarValores = (mudar: (valores: ValoresFormulario) => ValoresFormulario) =>
    setEstado((anterior) => {
      const valores = mudar(anterior.valores)
      // Mesmo objeto quando nada muda: evita re-renderizar e recalcular à toa.
      return valores === anterior.valores ? anterior : { ...anterior, valores }
    })

  return {
    valores: estado.valores,
    opcoes: estado.opcoes,
    alterar: (campo, texto) =>
      setEstado((anterior) => ({
        valores: { ...anterior.valores, [campo]: texto },
        opcoes: campo === 'taxaAnual' ? { ...anterior.opcoes, taxaManual: true } : anterior.opcoes,
      })),
    alterarOpcao: (opcao, valor) =>
      setEstado((anterior) => {
        const opcoes = { ...anterior.opcoes, [opcao]: valor }
        // Trocar a unidade do prazo converte o número: 420 meses viram 35 anos.
        const trocouUnidade = opcao === 'prazoEmAnos' && valor !== anterior.opcoes.prazoEmAnos
        const valores = trocouUnidade
          ? { ...anterior.valores, prazoMeses: converterTextoPrazo(anterior.valores.prazoMeses, Boolean(valor)) }
          : anterior.valores
        return { valores, opcoes }
      }),
    usarTaxaAutomatica: () =>
      setEstado((anterior) => ({
        valores: { ...anterior.valores, taxaAnual: '' },
        opcoes: { ...anterior.opcoes, taxaManual: false },
      })),
    formatar: (campo) =>
      mudarValores((valores) => {
        const numero = parseNumeroBR(valores[campo])
        if (numero === null) return valores
        const sufixo = campo === 'entrada' && entradaEmPercentual(valores.entrada) ? '%' : ''
        const formatado = formatarValor(campo, numero) + sufixo
        return formatado === valores[campo] ? valores : { ...valores, [campo]: formatado }
      }),
    reiniciar: () => setEstado(ESTADO_PADRAO),
    erros: conversaoAtual.ok ? {} : conversaoAtual.erros,
    enquadramento: conversaoAtual.enquadramento,
    simulacao: conversaoAtual.ok && simulacao.ok ? simulacao : null,
  }
}

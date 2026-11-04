import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { simular, type CampoSimulacao, type ErrosSimulacao, type ResultadoSimulacao } from '../lib/financiamento'
import { lerDaUrl, paraQueryString } from '../lib/formulario/url'
import { converter, type ValoresFormulario } from '../lib/formulario/valores'

export interface EstadoSimulacao {
  valores: ValoresFormulario
  alterar: (campo: CampoSimulacao, texto: string) => void
  erros: ErrosSimulacao
  /** null enquanto houver campo inválido. */
  resultado: ResultadoSimulacao | null
}

/**
 * Estado da simulação, com a URL como fonte de verdade compartilhável.
 *
 * - Estado inicial: lido da URL (quem abre um link vê os mesmos números).
 * - A cada alteração: a URL é reescrita com `history.replaceState`, que não
 *   cria entrada no histórico; com `pushState`, cada tecla digitada viraria
 *   um "voltar" do navegador.
 * - O cálculo usa `useDeferredValue`: o input responde na hora e o React
 *   recalcula tabela e gráficos (360 linhas × 2) com prioridade mais baixa.
 */
export function useSimulacao(): EstadoSimulacao {
  const [valores, setValores] = useState<ValoresFormulario>(() => lerDaUrl(window.location.search))

  useEffect(() => {
    const query = paraQueryString(valores)
    const url = query ? `${window.location.pathname}?${query}` : window.location.pathname
    window.history.replaceState(null, '', url)
  }, [valores])

  const valoresAdiados = useDeferredValue(valores)

  // Erros vêm dos valores atuais (feedback imediato no campo);
  // o resultado pesado vem dos valores adiados.
  const conversaoAtual = useMemo(() => converter(valores), [valores])
  const resultado = useMemo(() => {
    const conversao = converter(valoresAdiados)
    return conversao.ok ? simular(conversao.entrada) : null
  }, [valoresAdiados])

  return {
    valores,
    alterar: (campo, texto) => setValores((anteriores) => ({ ...anteriores, [campo]: texto })),
    erros: conversaoAtual.ok ? {} : conversaoAtual.erros,
    resultado: conversaoAtual.ok ? resultado : null,
  }
}

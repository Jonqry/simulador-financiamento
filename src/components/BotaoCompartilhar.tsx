import { useEffect, useState } from 'react'

type Estado = 'parado' | 'copiado' | 'falhou'

interface BotaoCopiarProps {
  rotulo: string
  rotuloCopiado: string
  /** Chamado só no clique: o texto é montado na hora, com a URL atual. */
  obterTexto: () => string
  desabilitado: boolean
  variante?: 'primario' | 'secundario'
  mensagemFalha: string
}

/**
 * Copia um texto para a área de transferência. A Clipboard API só existe em
 * contexto seguro (HTTPS/localhost) e pode ser negada pelo navegador, então há
 * uma mensagem alternativa.
 */
export function BotaoCopiar({ rotulo, rotuloCopiado, obterTexto, desabilitado, variante = 'primario', mensagemFalha }: BotaoCopiarProps) {
  const [estado, setEstado] = useState<Estado>('parado')

  useEffect(() => {
    if (estado === 'parado') return
    const timer = setTimeout(() => setEstado('parado'), 2500)
    return () => clearTimeout(timer)
  }, [estado])

  async function copiar() {
    try {
      await navigator.clipboard.writeText(obterTexto())
      setEstado('copiado')
    } catch {
      setEstado('falhou')
    }
  }

  const estilo =
    variante === 'primario'
      ? 'bg-slate-900 text-white hover:bg-slate-700 disabled:bg-slate-300'
      : 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 disabled:text-slate-400'

  return (
    <div>
      <button
        type="button"
        onClick={copiar}
        disabled={desabilitado}
        className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed ${estilo}`}
      >
        {estado === 'copiado' ? rotuloCopiado : rotulo}
      </button>
      <p role="status" className="mt-1 min-h-4 text-xs text-slate-500">
        {estado === 'falhou' && mensagemFalha}
      </p>
    </div>
  )
}

/** Copia o endereço atual, que já contém os valores (ver useSimulacao). */
export function BotaoCompartilhar({ desabilitado }: { desabilitado: boolean }) {
  return (
    <BotaoCopiar
      rotulo="Copiar link desta simulação"
      rotuloCopiado="Link copiado!"
      obterTexto={() => window.location.href}
      desabilitado={desabilitado}
      mensagemFalha="Não foi possível copiar. Copie o endereço da barra do navegador."
    />
  )
}

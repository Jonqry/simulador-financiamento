import { useEffect, useState } from 'react'

type Estado = 'parado' | 'copiado' | 'falhou'

/**
 * Copia o endereço atual (que já contém os valores, ver useSimulacao).
 * A Clipboard API só existe em contexto seguro (HTTPS/localhost) e pode ser
 * negada pelo navegador, então há uma mensagem alternativa.
 */
export function BotaoCompartilhar({ desabilitado }: { desabilitado: boolean }) {
  const [estado, setEstado] = useState<Estado>('parado')

  useEffect(() => {
    if (estado === 'parado') return
    const timer = setTimeout(() => setEstado('parado'), 2500)
    return () => clearTimeout(timer)
  }, [estado])

  async function copiar() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setEstado('copiado')
    } catch {
      setEstado('falhou')
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={copiar}
        disabled={desabilitado}
        className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {estado === 'copiado' ? 'Link copiado!' : 'Copiar link desta simulação'}
      </button>
      <p role="status" className="mt-1 min-h-4 text-xs text-slate-500">
        {estado === 'falhou' && 'Não foi possível copiar. Copie o endereço da barra do navegador.'}
      </p>
    </div>
  )
}

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

  const estilo = variante === 'primario' ? 'botao-principal' : 'botao-linha'

  return (
    <div>
      <button
        type="button"
        onClick={copiar}
        disabled={desabilitado}
        className={`botao w-full px-3 py-2.5 text-sm ${estilo}`}
      >
        {estado === 'copiado' ? rotuloCopiado : rotulo}
      </button>
      <p role="status" className="estreito mt-1 min-h-4 text-xs text-tinta-suave">
        {estado === 'falhou' && mensagemFalha}
      </p>
    </div>
  )
}

/** Copia o endereço atual, que já contém os valores (ver useSimulacao). */
export function BotaoCompartilhar({ desabilitado }: { desabilitado: boolean }) {
  return (
    <BotaoCopiar
      variante="secundario"
      rotulo="Copiar link"
      rotuloCopiado="Link copiado!"
      obterTexto={() => window.location.href}
      desabilitado={desabilitado}
      mensagemFalha="Não foi possível copiar."
    />
  )
}

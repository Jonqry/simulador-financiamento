import { useId } from 'react'

interface CampoProps {
  rotulo: string
  valor: string
  aoAlterar: (texto: string) => void
  erro?: string
  prefixo?: string
  sufixo?: string
  dica?: string
}

/**
 * Input de texto com rótulo, prefixo/sufixo e mensagem de erro acessível.
 *
 * Usa type="text" + inputMode="decimal" em vez de type="number": o number
 * não aceita "400.000,50", tem comportamento diferente entre navegadores e
 * muda o valor com a rodinha do mouse. O inputMode ainda abre o teclado
 * numérico no celular.
 */
export function Campo({ rotulo, valor, aoAlterar, erro, prefixo, sufixo, dica }: CampoProps) {
  const id = useId()
  const idDescricao = `${id}-descricao`
  const descricao = erro ?? dica

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {rotulo}
      </label>
      <div
        className={`mt-1 flex items-center rounded-lg border bg-white px-3 focus-within:ring-2 ${
          erro ? 'border-critico focus-within:ring-critico/30' : 'border-slate-300 focus-within:ring-sac/30'
        }`}
      >
        {prefixo && <span className="mr-2 text-sm text-slate-500">{prefixo}</span>}
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={valor}
          onChange={(evento) => aoAlterar(evento.target.value)}
          aria-invalid={erro ? true : undefined}
          aria-describedby={descricao ? idDescricao : undefined}
          className="w-full min-w-0 bg-transparent py-2 text-slate-900 tabular-nums outline-none"
        />
        {sufixo && <span className="ml-2 text-sm whitespace-nowrap text-slate-500">{sufixo}</span>}
      </div>
      {descricao && (
        <p id={idDescricao} className={`mt-1 text-xs ${erro ? 'font-medium text-critico' : 'text-slate-500'}`}>
          {descricao}
        </p>
      )}
    </div>
  )
}

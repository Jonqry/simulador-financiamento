import { useId, type ReactNode } from 'react'

interface CampoProps {
  rotulo: string
  valor: string
  aoAlterar: (texto: string) => void
  /** Chamado ao sair do campo (usado para formatar o número digitado). */
  aoSair?: () => void
  erro?: string
  prefixo?: string
  /** Texto ou um controle (ex.: seletor de unidade) dentro da caixa, à direita. */
  sufixo?: ReactNode
  dica?: ReactNode
}

/**
 * Input de texto com rótulo, prefixo/sufixo e mensagem de erro acessível.
 *
 * Usa type="text" + inputMode="decimal" em vez de type="number": o number
 * não aceita "400.000,50", tem comportamento diferente entre navegadores e
 * muda o valor com a rodinha do mouse. O inputMode ainda abre o teclado
 * numérico no celular.
 */
export function Campo({ rotulo, valor, aoAlterar, aoSair, erro, prefixo, sufixo, dica }: CampoProps) {
  const id = useId()
  const idDescricao = `${id}-descricao`
  const descricao = erro ?? dica

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold">
        {rotulo}
      </label>
      <div
        className={`mt-1 flex items-center rounded-xs border-[1.5px] bg-branco px-3 transition-shadow ${
          erro
            ? 'border-critico focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-critico)_30%,transparent)]'
            : 'border-linha focus-within:border-tinta focus-within:shadow-[0_0_0_3px_var(--color-sol)]'
        }`}
      >
        {prefixo && <span className="estreito mr-2 text-sm text-tinta-suave">{prefixo}</span>}
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={valor}
          onChange={(evento) => aoAlterar(evento.target.value)}
          onBlur={aoSair}
          aria-invalid={erro ? true : undefined}
          aria-describedby={descricao ? idDescricao : undefined}
          className="w-full min-w-0 bg-transparent py-2 font-medium text-tinta tabular-nums outline-none focus-visible:shadow-none"
        />
        {sufixo && <span className="estreito ml-2 text-sm whitespace-nowrap text-tinta-suave">{sufixo}</span>}
      </div>
      {descricao && (
        <p id={idDescricao} className={`estreito mt-1 text-sm leading-snug ${erro ? 'font-semibold text-critico' : 'text-tinta-suave'}`}>
          {descricao}
        </p>
      )}
    </div>
  )
}

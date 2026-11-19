import type { Sistema } from '../lib/financiamento'

interface SeletorSistemaProps {
  valor: Sistema
  aoAlterar: (sistema: Sistema) => void
  rotulo: string
  /** Ordem dos botões: o sistema em destaque primeiro. */
  ordem: readonly Sistema[]
}

/** Controle segmentado entre os dois sistemas. */
export function SeletorSistema({ valor, aoAlterar, rotulo, ordem }: SeletorSistemaProps) {
  return (
    <div role="group" aria-label={rotulo} className="inline-flex rounded-xs border-2 border-tinta bg-branco">
      {ordem.map((sistema) => (
        <button
          key={sistema}
          type="button"
          aria-pressed={valor === sistema}
          onClick={() => aoAlterar(sistema)}
          className={`flex items-center gap-1.5 px-3 py-1 text-sm font-semibold transition ${
            valor === sistema ? 'bg-tinta text-branco' : 'text-tinta-suave hover:bg-sol hover:text-tinta'
          }`}
        >
          <span aria-hidden className={`marcador ${sistema === 'SAC' ? 'bg-sac' : 'bg-price'}`} />
          {sistema}
        </button>
      ))}
    </div>
  )
}

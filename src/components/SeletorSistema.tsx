import type { Sistema } from '../lib/financiamento'

interface SeletorSistemaProps {
  valor: Sistema
  aoAlterar: (sistema: Sistema) => void
  rotulo: string
}

/** Controle segmentado SAC | PRICE. */
export function SeletorSistema({ valor, aoAlterar, rotulo }: SeletorSistemaProps) {
  return (
    <div role="group" aria-label={rotulo} className="inline-flex rounded-lg bg-slate-100 p-1">
      {(['SAC', 'PRICE'] as const).map((sistema) => (
        <button
          key={sistema}
          type="button"
          aria-pressed={valor === sistema}
          onClick={() => aoAlterar(sistema)}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition ${
            valor === sistema ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span aria-hidden className={`size-2 rounded-full ${sistema === 'SAC' ? 'bg-sac' : 'bg-price'}`} />
          {sistema}
        </button>
      ))}
    </div>
  )
}

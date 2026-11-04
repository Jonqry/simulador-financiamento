import { formatarBRL, formatarPercentual, rendaMinimaNecessaria, type Comprometimento } from '../lib/financiamento'

const ESTILO = {
  ok: { icone: '✓', titulo: 'Cabe na renda', classe: 'border-bom/40 bg-bom/10', corIcone: 'bg-bom' },
  atencao: { icone: '!', titulo: 'Perto do limite', classe: 'border-atencao/60 bg-atencao/15', corIcone: 'bg-atencao' },
  acima: { icone: '✕', titulo: 'Acima do limite', classe: 'border-critico/40 bg-critico/10', corIcone: 'bg-critico' },
} as const

interface AlertaRendaProps {
  comprometimento: Comprometimento
  maiorPrestacao: number
}

/**
 * Nível sempre comunicado por ícone + texto, nunca só pela cor
 * (daltônicos não distinguem verde de vermelho com segurança).
 */
export function AlertaRenda({ comprometimento, maiorPrestacao }: AlertaRendaProps) {
  const { nivel, percentual, limite } = comprometimento
  const estilo = ESTILO[nivel]

  return (
    <div className={`flex gap-3 rounded-lg border p-3 text-sm ${estilo.classe}`}>
      <span
        aria-hidden
        className={`flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${estilo.corIcone}`}
      >
        {estilo.icone}
      </span>
      <div className="text-slate-800">
        <p className="font-semibold">{estilo.titulo}</p>
        <p>
          A maior parcela usa <strong className="tabular-nums">{formatarPercentual(percentual)}</strong> da renda
          (limite usual: {formatarPercentual(limite)}).
        </p>
        {nivel === 'acima' && (
          <p className="mt-1">
            Renda necessária: <strong className="tabular-nums">{formatarBRL(rendaMinimaNecessaria(maiorPrestacao, limite))}</strong>
          </p>
        )}
      </div>
    </div>
  )
}

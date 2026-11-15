import { formatarBRL, formatarPercentual, rendaMinimaNecessaria, type Comprometimento } from '../lib/financiamento'

const ESTILO = {
  ok: { icone: '✓', titulo: 'Cabe na renda', classe: 'border-bom bg-bom/8', corIcone: 'bg-bom text-branco' },
  atencao: { icone: '!', titulo: 'Perto do limite', classe: 'border-atencao bg-atencao/12', corIcone: 'bg-atencao text-tinta' },
  acima: { icone: '✕', titulo: 'Acima do limite', classe: 'border-critico bg-critico/8', corIcone: 'bg-critico text-branco' },
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
    <div className={`mt-auto flex gap-3 border-l-4 p-3 text-sm ${estilo.classe}`}>
      <span
        aria-hidden
        className={`flex size-5 shrink-0 items-center justify-center text-xs font-bold ${estilo.corIcone}`}
      >
        {estilo.icone}
      </span>
      <div>
        <p className="font-bold">{estilo.titulo}</p>
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

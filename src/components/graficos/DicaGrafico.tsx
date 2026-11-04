import { formatarBRL } from '../../lib/financiamento'
import { rotuloMes } from '../../lib/graficos'

export interface ItemDica {
  nome: string
  valor: number
  cor: string
}

interface DicaGraficoProps {
  mes: number | undefined
  itens: ItemDica[]
  total?: { nome: string; valor: number }
}

/**
 * Tooltip dos gráficos. O texto usa cores neutras; a identidade da série vem
 * da bolinha colorida ao lado (texto colorido em amarelo/aqua fica ilegível).
 */
export function DicaGrafico({ mes, itens, total }: DicaGraficoProps) {
  if (mes === undefined || itens.length === 0) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-medium text-slate-900">{rotuloMes(mes)}</p>
      <ul className="space-y-0.5">
        {itens.map((item) => (
          <li key={item.nome} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: item.cor }} />
              {item.nome}
            </span>
            <span className="text-slate-900 tabular-nums">{formatarBRL(item.valor)}</span>
          </li>
        ))}
        {total && (
          <li className="flex justify-between gap-4 border-t border-slate-100 pt-0.5 font-medium">
            <span className="text-slate-600">{total.nome}</span>
            <span className="text-slate-900 tabular-nums">{formatarBRL(total.valor)}</span>
          </li>
        )}
      </ul>
    </div>
  )
}

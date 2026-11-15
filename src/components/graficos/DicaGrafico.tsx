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
 * da marcador colorido ao lado (texto colorido em amarelo/aqua fica ilegível).
 */
export function DicaGrafico({ mes, itens, total }: DicaGraficoProps) {
  if (mes === undefined || itens.length === 0) return null
  return (
    <div className="rounded-xs border-2 border-tinta bg-branco px-3 py-2 text-sm">
      <p className="mb-1 font-bold">{rotuloMes(mes)}</p>
      <ul className="space-y-0.5">
        {itens.map((item) => (
          <li key={item.nome} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-tinta-suave">
              <span aria-hidden className="marcador" style={{ backgroundColor: item.cor }} />
              {item.nome}
            </span>
            <span className="font-medium tabular-nums">{formatarBRL(item.valor)}</span>
          </li>
        ))}
        {total && (
          <li className="flex justify-between gap-4 border-t-[1.5px] border-linha pt-0.5 font-bold">
            <span>{total.nome}</span>
            <span className="tabular-nums">{formatarBRL(total.valor)}</span>
          </li>
        )}
      </ul>
    </div>
  )
}

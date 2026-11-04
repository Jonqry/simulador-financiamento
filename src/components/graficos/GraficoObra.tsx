import { useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CORES } from '../../cores'
import { formatarBRL, formatarBRLCompacto, formatarPercentual, type ParcelaObra } from '../../lib/financiamento'
import { dadosObra, type PontoObra } from '../../lib/graficos'
import { Legenda } from './Legenda'

/**
 * Encargo mensal durante a obra: cresce junto com o valor liberado à
 * construtora. Mesmas cores do gráfico de composição (juros = violeta,
 * seguros e taxa = magenta), para a leitura ser a mesma nos dois.
 */
export function GraficoObra({ parcelas }: { parcelas: ParcelaObra[] }) {
  const dados = useMemo(() => dadosObra(parcelas), [parcelas])

  return (
    <figure>
      <Legenda
        itens={[
          { nome: 'Juros de obra', cor: CORES.juros },
          { nome: 'Seguros e taxa', cor: CORES.encargos },
        ]}
      />
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dados} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
            <CartesianGrid stroke={CORES.grade} vertical={false} />
            <XAxis
              dataKey="mes"
              type="number"
              domain={[1, parcelas.length]}
              allowDecimals={false}
              tickFormatter={(mes: number) => `mês ${mes}`}
              tick={{ fill: CORES.eixo, fontSize: 12 }}
              axisLine={{ stroke: CORES.grade }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(centavos: number) => formatarBRLCompacto(centavos)}
              tick={{ fill: CORES.eixo, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={84}
            />
            <Tooltip
              cursor={{ stroke: CORES.eixo, strokeWidth: 1 }}
              content={({ active, payload }) => {
                const ponto = payload?.[0]?.payload as PontoObra | undefined
                if (!active || !ponto) return null
                return (
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
                    <p className="font-medium text-slate-900">
                      Mês {ponto.mes} · obra em {formatarPercentual(ponto.percentualObra)}
                    </p>
                    <p className="text-slate-600">
                      Juros: <span className="text-slate-900 tabular-nums">{formatarBRL(ponto.juros)}</span>
                    </p>
                    <p className="text-slate-600">
                      Seguros e taxa: <span className="text-slate-900 tabular-nums">{formatarBRL(ponto.encargos)}</span>
                    </p>
                    <p className="border-t border-slate-100 font-medium text-slate-600">
                      Total: <span className="text-slate-900 tabular-nums">{formatarBRL(ponto.juros + ponto.encargos)}</span>
                    </p>
                  </div>
                )
              }}
            />
            <Area dataKey="juros" stackId="obra" stroke={CORES.juros} strokeWidth={2} fill={CORES.juros} fillOpacity={0.15} isAnimationActive={false} />
            <Area dataKey="encargos" stackId="obra" stroke={CORES.encargos} strokeWidth={2} fill={CORES.encargos} fillOpacity={0.2} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">Encargo mensal durante a obra, dividido entre juros e seguros com taxa.</figcaption>
    </figure>
  )
}

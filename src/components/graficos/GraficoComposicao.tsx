import { useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CORES } from '../../cores'
import { formatarBRLCompacto, type Parcela } from '../../lib/financiamento'
import { dadosComposicao, marcasAnuais, type PontoComposicao } from '../../lib/graficos'
import { DicaGrafico } from './DicaGrafico'
import { Legenda } from './Legenda'

/**
 * Quanto de cada parcela é juros e quanto é amortização (áreas empilhadas:
 * a altura total é a própria parcela). Mostra por que, na PRICE, a dívida
 * quase não cai nos primeiros anos.
 */
export function GraficoComposicao({ parcelas }: { parcelas: Parcela[] }) {
  const dados = useMemo(() => dadosComposicao(parcelas), [parcelas])
  const prazo = parcelas.length

  return (
    <figure>
      <Legenda
        itens={[
          { nome: 'Amortização', cor: CORES.amortizacao },
          { nome: 'Juros', cor: CORES.juros },
        ]}
      />
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dados} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
            <CartesianGrid stroke={CORES.grade} vertical={false} />
            <XAxis
              dataKey="mes"
              type="number"
              domain={[1, prazo]}
              ticks={marcasAnuais(prazo).filter((mes) => mes > 0)}
              tickFormatter={(mes: number) => (mes === 0 ? '0' : `${mes / 12} anos`)}
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
                const ponto = payload?.[0]?.payload as PontoComposicao | undefined
                if (!active || !ponto) return null
                return (
                  <DicaGrafico
                    mes={ponto.mes}
                    itens={[
                      { nome: 'Amortização', valor: ponto.amortizacao, cor: CORES.amortizacao },
                      { nome: 'Juros', valor: ponto.juros, cor: CORES.juros },
                    ]}
                    total={{ nome: 'Parcela', valor: ponto.amortizacao + ponto.juros }}
                  />
                )
              }}
            />
            <Area
              dataKey="amortizacao"
              name="Amortização"
              stackId="parcela"
              stroke={CORES.amortizacao}
              strokeWidth={2}
              fill={CORES.amortizacao}
              fillOpacity={0.25}
              isAnimationActive={false}
            />
            <Area
              dataKey="juros"
              name="Juros"
              stackId="parcela"
              stroke={CORES.juros}
              strokeWidth={2}
              fill={CORES.juros}
              fillOpacity={0.15}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        Composição de cada parcela entre juros e amortização. Os valores exatos estão na tabela de amortização.
      </figcaption>
    </figure>
  )
}

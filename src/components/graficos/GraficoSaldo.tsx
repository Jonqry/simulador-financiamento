import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CORES } from '../../cores'
import { formatarBRLCompacto, type ResultadoSimulacao } from '../../lib/financiamento'
import { dadosSaldo, marcasAnuais, type PontoSaldo } from '../../lib/graficos'
import { DicaGrafico } from './DicaGrafico'
import { Legenda } from './Legenda'

/** Saldo devedor ao longo do tempo: a PRICE demora mais para "baixar" a dívida. */
export function GraficoSaldo({ resultado }: { resultado: ResultadoSimulacao }) {
  const dados = useMemo(
    () => dadosSaldo(resultado.valorFinanciado, resultado.sac.parcelas, resultado.price.parcelas),
    [resultado],
  )
  const prazo = resultado.sac.parcelas.length

  return (
    <figure>
      <Legenda
        itens={[
          { nome: 'SAC', cor: CORES.sac },
          { nome: 'PRICE', cor: CORES.price },
        ]}
      />
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dados} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
            <CartesianGrid stroke={CORES.grade} vertical={false} />
            <XAxis
              dataKey="mes"
              type="number"
              domain={[0, prazo]}
              ticks={marcasAnuais(prazo)}
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
                const ponto = payload?.[0]?.payload as PontoSaldo | undefined
                if (!active || !ponto) return null
                return (
                  <DicaGrafico
                    mes={ponto.mes}
                    itens={[
                      { nome: 'Saldo SAC', valor: ponto.sac, cor: CORES.sac },
                      { nome: 'Saldo PRICE', valor: ponto.price, cor: CORES.price },
                    ]}
                  />
                )
              }}
            />
            {/* Animação desligada: os dados mudam a cada tecla e a animação atrasaria a leitura. */}
            <Line dataKey="sac" name="SAC" stroke={CORES.sac} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="price" name="PRICE" stroke={CORES.price} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        Saldo devedor mês a mês nos dois sistemas. Os valores exatos estão na tabela de amortização.
      </figcaption>
    </figure>
  )
}

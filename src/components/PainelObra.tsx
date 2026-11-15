import { lazy, Suspense } from 'react'
import { formatarBRL, type ResultadoObra, type ResultadoSimulacao } from '../lib/financiamento'

const GraficoObra = lazy(() => import('./graficos/Graficos').then((m) => ({ default: m.GraficoObra })))

function Indicador({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="rounded-xs border-[1.5px] border-linha bg-branco p-3">
      <p className="estreito text-sm text-tinta-suave">{rotulo}</p>
      <p className="largo mt-1 text-xl font-extrabold tabular-nums">{valor}</p>
      {detalhe && <p className="estreito text-sm text-tinta-suave">{detalhe}</p>}
    </div>
  )
}

interface PainelObraProps {
  obra: ResultadoObra
  resultado: ResultadoSimulacao
}

/**
 * Fase de obra (imóvel na planta): o que o cliente paga até as chaves e o que
 * muda depois. É a parte que mais surpreende quem compra na planta, porque o
 * encargo cresce todo mês e não abate a dívida.
 */
export function PainelObra({ obra, resultado }: PainelObraProps) {
  const { resumo, parcelas, custoTotal } = obra
  const percentualInicial = parcelas[0]!.percentualObra

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Indicador
          rotulo="1º mês da obra"
          valor={formatarBRL(resumo.primeiroEncargo)}
          detalhe={`obra em ${Math.round(percentualInicial * 100)}%`}
        />
        <Indicador rotulo={`Último mês (${resumo.meses}º)`} valor={formatarBRL(resumo.ultimoEncargo)} detalhe="obra em 100%" />
        <Indicador
          rotulo={`Total pago em ${resumo.meses} meses`}
          valor={formatarBRL(resumo.totalPago)}
          detalhe={`${formatarBRL(resumo.totalJuros)} só de juros`}
        />
      </div>

      <Suspense fallback={<div className="grade-planta h-64 animate-pulse bg-piso" aria-label="Carregando gráfico" />}>
        <GraficoObra parcelas={parcelas} />
      </Suspense>

      <div className="border-l-4 border-sol bg-branco p-3 text-sm">
        <p>
          <strong>Nessa fase a dívida não diminui:</strong> paga-se juros sobre o valor já repassado à construtora, mais
          seguros e taxa. A amortização começa depois das chaves, com a 1ª parcela de{' '}
          <strong className="tabular-nums">{formatarBRL(resultado.sac.custos.primeiraParcela)}</strong> no SAC ou{' '}
          <strong className="tabular-nums">{formatarBRL(resultado.price.custos.primeiraParcela)}</strong> na PRICE.
        </p>
        <p className="mt-1">
          Custo total (obra + financiamento):{' '}
          <strong className="tabular-nums">{formatarBRL(custoTotal.SAC)}</strong> no SAC e{' '}
          <strong className="tabular-nums">{formatarBRL(custoTotal.PRICE)}</strong> na PRICE.
        </p>
      </div>
      <p className="estreito text-sm text-tinta-suave">
        Modelo com evolução linear da obra; o cronograma real de medições da construtora pode variar. Sem correção pela TR.
      </p>
    </div>
  )
}

import { lazy, Suspense } from 'react'
import { formatarBRL, type ResultadoObra, type ResultadoSimulacao } from '../lib/financiamento'

const GraficoObra = lazy(() => import('./graficos/Graficos').then((m) => ({ default: m.GraficoObra })))

function Indicador({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-xs text-slate-600">{rotulo}</p>
      <p className="mt-0.5 text-lg font-semibold text-slate-900 tabular-nums">{valor}</p>
      {detalhe && <p className="text-xs text-slate-500">{detalhe}</p>}
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

      <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-slate-100" aria-label="Carregando gráfico" />}>
        <GraficoObra parcelas={parcelas} />
      </Suspense>

      <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
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
      <p className="text-xs text-slate-500">
        Modelo com evolução linear da obra; o cronograma real de medições da construtora pode variar. Sem correção pela TR.
      </p>
    </div>
  )
}

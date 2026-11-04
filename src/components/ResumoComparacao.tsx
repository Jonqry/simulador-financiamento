import { formatarBRL, type ResultadoSimulacao, type ResultadoSistema, type Sistema } from '../lib/financiamento'
import { AlertaRenda } from './AlertaRenda'

const DESCRICAO: Record<Sistema, string> = {
  SAC: 'Parcelas decrescentes',
  PRICE: 'Parcelas fixas',
}

function Linha({ rotulo, valor, destaque = false }: { rotulo: string; valor: number; destaque?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-sm text-slate-600">{rotulo}</dt>
      <dd className={`tabular-nums ${destaque ? 'text-xl font-semibold text-slate-900' : 'text-slate-900'}`}>
        {formatarBRL(valor)}
      </dd>
    </div>
  )
}

function CartaoSistema({ sistema, dados }: { sistema: Sistema; dados: ResultadoSistema }) {
  const { resumo, comprometimento, parcelas } = dados
  const maiorPrestacao = Math.max(...parcelas.map((p) => p.prestacao))

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="flex items-center gap-2">
        <span aria-hidden className={`size-3 rounded-full ${sistema === 'SAC' ? 'bg-sac' : 'bg-price'}`} />
        <h3 className="font-semibold text-slate-900">{sistema === 'SAC' ? 'SAC' : 'Tabela PRICE'}</h3>
        <span className="text-sm text-slate-500">· {DESCRICAO[sistema]}</span>
      </header>
      <dl className="space-y-1.5">
        <Linha rotulo="1ª parcela" valor={resumo.primeiraPrestacao} destaque />
        <Linha rotulo="Última parcela" valor={resumo.ultimaPrestacao} />
        <Linha rotulo="Total de juros" valor={resumo.totalJuros} />
        <Linha rotulo="Total pago" valor={resumo.totalPago} />
      </dl>
      <AlertaRenda comprometimento={comprometimento} maiorPrestacao={maiorPrestacao} />
    </article>
  )
}

/** Manchete + um cartão por sistema. */
export function ResumoComparacao({ resultado }: { resultado: ResultadoSimulacao }) {
  const { economiaJurosSac, diferencaPrimeiraParcela } = resultado.comparacao

  return (
    <section aria-labelledby="titulo-comparacao" className="space-y-4">
      <div>
        <h2 id="titulo-comparacao" className="text-lg font-semibold text-slate-900">
          SAC × PRICE
        </h2>
        {economiaJurosSac > 0 ? (
          <p className="mt-1 text-slate-700">
            No SAC você paga <strong className="tabular-nums">{formatarBRL(economiaJurosSac)}</strong> a menos de
            juros, mas a primeira parcela é{' '}
            <strong className="tabular-nums">{formatarBRL(diferencaPrimeiraParcela)}</strong> maior.
          </p>
        ) : (
          <p className="mt-1 text-slate-700">Sem juros, os dois sistemas custam o mesmo no total.</p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <CartaoSistema sistema="SAC" dados={resultado.sac} />
        <CartaoSistema sistema="PRICE" dados={resultado.price} />
      </div>
    </section>
  )
}

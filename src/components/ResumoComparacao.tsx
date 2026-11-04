import {
  formatarBRL,
  formatarPercentual,
  type ResultadoSimulacao,
  type ResultadoSistema,
  type Sistema,
} from '../lib/financiamento'
import { AlertaRenda } from './AlertaRenda'

const DESCRICAO: Record<Sistema, string> = {
  SAC: 'Parcelas decrescentes',
  PRICE: 'Parcelas fixas',
}

function Linha({ rotulo, valor, destaque = false, dica }: { rotulo: string; valor: string; destaque?: boolean; dica?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-sm text-slate-600">
        {rotulo}
        {dica && <span className="block text-xs text-slate-500">{dica}</span>}
      </dt>
      <dd className={`text-right tabular-nums ${destaque ? 'text-xl font-semibold text-slate-900' : 'text-slate-900'}`}>
        {valor}
      </dd>
    </div>
  )
}

function CartaoSistema({ sistema, dados }: { sistema: Sistema; dados: ResultadoSistema }) {
  const { resumo, custos, comprometimento, parcelas } = dados
  const maiorParcela = Math.max(...parcelas.map((p) => p.total))
  const encargosPrimeira = custos.primeiraParcela - resumo.primeiraPrestacao

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="flex items-center gap-2">
        <span aria-hidden className={`size-3 rounded-full ${sistema === 'SAC' ? 'bg-sac' : 'bg-price'}`} />
        <h3 className="font-semibold text-slate-900">{sistema === 'SAC' ? 'SAC' : 'Tabela PRICE'}</h3>
        <span className="text-sm text-slate-500">· {DESCRICAO[sistema]}</span>
      </header>
      <dl className="space-y-1.5">
        <Linha
          rotulo="1ª parcela"
          valor={formatarBRL(custos.primeiraParcela)}
          destaque
          dica={encargosPrimeira > 0 ? `inclui ${formatarBRL(encargosPrimeira)} de seguros e taxa` : undefined}
        />
        <Linha rotulo="Última parcela" valor={formatarBRL(custos.ultimaParcela)} />
        <Linha rotulo="Total de juros" valor={formatarBRL(resumo.totalJuros)} />
        <Linha rotulo="Seguros e taxa" valor={formatarBRL(custos.totalSeguros + custos.totalTaxaAdministracao)} />
        <Linha rotulo="Total pago" valor={formatarBRL(custos.totalPago)} />
        <Linha rotulo="CET estimado" valor={`${formatarPercentual(custos.cetAnual)} ao ano`} />
      </dl>
      <AlertaRenda comprometimento={comprometimento} maiorPrestacao={maiorParcela} />
    </article>
  )
}

/** Manchete + um cartão por sistema. */
export function ResumoComparacao({ resultado }: { resultado: ResultadoSimulacao }) {
  const { economiaTotalSac, diferencaPrimeiraParcela } = resultado.comparacao

  return (
    <section aria-labelledby="titulo-comparacao" className="space-y-4">
      <div>
        <h2 id="titulo-comparacao" className="text-lg font-semibold text-slate-900">
          SAC × PRICE
        </h2>
        {economiaTotalSac > 0 ? (
          <p className="mt-1 text-slate-700">
            No SAC você paga <strong className="tabular-nums">{formatarBRL(economiaTotalSac)}</strong> a menos no
            total, mas a primeira parcela é{' '}
            <strong className="tabular-nums">{formatarBRL(diferencaPrimeiraParcela)}</strong> maior.
          </p>
        ) : (
          <p className="mt-1 text-slate-700">Sem juros, os dois sistemas custam praticamente o mesmo no total.</p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <CartaoSistema sistema="SAC" dados={resultado.sac} />
        <CartaoSistema sistema="PRICE" dados={resultado.price} />
      </div>
      {resultado.price.custos.cetAnual < resultado.sac.custos.cetAnual && economiaTotalSac > 0 && (
        <p className="text-xs text-slate-500">
          Por que o CET da PRICE é menor se ela custa mais? CET é uma taxa, não um total: o seguro DFI e a taxa são
          valores fixos e pesam menos, em proporção, sobre uma dívida que cai devagar.
        </p>
      )}
    </section>
  )
}

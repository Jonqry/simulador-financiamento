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
      <dt className="text-sm text-tinta-suave">
        {rotulo}
        {dica && <span className="estreito block text-xs text-tinta-suave">{dica}</span>}
      </dt>
      <dd className={`text-right tabular-nums ${destaque ? 'text-2xl font-bold' : 'font-medium'}`}>
        {destaque ? <span className="marca-texto">{valor}</span> : valor}
      </dd>
    </div>
  )
}

function CartaoSistema({ sistema, dados }: { sistema: Sistema; dados: ResultadoSistema }) {
  const { resumo, custos, comprometimento, parcelas } = dados
  const maiorParcela = Math.max(...parcelas.map((p) => p.total))
  const encargosPrimeira = custos.primeiraParcela - resumo.primeiraPrestacao

  return (
    <article className="flex flex-col gap-4 rounded-xs border-2 border-tinta bg-branco p-5">
      <header className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b-[1.5px] border-linha pb-3">
        <span aria-hidden className={`marcador self-center ${sistema === 'SAC' ? 'bg-sac' : 'bg-price'}`} />
        <h3 className="largo text-lg font-extrabold">{sistema === 'SAC' ? 'SAC' : 'Tabela PRICE'}</h3>
        <span className="estreito text-sm text-tinta-suave">· {DESCRICAO[sistema]}</span>
      </header>
      <dl className="space-y-2">
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
        <h2 id="titulo-comparacao" className="text-3xl font-extrabold">
          SAC × PRICE
        </h2>
        {economiaTotalSac > 0 ? (
          <p className="mt-2 max-w-3xl text-lg text-tinta-suave">
            No SAC você paga <strong className="font-bold text-tinta tabular-nums">{formatarBRL(economiaTotalSac)}</strong> a menos no
            total, mas a primeira parcela é{' '}
            <strong className="font-bold text-tinta tabular-nums">{formatarBRL(diferencaPrimeiraParcela)}</strong> maior.
          </p>
        ) : (
          <p className="mt-2 text-lg text-tinta-suave">Sem juros, os dois sistemas custam praticamente o mesmo no total.</p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <CartaoSistema sistema="SAC" dados={resultado.sac} />
        <CartaoSistema sistema="PRICE" dados={resultado.price} />
      </div>
      {resultado.price.custos.cetAnual < resultado.sac.custos.cetAnual && economiaTotalSac > 0 && (
        <p className="estreito text-sm text-tinta-suave">
          Por que o CET da PRICE é menor se ela custa mais? CET é uma taxa, não um total: o seguro DFI e a taxa são
          valores fixos e pesam menos, em proporção, sobre uma dívida que cai devagar.
        </p>
      )}
    </section>
  )
}

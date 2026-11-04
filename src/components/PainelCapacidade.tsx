import { formatarBRL, formatarPercentual, type Capacidade, type Sistema } from '../lib/financiamento'

interface PainelCapacidadeProps {
  capacidade: Record<Sistema, Capacidade>
  entrada: number
  cota: number
}

function Explicacao({ capacidade, entrada, cota }: { capacidade: Capacidade; entrada: number; cota: number }) {
  if (capacidade.limitadoPor === 'entrada') {
    return entrada === 0 ? (
      <>Sem entrada não dá para financiar: o banco cobre até {formatarPercentual(cota)} do imóvel.</>
    ) : (
      <>
        Quem limita é a <strong>entrada</strong>: o banco financia até {formatarPercentual(cota)} do
        imóvel. A renda permitiria mais.
      </>
    )
  }
  return (
    <>
      Quem limita é a <strong>renda</strong>: a maior parcela fica em {formatarBRL(capacidade.maiorParcela)}, dentro dos
      30% da renda.
    </>
  )
}

/**
 * "Até quanto posso mostrar para esse cliente?" Usa a renda, a entrada, a taxa,
 * o prazo e os encargos do formulário; ignora o valor do imóvel digitado.
 */
export function PainelCapacidade({ capacidade, entrada, cota }: PainelCapacidadeProps) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {(['SAC', 'PRICE'] as const).map((sistema) => (
          <div key={sistema} className="rounded-lg border border-slate-200 p-4">
            <p className="flex items-center gap-1.5 text-sm text-slate-600">
              <span aria-hidden className={`size-2 rounded-full ${sistema === 'SAC' ? 'bg-sac' : 'bg-price'}`} />
              No {sistema === 'SAC' ? 'SAC' : 'PRICE'}, imóvel de até
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">
              {formatarBRL(capacidade[sistema].valorMaximoImovel)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              financiando {formatarBRL(capacidade[sistema].financiamentoMaximo)} + entrada de {formatarBRL(entrada)}
            </p>
            <p className="mt-2 text-sm text-slate-700">
              <Explicacao capacidade={capacidade[sistema]} entrada={entrada} cota={cota} />
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        Considera a renda, a entrada, a taxa, o prazo e as condições do banco informadas no formulário. Cada banco tem sua política
        de crédito: é uma estimativa para orientar a busca, não uma aprovação.
      </p>
    </div>
  )
}

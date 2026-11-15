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
          <div key={sistema} className="rounded-xs border-[1.5px] border-linha bg-branco p-4">
            <p className="flex items-center gap-1.5 text-sm text-tinta-suave">
              <span aria-hidden className={`marcador ${sistema === 'SAC' ? 'bg-sac' : 'bg-price'}`} />
              No {sistema === 'SAC' ? 'SAC' : 'PRICE'}, imóvel de até
            </p>
            <p className="largo mt-1 text-3xl font-extrabold tabular-nums">
              {formatarBRL(capacidade[sistema].valorMaximoImovel)}
            </p>
            <p className="estreito mt-1 text-sm text-tinta-suave">
              financiando {formatarBRL(capacidade[sistema].financiamentoMaximo)} + entrada de {formatarBRL(entrada)}
            </p>
            <p className="mt-3 border-t border-dashed border-linha pt-3 text-sm">
              <Explicacao capacidade={capacidade[sistema]} entrada={entrada} cota={cota} />
            </p>
          </div>
        ))}
      </div>
      <p className="estreito text-sm text-tinta-suave">
        Considera a renda, a entrada, a taxa, o prazo e as condições do banco informadas no formulário. Cada banco tem sua política
        de crédito: é uma estimativa para orientar a busca, não uma aprovação.
      </p>
    </div>
  )
}

import { formatarBRL, formatarPercentual, type Capacidade, type Sistema } from '../lib/financiamento'

interface PainelCapacidadeProps {
  capacidade: Record<Sistema, Capacidade>
  /** Sistemas mostrados, o do destaque primeiro. */
  sistemas: Sistema[]
  entrada: number
  cota: number
  limiteRenda: number
}

function Explicacao({ capacidade, entrada, cota, limiteRenda }: { capacidade: Capacidade; entrada: number; cota: number; limiteRenda: number }) {
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
      Quem limita é a <strong>renda</strong>: a maior parcela fica em {formatarBRL(capacidade.maiorParcela)}, dentro dos{' '}
      {formatarPercentual(limiteRenda)} da renda.
    </>
  )
}

/**
 * "Até quanto posso mostrar para esse cliente?" Usa a renda, a entrada, a taxa,
 * o prazo e os encargos do formulário; ignora o valor do imóvel digitado.
 * Usa a taxa da simulação atual (sem trocar de faixa): para o máximo com as
 * faixas do MCMV, o modo "Quanto posso comprar".
 */
export function PainelCapacidade({ capacidade, sistemas, entrada, cota, limiteRenda }: PainelCapacidadeProps) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {sistemas.map((sistema) => (
          <div key={sistema} className="rounded-xs border-[1.5px] border-linha bg-branco p-4">
            <p className="flex items-center gap-1.5 text-sm text-tinta-suave">
              <span aria-hidden className={`marcador ${sistema === 'SAC' ? 'bg-sac' : 'bg-price'}`} />
              {sistema === 'SAC' ? 'No SAC' : 'Na PRICE'}, imóvel de até
            </p>
            <p className="largo mt-1 text-3xl font-extrabold tabular-nums">
              {formatarBRL(capacidade[sistema].valorMaximoImovel)}
            </p>
            <p className="estreito mt-1 text-sm text-tinta-suave">
              financiando {formatarBRL(capacidade[sistema].financiamentoMaximo)} + entrada de {formatarBRL(entrada)}
            </p>
            <p className="mt-3 border-t border-dashed border-linha pt-3 text-sm">
              <Explicacao capacidade={capacidade[sistema]} entrada={entrada} cota={cota} limiteRenda={limiteRenda} />
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

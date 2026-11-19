import { formatarBRL, type ParcelaSimulada, type Sistema } from '../lib/financiamento'

interface TabelaAmortizacaoProps {
  parcelas: ParcelaSimulada[]
  sistema: Sistema
}

/**
 * Tabela completa, mês a mês. 420 linhas no máximo: renderizar tudo dentro de
 * um contêiner com rolagem é leve o bastante, então não usei virtualização
 * (react-window etc.), que só compensaria com milhares de linhas.
 */
export function TabelaAmortizacao({ parcelas, sistema }: TabelaAmortizacaoProps) {
  return (
    <div className="max-h-[28rem] overflow-auto folha" tabIndex={0}>
      <table className="w-full text-right text-sm whitespace-nowrap tabular-nums">
        <caption className="sr-only">Tabela de amortização no sistema {sistema}</caption>
        <thead className="estreito sticky top-0 bg-piso text-sm text-tinta-suave shadow-[inset_0_-2px_0_var(--color-tinta)]">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-semibold">
              Mês
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              Parcela
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              Juros
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              Amortização
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              Seguros e taxa
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              Saldo devedor
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-piso">
          {parcelas.map((p) => (
            <tr key={p.numero} className="hover:bg-realce">
              <th scope="row" className="px-3 py-1.5 text-left font-normal text-tinta-suave">
                {p.numero}
              </th>
              <td className="px-3 py-1.5 font-semibold">{formatarBRL(p.total)}</td>
              <td className="px-3 py-1.5">{formatarBRL(p.juros)}</td>
              <td className="px-3 py-1.5">{formatarBRL(p.amortizacao)}</td>
              <td className="px-3 py-1.5">{formatarBRL(p.mip + p.dfi + p.taxaAdministracao)}</td>
              <td className="px-3 py-1.5">{formatarBRL(p.saldoDevedor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

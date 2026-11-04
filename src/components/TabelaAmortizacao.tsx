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
    <div className="max-h-[28rem] overflow-auto rounded-lg border border-slate-200" tabIndex={0}>
      <table className="w-full text-right text-sm whitespace-nowrap tabular-nums">
        <caption className="sr-only">Tabela de amortização no sistema {sistema}</caption>
        <thead className="sticky top-0 bg-slate-50 text-xs text-slate-600 uppercase">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-medium">
              Mês
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Parcela
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Juros
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Amortização
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Seguros e taxa
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Saldo devedor
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-800">
          {parcelas.map((p) => (
            <tr key={p.numero} className="hover:bg-slate-50">
              <th scope="row" className="px-3 py-1.5 text-left font-normal text-slate-500">
                {p.numero}
              </th>
              <td className="px-3 py-1.5 font-medium">{formatarBRL(p.total)}</td>
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

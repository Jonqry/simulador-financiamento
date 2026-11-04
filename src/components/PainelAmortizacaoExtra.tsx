import { formatarBRL, type ComparacaoExtra, type ResumoExtra, type Sistema } from '../lib/financiamento'

function formatarPrazo(meses: number): string {
  const anos = Math.floor(meses / 12)
  const resto = meses % 12
  const partes = []
  if (anos > 0) partes.push(`${anos} ${anos === 1 ? 'ano' : 'anos'}`)
  if (resto > 0) partes.push(`${resto} ${resto === 1 ? 'mês' : 'meses'}`)
  return partes.join(' e ') || '0 meses'
}

function ConteudoModo({ dados, prazoOriginal }: { dados: ResumoExtra; prazoOriginal: number }) {
  const mesesAMenos = prazoOriginal - dados.prazoFinal
  return (
    <>
      <p className="text-base font-semibold text-slate-900 tabular-nums">{formatarBRL(dados.economia)}</p>
      <p className="text-xs text-slate-500">de economia</p>
      <dl className="mt-2 space-y-0.5 text-xs text-slate-600">
        <div>
          <dt className="inline">Termina em: </dt>
          <dd className="inline text-slate-800">
            {formatarPrazo(dados.prazoFinal)}
            {mesesAMenos > 0 && ` (${mesesAMenos} meses antes)`}
          </dd>
        </div>
        <div>
          <dt className="inline">Parcela depois do 1º extra: </dt>
          <dd className="inline text-slate-800 tabular-nums">
            {dados.parcelaApos > 0 ? formatarBRL(dados.parcelaApos) : 'quitado'}
          </dd>
        </div>
      </dl>
    </>
  )
}

interface PainelAmortizacaoExtraProps {
  comparacao: ComparacaoExtra
  prazoOriginal: number
}

/**
 * Reduzir prazo × reduzir parcela, nos dois sistemas. A tabela 2×2 deixa a
 * resposta visível de cara: reduzir o prazo quase sempre economiza mais.
 */
export function PainelAmortizacaoExtra({ comparacao, prazoOriginal }: PainelAmortizacaoExtraProps) {
  const sistemas: Sistema[] = ['SAC', 'PRICE']
  const prazoVenceSempre = sistemas.every((s) => comparacao[s].prazo.economia >= comparacao[s].parcela.economia)

  return (
    <div className="space-y-3">
      {/* Celular: um cartão por sistema, sem rolagem lateral. */}
      <div className="space-y-3 sm:hidden">
        {sistemas.map((sistema) => (
          <div key={sistema} className="rounded-lg border border-slate-200 p-3">
            <p className="mb-2 flex items-center gap-1.5 font-medium text-slate-900">
              <span aria-hidden className={`size-2 rounded-full ${sistema === 'SAC' ? 'bg-sac' : 'bg-price'}`} />
              {sistema}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(['prazo', 'parcela'] as const).map((modo) => (
                <div key={modo}>
                  <p className="mb-1 text-xs font-medium text-slate-600 uppercase">
                    {modo === 'prazo' ? 'Reduzir prazo' : 'Reduzir parcela'}
                  </p>
                  <ConteudoModo dados={comparacao[sistema][modo]} prazoOriginal={prazoOriginal} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Telas maiores: tabela 2×2. */}
      <div className="hidden overflow-x-auto rounded-lg border border-slate-200 sm:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Economia com amortização extra, por sistema e modo</caption>
          <thead className="bg-slate-50 text-xs text-slate-600 uppercase">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">
                Sistema
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Reduzir prazo
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Reduzir parcela
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sistemas.map((sistema) => (
              <tr key={sistema}>
                <th scope="row" className="px-3 py-3 align-top font-medium text-slate-900">
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden className={`size-2 rounded-full ${sistema === 'SAC' ? 'bg-sac' : 'bg-price'}`} />
                    {sistema}
                  </span>
                </th>
                <td className="px-3 py-3 align-top">
                  <ConteudoModo dados={comparacao[sistema].prazo} prazoOriginal={prazoOriginal} />
                </td>
                <td className="px-3 py-3 align-top">
                  <ConteudoModo dados={comparacao[sistema].parcela} prazoOriginal={prazoOriginal} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-slate-700">
        {prazoVenceSempre
          ? 'Reduzir o prazo economiza mais: o dinheiro extra deixa de render juros por mais tempo. Reduzir a parcela faz sentido quando o orçamento mensal está apertado.'
          : 'Neste cenário, reduzir a parcela economiza tanto quanto reduzir o prazo; escolha pelo que alivia mais o seu orçamento.'}
      </p>
      <p className="text-xs text-slate-500">
        Economia = quanto se deixa de pagar em juros, seguros e taxa em relação ao contrato sem extra.
      </p>
    </div>
  )
}

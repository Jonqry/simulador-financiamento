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
      <p className="largo text-lg font-extrabold tabular-nums">{formatarBRL(dados.economia)}</p>
      <p className="estreito text-sm text-tinta-suave">de economia</p>
      <dl className="estreito mt-2 space-y-0.5 text-sm text-tinta-suave">
        <div>
          <dt className="inline">Termina em: </dt>
          <dd className="inline text-tinta">
            {formatarPrazo(dados.prazoFinal)}
            {mesesAMenos > 0 && ` (${mesesAMenos} meses antes)`}
          </dd>
        </div>
        <div>
          <dt className="inline">Parcela depois do 1º extra: </dt>
          <dd className="inline text-tinta tabular-nums">
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
  /** Sistemas mostrados, o do destaque primeiro. */
  sistemas: Sistema[]
}

/**
 * Reduzir prazo × reduzir parcela, no sistema em destaque (e no outro, se comparando). A tabela 2×2 deixa a
 * resposta visível de cara: reduzir o prazo quase sempre economiza mais.
 */
export function PainelAmortizacaoExtra({ comparacao, prazoOriginal, sistemas }: PainelAmortizacaoExtraProps) {
  const prazoVenceSempre = sistemas.every((s) => comparacao[s].prazo.economia >= comparacao[s].parcela.economia)

  return (
    <div className="space-y-3">
      {/* Celular: um cartão por sistema, sem rolagem lateral. */}
      <div className="space-y-3 sm:hidden">
        {sistemas.map((sistema) => (
          <div key={sistema} className="rounded-xs border-[1.5px] border-linha bg-branco p-3">
            <p className="mb-2 flex items-center gap-1.5 font-bold">
              <span aria-hidden className={`marcador ${sistema === 'SAC' ? 'bg-sac' : 'bg-price'}`} />
              {sistema}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(['prazo', 'parcela'] as const).map((modo) => (
                <div key={modo}>
                  <p className="estreito mb-1 text-sm font-semibold text-tinta-suave">
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
      <div className="hidden overflow-x-auto rounded-xs border-[1.5px] border-linha bg-branco sm:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Economia com amortização extra, por sistema e modo</caption>
          <thead className="estreito border-b-2 border-tinta bg-piso text-sm text-tinta-suave">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold">
                Sistema
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                Reduzir prazo
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                Reduzir parcela
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-piso">
            {sistemas.map((sistema) => (
              <tr key={sistema}>
                <th scope="row" className="px-3 py-3 align-top font-bold">
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden className={`marcador ${sistema === 'SAC' ? 'bg-sac' : 'bg-price'}`} />
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
      <p className="text-sm">
        {prazoVenceSempre
          ? 'Reduzir o prazo economiza mais: o dinheiro extra deixa de render juros por mais tempo. Reduzir a parcela faz sentido quando o orçamento mensal está apertado.'
          : 'Neste cenário, reduzir a parcela economiza tanto quanto reduzir o prazo; escolha pelo que alivia mais o seu orçamento.'}
      </p>
      <p className="estreito text-sm text-tinta-suave">
        Economia = quanto se deixa de pagar em juros, seguros e taxa em relação ao contrato sem extra.
      </p>
    </div>
  )
}

import { useId, useState } from 'react'
import { formatarBRL, formatarPercentual, reaisParaCentavos } from '../lib/financiamento'
import { formatarNumeroBR, parseNumeroBR } from '../lib/formulario/numero'
import { ATUALIZACAO_TAXAS, sugerirTaxa, type Regiao } from '../lib/taxasReferencia'

interface SugestaoTaxaProps {
  /** Texto do campo de renda, como digitado. */
  rendaTexto: string
  /** Texto do campo de valor do imóvel, para avisar sobre o teto da faixa. */
  valorImovelTexto: string
  usarTaxa: (taxaPercentual: string) => void
}

/**
 * Taxa de referência pela renda (MCMV ou mercado). É uma SUGESTÃO: a taxa
 * real depende do banco e da análise de crédito, então o usuário decide se
 * aplica. Região e cotista ficam aqui, fora da simulação, porque só servem
 * para escolher a linha da tabela.
 */
export function SugestaoTaxa({ rendaTexto, valorImovelTexto, usarTaxa }: SugestaoTaxaProps) {
  const id = useId()
  const [regiao, setRegiao] = useState<Regiao>('NNE')
  const [cotista, setCotista] = useState(false)

  const rendaReais = parseNumeroBR(rendaTexto)
  if (rendaReais === null || rendaReais <= 0) return null
  const sugestao = sugerirTaxa(reaisParaCentavos(rendaReais), regiao, cotista)
  const valorImovelReais = parseNumeroBR(valorImovelTexto)
  const acimaDoTeto =
    sugestao.tipo === 'mcmv' && valorImovelReais !== null && reaisParaCentavos(valorImovelReais) > sugestao.tetoImovel

  const seletor = 'rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800'

  return (
    <section className="rounded-lg border border-sac/30 bg-sac/5 p-3 text-sm" aria-labelledby={`${id}-titulo`}>
      <p id={`${id}-titulo`} className="font-medium text-slate-900">
        Taxa de referência para essa renda
      </p>

      {sugestao.tipo === 'mcmv' ? (
        <>
          <div className="mt-2 flex flex-wrap gap-2">
            <label className="sr-only" htmlFor={`${id}-regiao`}>
              Região
            </label>
            <select id={`${id}-regiao`} value={regiao} onChange={(e) => setRegiao(e.target.value as Regiao)} className={seletor}>
              <option value="NNE">Norte/Nordeste</option>
              <option value="SSECO">Sul/Sudeste/Centro-Oeste</option>
            </select>
            <label className="sr-only" htmlFor={`${id}-cotista`}>
              Cotista do FGTS
            </label>
            <select
              id={`${id}-cotista`}
              value={cotista ? 'sim' : 'nao'}
              onChange={(e) => setCotista(e.target.value === 'sim')}
              className={seletor}
            >
              <option value="nao">Não cotista do FGTS</option>
              <option value="sim">Cotista do FGTS (3+ anos)</option>
            </select>
          </div>
          <p className="mt-2 text-slate-700">
            Minha Casa, Minha Vida · <strong>Faixa {sugestao.faixa}</strong>:{' '}
            <strong className="tabular-nums">{formatarPercentual(sugestao.taxaAnual)} ao ano</strong>, imóvel de até{' '}
            {formatarBRL(sugestao.tetoImovel)}
            {sugestao.faixa <= 2 && ' (varia por cidade)'}.
          </p>
          {acimaDoTeto && (
            <p className="mt-1 text-xs font-medium text-slate-800">
              O imóvel informado passa do teto da faixa: fora do MCMV, valem as taxas de mercado.
            </p>
          )}
          <button
            type="button"
            // formatarNumeroBR evita o ruído de ponto flutuante: 0.0766 × 100 = 7.659999...
            onClick={() => usarTaxa(formatarNumeroBR(sugestao.taxaAnual * 100))}
            className="mt-2 rounded-md bg-sac px-3 py-1 text-xs font-semibold text-white hover:bg-sac/90"
          >
            Usar {formatarPercentual(sugestao.taxaAnual)}
          </button>
        </>
      ) : (
        <p className="mt-1 text-slate-700">
          Renda acima do Minha Casa, Minha Vida. Taxas de mercado de{' '}
          <strong className="tabular-nums">{formatarPercentual(sugestao.minima)}</strong> a{' '}
          <strong className="tabular-nums">{formatarPercentual(sugestao.maxima)}</strong> ao ano + TR, conforme o banco.
        </p>
      )}

      <p className="mt-2 text-xs text-slate-500">
        Referência de {ATUALIZACAO_TAXAS.data}. A taxa final depende do banco e da análise de crédito.
      </p>
    </section>
  )
}

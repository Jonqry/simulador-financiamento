import { useId, useState } from 'react'
import { formatarBRL, formatarPercentual, reaisParaCentavos } from '../lib/financiamento'
import { formatarNumeroBR, parseNumeroBR } from '../lib/formulario/numero'
import { ATUALIZACAO_TAXAS, sugerirTaxa, type Regiao } from '../lib/taxasReferencia'

interface SugestaoTaxaProps {
  /** Texto do campo de renda, como digitado. */
  rendaTexto: string
  /** Texto do campo de taxa, para saber se a sugestão já está em uso. */
  taxaTexto: string
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
export function SugestaoTaxa({ rendaTexto, taxaTexto, valorImovelTexto, usarTaxa }: SugestaoTaxaProps) {
  const id = useId()
  const [regiao, setRegiao] = useState<Regiao>('NNE')
  const [cotista, setCotista] = useState(false)

  const rendaReais = parseNumeroBR(rendaTexto)
  if (rendaReais === null || rendaReais <= 0) return null
  const sugestao = sugerirTaxa(reaisParaCentavos(rendaReais), regiao, cotista)
  const valorImovelReais = parseNumeroBR(valorImovelTexto)
  const acimaDoTeto =
    sugestao.tipo === 'mcmv' && valorImovelReais !== null && reaisParaCentavos(valorImovelReais) > sugestao.tetoImovel

  const taxaAtual = parseNumeroBR(taxaTexto)
  const emUso = sugestao.tipo === 'mcmv' && taxaAtual !== null && Math.abs(taxaAtual - sugestao.taxaAnual * 100) < 0.00005

  const seletor = 'rounded-xs border-[1.5px] border-linha bg-branco px-2 py-1 text-sm text-tinta'

  return (
    <section className="rounded-xs border-[1.5px] border-dashed border-tinta-suave bg-papel p-3 text-sm" aria-labelledby={`${id}-titulo`}>
      <p id={`${id}-titulo`} className="font-semibold">
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
          <p className="mt-2">
            Minha Casa, Minha Vida · <strong>Faixa {sugestao.faixa}</strong>:{' '}
            <strong className="tabular-nums">{formatarPercentual(sugestao.taxaAnual)} ao ano</strong>, imóvel de até{' '}
            {formatarBRL(sugestao.tetoImovel)}
            {sugestao.faixa <= 2 && ' (varia por cidade)'}.
          </p>
          {acimaDoTeto && (
            <p className="estreito mt-1 text-sm font-semibold">
              O imóvel informado passa do teto da faixa: fora do MCMV, valem as taxas de mercado.
            </p>
          )}
          {emUso ? (
            <p className="estreito mt-2 text-sm font-semibold">
              <span aria-hidden>✓</span> Você já está usando esta taxa.
            </p>
          ) : (
            <button
              type="button"
              // formatarNumeroBR evita o ruído de ponto flutuante: 0.0766 × 100 = 7.659999...
              onClick={() => usarTaxa(formatarNumeroBR(sugestao.taxaAnual * 100))}
              className="botao botao-principal mt-2 px-3 py-1 text-sm"
            >
              Usar {formatarPercentual(sugestao.taxaAnual)}
            </button>
          )}
        </>
      ) : (
        <p className="mt-1">
          Renda acima do Minha Casa, Minha Vida. Taxas de mercado de{' '}
          <strong className="tabular-nums">{formatarPercentual(sugestao.minima)}</strong> a{' '}
          <strong className="tabular-nums">{formatarPercentual(sugestao.maxima)}</strong> ao ano + TR, conforme o banco.
        </p>
      )}

      <p className="estreito mt-2 text-xs text-tinta-suave">
        Referência de {ATUALIZACAO_TAXAS.data}. A taxa final depende do banco e da análise de crédito.
      </p>
    </section>
  )
}

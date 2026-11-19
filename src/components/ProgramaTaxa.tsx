import { useId } from 'react'
import { formatarBRL } from '../lib/financiamento'
import type { ErrosFormulario, OpcoesFormulario } from '../lib/formulario/valores'
import { ATUALIZACAO_TAXAS, descreverPrograma, TETO_IMOVEL_MCMV, type Enquadramento, type Regiao } from '../lib/taxasReferencia'
import { Campo } from './Campo'

interface ProgramaTaxaProps {
  enquadramento: Enquadramento | null
  opcoes: OpcoesFormulario
  /** Texto exibido no campo: a taxa automática ou a digitada. */
  taxaTexto: string
  erros: ErrosFormulario
  alterarTaxa: (texto: string) => void
  formatarTaxa: () => void
  /** Campo do teto das Faixas 1 e 2 no município (props prontas para o <Campo>). */
  campoTeto: { valor: string; aoAlterar: (texto: string) => void; aoSair: () => void; erro?: string }
  usarTaxaAutomatica: () => void
  alterarOpcao: <K extends keyof OpcoesFormulario>(opcao: K, valor: OpcoesFormulario[K]) => void
}

function Explicacao({ enquadramento }: { enquadramento: Enquadramento | null }) {
  if (!enquadramento) return <>Informe a renda para ver a faixa e a taxa.</>
  if (enquadramento.programa === 'SBPE') {
    if (enquadramento.motivo === 'imovelProprio') {
      return <>Quem já tem imóvel no nome não pode usar o Minha Casa, Minha Vida. Vale o SBPE, e a aprovação depende da renda.</>
    }
    return enquadramento.motivo === 'renda' ? (
      <>Renda acima de R$ 13 mil: fora do Minha Casa, Minha Vida. Taxa de mercado + TR, conforme o banco.</>
    ) : (
      <>Imóvel acima do teto da Faixa 4 ({formatarBRL(TETO_IMOVEL_MCMV[4])}): fora do Minha Casa, Minha Vida.</>
    )
  }
  if (enquadramento.faixa !== enquadramento.faixaPelaRenda) {
    return (
      <>
        Pela renda seria Faixa {enquadramento.faixaPelaRenda}, mas o imóvel passa do teto dela (
        {formatarBRL(enquadramento.tetoFaixaPelaRenda)}): entra na Faixa {enquadramento.faixa}, com a taxa dela.
      </>
    )
  }
  return (
    <>
      Imóvel de até {formatarBRL(enquadramento.tetoImovel)}
      {enquadramento.faixa <= 2 && ' (teto da cidade)'}.
    </>
  )
}

/**
 * Programa (MCMV ou SBPE), faixa e taxa. A taxa sai sozinha do enquadramento
 * pela renda e pelo valor do imóvel; digitar no campo passa a usar a taxa do
 * banco, e um botão volta para a automática.
 */
export function ProgramaTaxa({
  enquadramento,
  opcoes,
  taxaTexto,
  erros,
  alterarTaxa,
  formatarTaxa,
  usarTaxaAutomatica,
  alterarOpcao,
  campoTeto,
}: ProgramaTaxaProps) {
  const id = useId()
  const seletor = 'rounded-xs border-[1.5px] border-linha bg-branco px-2 py-1 text-sm text-tinta'
  // Região e FGTS só mudam a taxa quando o cliente cabe no MCMV pela renda (e não tem imóvel).
  const rendaNoMcmv =
    enquadramento !== null && !(enquadramento.programa === 'SBPE' && enquadramento.motivo !== 'imovel')
  // O teto da cidade só importa para renda de Faixa 1 ou 2 (ou se o campo está com erro).
  const mostrarTeto =
    Boolean(campoTeto.erro) || (enquadramento?.programa === 'MCMV' && enquadramento.faixaPelaRenda <= 2)

  return (
    <section className="space-y-3 rounded-xs border-[1.5px] border-dashed border-tinta-suave bg-papel p-3 text-sm" aria-labelledby={`${id}-titulo`}>
      <div>
        <p id={`${id}-titulo`} className="font-semibold">
          {enquadramento ? descreverPrograma(enquadramento) : 'Programa e taxa'}
        </p>
        <p className="estreito mt-0.5 text-sm text-tinta-suave">
          <Explicacao enquadramento={enquadramento} />
        </p>
      </div>

      <div>
        <label className="sr-only" htmlFor={`${id}-imovel`}>
          Já tem imóvel no nome?
        </label>
        <select
          id={`${id}-imovel`}
          value={opcoes.temImovel ? 'sim' : 'nao'}
          onChange={(e) => alterarOpcao('temImovel', e.target.value === 'sim')}
          className={seletor}
        >
          <option value="nao">Não tem imóvel no nome</option>
          <option value="sim">Já tem imóvel no nome</option>
        </select>
      </div>

      {rendaNoMcmv && (
        <div className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor={`${id}-regiao`}>
            Região
          </label>
          <select
            id={`${id}-regiao`}
            value={opcoes.regiao}
            onChange={(e) => alterarOpcao('regiao', e.target.value as Regiao)}
            className={seletor}
          >
            <option value="NNE">Norte/Nordeste</option>
            <option value="SSECO">Sul/Sudeste/Centro-Oeste</option>
          </select>
          <label className="sr-only" htmlFor={`${id}-cotista`}>
            Cotista do FGTS
          </label>
          <select
            id={`${id}-cotista`}
            value={opcoes.cotista ? 'sim' : 'nao'}
            onChange={(e) => alterarOpcao('cotista', e.target.value === 'sim')}
            className={seletor}
          >
            <option value="nao">Não cotista do FGTS</option>
            <option value="sim">Cotista do FGTS (3+ anos)</option>
          </select>
        </div>
      )}

      {mostrarTeto && (
        <Campo
          rotulo="Teto das Faixas 1 e 2 na cidade"
          prefixo="R$"
          {...campoTeto}
          dica="Varia por município, até R$ 275 mil. Acima dele, o imóvel entra na Faixa 3."
        />
      )}

      <Campo
        rotulo="Taxa de juros"
        valor={taxaTexto}
        aoAlterar={alterarTaxa}
        aoSair={formatarTaxa}
        erro={erros.taxaAnual}
        sufixo={
          <select
            aria-label="Tipo de taxa"
            value={!opcoes.taxaManual || opcoes.taxaNominal ? 'nominal' : 'efetiva'}
            onChange={(e) => alterarOpcao('taxaNominal', e.target.value === 'nominal')}
            disabled={!opcoes.taxaManual}
            title={opcoes.taxaManual ? undefined : 'As taxas do programa são nominais, como a Caixa divulga'}
            className="bg-transparent text-sm text-tinta-suave"
          >
            <option value="efetiva">% ao ano, efetiva</option>
            <option value="nominal">% ao ano, nominal</option>
          </select>
        }
        dica={
          opcoes.taxaManual ? (
            <>
              Taxa digitada (a da proposta do banco).{' '}
              <button type="button" onClick={usarTaxaAutomatica} className="link-texto">
                Voltar para a taxa automática
              </button>
            </>
          ) : (
            'Automática pela faixa (nominal, como a Caixa divulga). Para usar a taxa do banco, é só digitar.'
          )
        }
      />

      <p className="estreito text-xs text-tinta-suave">
        Referência de {ATUALIZACAO_TAXAS.data}. A taxa final depende do banco e da análise de crédito.
      </p>
    </section>
  )
}

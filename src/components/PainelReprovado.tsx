import { formatarBRL, formatarPercentual, type ResultadoSimulacao, type Sistema } from '../lib/financiamento'
import type { Saidas } from '../lib/formulario/montar'
import { descreverPrograma, type Enquadramento } from '../lib/taxasReferencia'

interface PainelReprovadoProps {
  resultado: ResultadoSimulacao
  enquadramento: Enquadramento
  sistema: Sistema
  outroSistema: Sistema
  saidas: Saidas
  /** Modo "quanto posso comprar": mostra o imóvel máximo em vez deste. */
  simularPelaRenda: () => void
  escolherSistema: (sistema: Sistema) => void
}

const nome = (s: Sistema) => (s === 'SAC' ? 'SAC' : 'PRICE')
const doSistema = (r: ResultadoSimulacao, s: Sistema) => (s === 'SAC' ? r.sac : r.price)

/**
 * Simulação que não passa pela renda. Em vez de um aviso pequeno ao lado da
 * parcela (que o cliente ignora e sai achando que consegue comprar), o
 * resultado inteiro vira este painel: diz que não passa e o que resolveria.
 */
export function PainelReprovado({
  resultado,
  enquadramento,
  sistema,
  outroSistema,
  saidas,
  simularPelaRenda,
  escolherSistema,
}: PainelReprovadoProps) {
  const principal = doSistema(resultado, sistema)
  const outro = doSistema(resultado, outroSistema)
  const maiorParcela = Math.max(...principal.parcelas.map((p) => p.total))
  const falta = saidas.entradaNecessaria - resultado.entrada

  return (
    <section aria-labelledby="titulo-reprovado" className="space-y-4 border-l-8 border-critico bg-critico/8 p-5">
      <div>
        <p className="estreito text-sm font-semibold text-tinta-suave">{descreverPrograma(enquadramento)}</p>
        <h2 id="titulo-reprovado" className="flex items-center gap-3 text-3xl font-extrabold">
          <span aria-hidden className="flex size-8 shrink-0 items-center justify-center bg-critico text-xl text-branco">
            ✕
          </span>
          Não aprovado pela renda
        </h2>
        <p className="mt-2 max-w-3xl text-lg">
          {sistema === 'SAC' ? 'No SAC' : 'Na PRICE'}, a maior parcela seria de{' '}
          <strong className="tabular-nums">{formatarBRL(maiorParcela)}</strong>, ou{' '}
          <strong className="tabular-nums">{formatarPercentual(principal.comprometimento.percentual)}</strong> da renda. O limite
          é {formatarPercentual(resultado.limiteRenda)}: o banco não aprova esse financiamento.
        </p>
      </div>

      <div>
        <h3 className="text-lg font-extrabold">O que resolve</h3>
        <ul className="mt-2 space-y-3">
          <li className="rounded-xs border-[1.5px] border-linha bg-branco p-3">
            <p>
              <strong>Um imóvel de até {formatarBRL(saidas.imovelMaximo)}</strong> com a mesma renda e entrada.
            </p>
            <button type="button" onClick={simularPelaRenda} className="botao botao-principal mt-2 px-3 py-1 text-sm">
              Simular o imóvel máximo
            </button>
          </li>
          <li className="rounded-xs border-[1.5px] border-linha bg-branco p-3">
            <strong>Entrada de {formatarBRL(saidas.entradaNecessaria)}</strong> para este imóvel (faltam {formatarBRL(falta)},
            somando recursos próprios, FGTS e subsídio).
          </li>
          <li className="rounded-xs border-[1.5px] border-linha bg-branco p-3">
            <strong>Renda de {formatarBRL(saidas.rendaNecessaria)}</strong>, somando quem vai compor o financiamento.
          </li>
          {saidas.outroSistemaCabe && (
            <li className="rounded-xs border-[1.5px] border-linha bg-branco p-3">
              <p>
                <strong>
                  {outroSistema === 'SAC' ? 'No SAC' : 'Na PRICE'} a parcela cabe:
                </strong>{' '}
                1ª parcela de {formatarBRL(outro.custos.primeiraParcela)} ({formatarPercentual(outro.comprometimento.percentual)} da
                renda).
              </p>
              <button type="button" onClick={() => escolherSistema(outroSistema)} className="botao botao-principal mt-2 px-3 py-1 text-sm">
                Usar {nome(outroSistema)}
              </button>
            </li>
          )}
        </ul>
      </div>
      <p className="estreito text-sm text-tinta-suave">
        Cada banco tem sua política de crédito; o limite está em "Condições do banco".
      </p>
    </section>
  )
}

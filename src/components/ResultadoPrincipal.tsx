import {
  formatarBRL,
  formatarPercentual,
  type ResultadoSimulacao,
  type ResultadoSistema,
  type Sistema,
} from '../lib/financiamento'
import type { ImovelPelaRenda } from '../lib/imovelPelaRenda'
import { descreverPrograma, type Enquadramento } from '../lib/taxasReferencia'
import { AlertaRenda } from './AlertaRenda'

const DESCRICAO: Record<Sistema, string> = {
  SAC: 'Parcelas decrescentes',
  PRICE: 'Parcelas fixas',
}

const dados = (resultado: ResultadoSimulacao, sistema: Sistema) => (sistema === 'SAC' ? resultado.sac : resultado.price)

function Linha({ rotulo, valor, destaque = false, dica }: { rotulo: string; valor: string; destaque?: boolean; dica?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-sm text-tinta-suave">
        {rotulo}
        {dica && <span className="estreito block text-xs text-tinta-suave">{dica}</span>}
      </dt>
      <dd className={`text-right tabular-nums ${destaque ? 'text-2xl font-bold' : 'font-medium'}`}>
        {destaque ? <span className="marca-texto">{valor}</span> : valor}
      </dd>
    </div>
  )
}

export function CartaoSistema({ sistema, dados }: { sistema: Sistema; dados: ResultadoSistema }) {
  const { resumo, custos, comprometimento, parcelas } = dados
  const maiorParcela = Math.max(...parcelas.map((p) => p.total))
  const encargosPrimeira = custos.primeiraParcela - resumo.primeiraPrestacao

  return (
    <article className="flex flex-col gap-4 rounded-xs border-2 border-tinta bg-branco p-5">
      <header className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b-[1.5px] border-linha pb-3">
        <span aria-hidden className={`marcador self-center ${sistema === 'SAC' ? 'bg-sac' : 'bg-price'}`} />
        <h3 className="largo text-lg font-extrabold">{sistema === 'SAC' ? 'SAC' : 'Tabela PRICE'}</h3>
        <span className="estreito text-sm text-tinta-suave">· {DESCRICAO[sistema]}</span>
      </header>
      <dl className="space-y-2">
        <Linha
          rotulo="1ª parcela"
          valor={formatarBRL(custos.primeiraParcela)}
          destaque
          dica={encargosPrimeira > 0 ? `inclui ${formatarBRL(encargosPrimeira)} de seguros e taxa` : undefined}
        />
        <Linha rotulo="Última parcela" valor={formatarBRL(custos.ultimaParcela)} />
        <Linha rotulo="Total de juros" valor={formatarBRL(resumo.totalJuros)} />
        <Linha rotulo="Seguros e taxa" valor={formatarBRL(custos.totalSeguros + custos.totalTaxaAdministracao)} />
        <Linha rotulo="Total pago" valor={formatarBRL(custos.totalPago)} />
        <Linha rotulo="CET estimado" valor={`${formatarPercentual(custos.cetAnual)} ao ano`} />
      </dl>
      <AlertaRenda comprometimento={comprometimento} maiorPrestacao={maiorParcela} />
    </article>
  )
}

const EXPLICACAO_LIMITE: Record<ImovelPelaRenda['limitadoPor'], string> = {
  renda: 'Quem limita é a renda: acima disso a parcela passa do limite.',
  entrada: 'Quem limita é a entrada: o banco financia só parte do imóvel (cota). A renda permitiria mais.',
  teto: 'Quem limita é o teto da faixa do Minha Casa, Minha Vida. Acima dele, a próxima faixa (com taxa maior) não alcança.',
}

interface ResultadoPrincipalProps {
  resultado: ResultadoSimulacao
  enquadramento: Enquadramento
  sistema: Sistema
  outroSistema: Sistema
  comparar: boolean
  valorImovel: number
  imovelPelaRenda?: ImovelPelaRenda
  escolherSistema: (sistema: Sistema) => void
  alternarComparar: () => void
}

/**
 * O resultado do sistema em destaque (PRICE no MCMV, SAC no SBPE) e, se o
 * corretor pedir, o outro sistema ao lado com a comparação.
 */
export function ResultadoPrincipal({
  resultado,
  enquadramento,
  sistema,
  outroSistema,
  comparar,
  valorImovel,
  imovelPelaRenda,
  escolherSistema,
  alternarComparar,
}: ResultadoPrincipalProps) {
  const { economiaTotalSac, diferencaPrimeiraParcela } = resultado.comparacao
  const nome = (s: Sistema) => (s === 'SAC' ? 'SAC' : 'PRICE')

  return (
    <section aria-labelledby="titulo-resultado" className="space-y-4">
      <div>
        <p className="estreito text-sm font-semibold text-tinta-suave">{descreverPrograma(enquadramento)}</p>
        <h2 id="titulo-resultado" className="text-3xl font-extrabold">
          {imovelPelaRenda ? `Imóvel de até ${formatarBRL(valorImovel)}` : `Financiamento ${sistema === 'SAC' ? 'no SAC' : 'na PRICE'}`}
        </h2>
        {imovelPelaRenda && (
          <p className="mt-2 max-w-3xl text-lg text-tinta-suave">
            Financiando {formatarBRL(resultado.valorFinanciado)} + entrada de {formatarBRL(resultado.entrada)}.{' '}
            {EXPLICACAO_LIMITE[imovelPelaRenda.limitadoPor]}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Sistema em destaque" className="inline-flex rounded-xs border-2 border-tinta bg-branco">
          {([sistema, outroSistema] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={s === sistema}
              onClick={() => escolherSistema(s)}
              className={`flex items-center gap-1.5 px-3 py-1 text-sm font-semibold transition ${
                s === sistema ? 'bg-tinta text-branco' : 'text-tinta-suave hover:bg-sol hover:text-tinta'
              }`}
            >
              <span aria-hidden className={`marcador ${s === 'SAC' ? 'bg-sac' : 'bg-price'}`} />
              {nome(s)}
            </button>
          ))}
        </div>
        <button type="button" aria-pressed={comparar} onClick={alternarComparar} className="botao botao-linha px-3 py-1 text-sm">
          {comparar ? `Esconder ${nome(outroSistema)}` : `Comparar com ${nome(outroSistema)}`}
        </button>
      </div>

      {comparar && economiaTotalSac > 0 && (
        <p className="max-w-3xl text-lg text-tinta-suave">
          No SAC você paga <strong className="font-bold text-tinta tabular-nums">{formatarBRL(economiaTotalSac)}</strong> a menos no
          total, mas a primeira parcela é{' '}
          <strong className="font-bold text-tinta tabular-nums">{formatarBRL(diferencaPrimeiraParcela)}</strong> maior.
        </p>
      )}

      <div className={`grid gap-4 ${comparar ? 'sm:grid-cols-2' : 'max-w-xl'}`}>
        <CartaoSistema sistema={sistema} dados={dados(resultado, sistema)} />
        {comparar && <CartaoSistema sistema={outroSistema} dados={dados(resultado, outroSistema)} />}
      </div>

      {comparar && resultado.price.custos.cetAnual < resultado.sac.custos.cetAnual && economiaTotalSac > 0 && (
        <p className="estreito text-sm text-tinta-suave">
          Por que o CET da PRICE é menor se ela custa mais? CET é uma taxa, não um total: o seguro DFI e a taxa são
          valores fixos e pesam menos, em proporção, sobre uma dívida que cai devagar.
        </p>
      )}
    </section>
  )
}

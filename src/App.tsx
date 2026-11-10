import { lazy, Suspense, useState, type ReactNode } from 'react'
import { BarraResultado } from './components/BarraResultado'
import { Formulario } from './components/Formulario'
import { Glossario } from './components/Glossario'
import { PainelAmortizacaoExtra } from './components/PainelAmortizacaoExtra'
import { PainelCapacidade } from './components/PainelCapacidade'
import { PainelObra } from './components/PainelObra'
import { ResumoComparacao } from './components/ResumoComparacao'
import { SeletorSistema } from './components/SeletorSistema'
import { TabelaAmortizacao } from './components/TabelaAmortizacao'
import { useSimulacao } from './hooks/useSimulacao'
import type { Sistema } from './lib/financiamento'

// O Recharts é ~60% do JavaScript do app. Carregando os gráficos sob demanda,
// formulário e resumo aparecem antes, e o Vite gera um chunk separado.
const carregarGraficos = () => import('./components/graficos/Graficos')
const GraficoSaldo = lazy(() => carregarGraficos().then((m) => ({ default: m.GraficoSaldo })))
const GraficoComposicao = lazy(() => carregarGraficos().then((m) => ({ default: m.GraficoComposicao })))

function CarregandoGrafico() {
  return <div className="h-80 animate-pulse rounded-lg bg-slate-100" aria-label="Carregando gráfico" />
}

function Painel({ titulo, acao, children }: { titulo: string; acao?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-slate-900">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  )
}

export default function App() {
  const { valores, alterar, formatar, reiniciar, erros, resultado } = useSimulacao()
  // Um único seletor para composição e tabela: as duas mostram o mesmo sistema.
  const [sistema, setSistema] = useState<Sistema>('SAC')
  const detalhe = resultado ? (sistema === 'SAC' ? resultado.sac : resultado.price) : null

  return (
    <div className="min-h-screen pb-16 lg:pb-0">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <img src="/favicon.svg" alt="" className="size-10 shrink-0" />
          <div>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Simulador de financiamento imobiliário</h1>
            <p className="text-sm text-slate-600">
              Parcela, imóvel máximo e evolução de obra: compare SAC e PRICE e envie ao cliente.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[20rem_1fr]">
        {/* No computador o formulário acompanha a rolagem. Como ele pode ser mais alto que a
            tela (seções abertas), rola por dentro: sem isso, os botões do fim ficavam inalcançáveis. */}
        <div className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto lg:rounded-2xl">
          <Formulario
            valores={valores}
            erros={erros}
            alterar={alterar}
            formatar={formatar}
            reiniciar={reiniciar}
            resultado={resultado}
          />
        </div>

        {resultado && detalhe ? (
          <div id="resultado" className="min-w-0 scroll-mt-4 space-y-6">
            <BarraResultado resultado={resultado} alvoId="resultado" />
            <ResumoComparacao resultado={resultado} />

            {resultado.obra && (
              <Painel titulo={`Durante a obra: ${resultado.obra.resumo.meses} meses até as chaves`}>
                <PainelObra obra={resultado.obra} resultado={resultado} />
              </Painel>
            )}

            <Painel titulo="Até quanto esse cliente pode comprar?">
              <PainelCapacidade capacidade={resultado.capacidade} entrada={resultado.entrada} cota={resultado.cotaFinanciamento} />
            </Painel>

            {resultado.amortizacaoExtra && (
              <Painel titulo="Amortização extra: reduzir prazo ou parcela?">
                <PainelAmortizacaoExtra
                  comparacao={resultado.amortizacaoExtra}
                  prazoOriginal={resultado.sac.parcelas.length}
                />
              </Painel>
            )}

            <Painel titulo="Saldo devedor ao longo do tempo">
              <Suspense fallback={<CarregandoGrafico />}>
                <GraficoSaldo resultado={resultado} />
              </Suspense>
            </Painel>

            <Painel
              titulo="Composição da parcela"
              acao={<SeletorSistema valor={sistema} aoAlterar={setSistema} rotulo="Sistema exibido" />}
            >
              <Suspense fallback={<CarregandoGrafico />}>
                <GraficoComposicao parcelas={detalhe.parcelas} />
              </Suspense>
            </Painel>

            <Painel
              titulo="Tabela de amortização"
              acao={<SeletorSistema valor={sistema} aoAlterar={setSistema} rotulo="Sistema da tabela" />}
            >
              <TabelaAmortizacao parcelas={detalhe.parcelas} sistema={sistema} />
            </Painel>
          </div>
        ) : (
          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            Corrija os campos destacados para ver a simulação.
          </div>
        )}
      </main>

      <section className="mx-auto max-w-6xl px-4 pb-6">
        <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <summary className="cursor-pointer font-semibold text-slate-900">Entenda os termos</summary>
          <div className="mt-4">
            <Glossario />
          </div>
        </details>
      </section>

      <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-slate-500">
        <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-700">
            Feito por <strong className="font-semibold text-slate-900">João Victor</strong>, corretor de imóveis e
            desenvolvedor front-end.
          </p>
          <nav aria-label="Contato" className="flex gap-4 text-sm font-medium">
            <a
              className="text-sac underline-offset-2 hover:underline"
              href="https://www.linkedin.com/in/joaovictorvarela/"
              target="_blank"
              rel="noreferrer"
            >
              LinkedIn
            </a>
            <a
              className="text-sac underline-offset-2 hover:underline"
              href="https://github.com/Jonqry"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            <a
              className="text-sac underline-offset-2 hover:underline"
              href="https://github.com/Jonqry/simulador-financiamento"
              target="_blank"
              rel="noreferrer"
            >
              Código
            </a>
          </nav>
        </div>
        <p className="mt-4">
          Simulação educativa: seguros e taxa usam os valores informados, e o cálculo não inclui correção pela TR nem
          custos de contratação (avaliação, registro, ITBI). Os valores reais dependem das condições de cada banco.
        </p>
      </footer>
    </div>
  )
}

import { lazy, Suspense, useState, type ReactNode } from 'react'
import { Formulario } from './components/Formulario'
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
  const { valores, alterar, erros, resultado } = useSimulacao()
  // Um único seletor para composição e tabela: as duas mostram o mesmo sistema.
  const [sistema, setSistema] = useState<Sistema>('SAC')
  const detalhe = resultado ? (sistema === 'SAC' ? resultado.sac : resultado.price) : null

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5">
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Simulador de financiamento imobiliário</h1>
          <p className="text-sm text-slate-600">Compare SAC e PRICE e veja se a parcela cabe na sua renda.</p>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[20rem_1fr]">
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Formulario valores={valores} erros={erros} alterar={alterar} resultado={resultado} />
        </div>

        {resultado && detalhe ? (
          <div className="min-w-0 space-y-6">
            <ResumoComparacao resultado={resultado} />

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

      <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-slate-500">
        Simulação educativa: não inclui seguros (MIP/DFI), taxa de administração nem correção pela TR. Os valores
        reais dependem das condições de cada banco.{' '}
        <a className="underline hover:text-slate-700" href="https://github.com/Jonqry/simulador-financiamento">
          Código no GitHub
        </a>
      </footer>
    </div>
  )
}

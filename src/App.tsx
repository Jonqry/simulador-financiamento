import { lazy, Suspense, useState, type ReactNode } from 'react'
import { BarraResultado } from './components/BarraResultado'
import { Formulario } from './components/Formulario'
import { Glossario } from './components/Glossario'
import { PainelAmortizacaoExtra } from './components/PainelAmortizacaoExtra'
import { PainelCapacidade } from './components/PainelCapacidade'
import { PainelObra } from './components/PainelObra'
import { PainelReprovado } from './components/PainelReprovado'
import { ResultadoPrincipal } from './components/ResultadoPrincipal'
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
  return <div className="grade-planta h-80 animate-pulse bg-piso" aria-label="Carregando gráfico" />
}

function Painel({ titulo, acao, children }: { titulo: string; acao?: ReactNode; children: ReactNode }) {
  return (
    <section className="bloco">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  )
}

export default function App() {
  const { valores, opcoes, alterar, alterarOpcao, usarTaxaAutomatica, formatar, reiniciar, erros, enquadramento, simulacao } =
    useSimulacao()
  // Um único seletor para composição e tabela: as duas mostram o mesmo sistema.
  // null = acompanha o sistema em destaque (PRICE no MCMV, SAC no SBPE).
  const [sistemaDetalhe, setSistemaDetalhe] = useState<Sistema | null>(null)
  const resultado = simulacao?.resultado ?? null
  const sistema = sistemaDetalhe ?? simulacao?.sistema ?? 'PRICE'
  const detalhe = resultado ? (sistema === 'SAC' ? resultado.sac : resultado.price) : null
  // O sistema em destaque primeiro; o outro só quando o corretor pede a comparação.
  const ordem: Sistema[] = simulacao ? [simulacao.sistema, simulacao.outroSistema] : ['PRICE', 'SAC']
  const sistemasVisiveis = opcoes.comparar ? ordem : ordem.slice(0, 1)
  const escolherSistema = (s: Sistema) => {
    alterarOpcao('sistema', s)
    setSistemaDetalhe(null)
  }

  return (
    <div className="min-h-screen pb-16 lg:pb-0">
      <header>
        <div className="border-b-2 border-tinta">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <a
              href="https://joaovictorvarela.vercel.app"
              className="largo flex items-center gap-2.5 font-extrabold text-tinta no-underline"
            >
              <img src="/favicon.svg" alt="" className="size-7 shrink-0" />
              João Victor Varela
            </a>
            <a
              href="https://joaovictorvarela.vercel.app/projetos"
              className="estreito text-sm font-medium text-tinta-suave hover:text-tinta"
            >
              Ver outros projetos
            </a>
          </div>
        </div>
      </header>

      {/* No computador o título fica na coluna da direita, para o formulário fixo começar logo
          abaixo da faixa do topo: com um cabeçalho alto, em telas baixas os botões do fim do
          formulário só apareciam depois de rolar a página. A 2ª linha (1fr) absorve a sobra de
          altura do formulário: sem isso, com um resultado curto (reprovado), o título esticava. */}
      <main className="mx-auto grid max-w-6xl gap-x-8 gap-y-6 px-4 py-6 lg:grid-cols-[22rem_1fr] lg:grid-rows-[auto_1fr]">
        <div className="grade-planta -mx-4 px-4 pt-2 lg:col-start-2 lg:row-start-1 lg:mx-0 lg:px-0">
          <h1 className="text-3xl font-extrabold sm:text-4xl">Simulador de financiamento imobiliário</h1>
          <p className="mt-3 max-w-2xl text-tinta-suave sm:text-lg">
            Minha Casa, Minha Vida e SBPE: parcela, imóvel máximo pela renda e evolução de obra, prontos para enviar ao
            cliente.
          </p>
          <div className="cota-linha mt-5" aria-hidden />
        </div>

        {/* No computador o formulário acompanha a rolagem. Como ele pode ser mais alto que a
            tela (seções abertas), rola por dentro: sem isso, os botões do fim ficavam inalcançáveis. */}
        <div className="lg:sticky lg:top-6 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto">
          <Formulario
            valores={valores}
            opcoes={opcoes}
            erros={erros}
            alterar={alterar}
            alterarOpcao={alterarOpcao}
            usarTaxaAutomatica={usarTaxaAutomatica}
            formatar={formatar}
            reiniciar={reiniciar}
            enquadramento={enquadramento}
            simulacao={simulacao}
          />
        </div>

        {simulacao && resultado && detalhe ? (
          <div id="resultado" className="min-w-0 scroll-mt-4 space-y-10 lg:col-start-2 lg:row-start-2">
            <BarraResultado resultado={resultado} sistemas={sistemasVisiveis} reprovado={simulacao.reprovado} alvoId="resultado" />

            {simulacao.reprovado && simulacao.saidas ? (
              <PainelReprovado
                resultado={resultado}
                enquadramento={simulacao.enquadramento}
                sistema={simulacao.sistema}
                outroSistema={simulacao.outroSistema}
                saidas={simulacao.saidas}
                simularPelaRenda={() => alterarOpcao('modo', 'renda')}
                escolherSistema={escolherSistema}
              />
            ) : (
              <>
                <ResultadoPrincipal
                  resultado={resultado}
                  enquadramento={simulacao.enquadramento}
                  sistema={simulacao.sistema}
                  outroSistema={simulacao.outroSistema}
                  comparar={opcoes.comparar}
                  valorImovel={simulacao.entrada.valorImovel}
                  imovelPelaRenda={simulacao.imovelPelaRenda}
                  escolherSistema={escolherSistema}
                  alternarComparar={() => alterarOpcao('comparar', !opcoes.comparar)}
                />

                {resultado.obra && (
                  <Painel titulo={`Durante a obra: ${resultado.obra.resumo.meses} meses até as chaves`}>
                    <PainelObra obra={resultado.obra} resultado={resultado} sistemas={sistemasVisiveis} />
                  </Painel>
                )}

                {opcoes.modo === 'imovel' && (
                  <Painel titulo="Até quanto esse cliente pode comprar?">
                    <PainelCapacidade
                      capacidade={resultado.capacidade}
                      sistemas={sistemasVisiveis}
                      entrada={resultado.entrada}
                      cota={resultado.cotaFinanciamento}
                      limiteRenda={resultado.limiteRenda}
                    />
                  </Painel>
                )}

                {resultado.amortizacaoExtra && (
                  <Painel titulo="Amortização extra: reduzir prazo ou parcela?">
                    <PainelAmortizacaoExtra
                      comparacao={resultado.amortizacaoExtra}
                      prazoOriginal={detalhe.parcelas.length}
                      sistemas={sistemasVisiveis}
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
                  acao={<SeletorSistema valor={sistema} aoAlterar={setSistemaDetalhe} rotulo="Sistema exibido" ordem={ordem} />}
                >
                  <Suspense fallback={<CarregandoGrafico />}>
                    <GraficoComposicao parcelas={detalhe.parcelas} />
                  </Suspense>
                </Painel>

                <Painel
                  titulo="Tabela de amortização"
                  acao={<SeletorSistema valor={sistema} aoAlterar={setSistemaDetalhe} rotulo="Sistema da tabela" ordem={ordem} />}
                >
                  <TabelaAmortizacao parcelas={detalhe.parcelas} sistema={sistema} />
                </Painel>
              </>
            )}
          </div>
        ) : (
          <div className="grade-planta flex min-h-64 items-center lg:col-start-2 lg:row-start-2 justify-center border-2 border-dashed border-linha p-8 text-center text-tinta-suave">
            Corrija os campos destacados para ver a simulação.
          </div>
        )}
      </main>

      <section className="mx-auto max-w-6xl px-4 pt-4 pb-10">
        <details className="group bloco">
          <summary className="largo flex cursor-pointer list-none items-center justify-between gap-2 text-xl font-extrabold">
            Entenda os termos
            <span aria-hidden className="text-base text-tinta-suave transition group-open:rotate-180">
              ▾
            </span>
          </summary>
          <div className="mt-4">
            <Glossario />
          </div>
        </details>
      </section>

      <footer className="border-t-2 border-tinta">
        <div className="mx-auto max-w-6xl px-4 pt-6 pb-8 text-xs text-tinta-suave">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              Feito por <strong className="font-semibold text-tinta">João Victor</strong>, corretor de imóveis e
              desenvolvedor.
            </p>
            <nav aria-label="Contato" className="flex gap-5 text-sm">
              <a
                className="link-texto"
                href="https://www.linkedin.com/in/joaovictorvarela/"
                target="_blank"
                rel="noreferrer"
              >
                LinkedIn
              </a>
              <a
                className="link-texto"
                href="https://github.com/Jonqry"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
              <a
                className="link-texto"
                href="https://github.com/Jonqry/simulador-financiamento"
                target="_blank"
                rel="noreferrer"
              >
                Código
              </a>
            </nav>
          </div>
          <p className="estreito mt-4 max-w-4xl">
            Simulação educativa: seguros e taxa usam os valores informados, e o cálculo não inclui correção pela TR nem
            custos de contratação (avaliação, registro, ITBI). Os valores reais dependem das condições de cada banco.
          </p>
        </div>
      </footer>
    </div>
  )
}

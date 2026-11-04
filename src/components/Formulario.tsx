import { useEffect, useId, useRef, type ReactNode } from 'react'
import { formatarBRL, reaisParaCentavos, type CampoSimulacao, type ErrosSimulacao, type ResultadoSimulacao } from '../lib/financiamento'
import { formatarNumeroBR, parseNumeroBR } from '../lib/formulario/numero'
import { converter, type ValoresFormulario } from '../lib/formulario/valores'
import { gerarResumoCliente } from '../lib/resumoCliente'
import { BotaoCompartilhar, BotaoCopiar } from './BotaoCompartilhar'
import { Campo } from './Campo'
import { SugestaoTaxa } from './SugestaoTaxa'

interface FormularioProps {
  valores: ValoresFormulario
  erros: ErrosSimulacao
  alterar: (campo: CampoSimulacao, texto: string) => void
  resultado: ResultadoSimulacao | null
}

function dicaPrazo(texto: string): string | undefined {
  const meses = parseNumeroBR(texto)
  if (meses === null || meses <= 0) return undefined
  const anos = meses / 12
  return Number.isInteger(anos) ? `${anos} ${anos === 1 ? 'ano' : 'anos'}` : `${anos.toFixed(1).replace('.', ',')} anos`
}

/**
 * Seção recolhível. <details> nativo: acessível por teclado e leitor de tela
 * sem nenhum JavaScript.
 *
 * Abre sozinha quando surge um erro dentro, mas NUNCA fecha sozinha. A
 * primeira versão usava open={temErro}: quando o erro sumia, o React tirava
 * o atributo e a seção fechava no meio do preenchimento. O teste E2E com
 * Playwright pegou isso; o teste no jsdom não, porque lá nada fica invisível.
 */
function Secao({ titulo, resumo, temErro, children }: { titulo: string; resumo?: string; temErro: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    if (temErro && ref.current) ref.current.open = true
  }, [temErro])

  return (
    <details ref={ref} className="group rounded-lg border border-slate-200 open:bg-slate-50/60">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium text-slate-800">
        <span>
          {titulo}
          {resumo && <span className="block text-xs font-normal text-slate-500">{resumo}</span>}
        </span>
        <span aria-hidden className="text-slate-400 transition group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="space-y-4 px-3 pt-1 pb-4">{children}</div>
    </details>
  )
}

function textoResumo(valores: ValoresFormulario, resultado: ResultadoSimulacao): string {
  const conversao = converter(valores)
  if (!conversao.ok) return window.location.href
  const e = conversao.entrada
  const intervalo = e.extraIntervalo ?? 0
  const quando = intervalo === 24 ? 'a cada 2 anos' : intervalo === 12 ? 'todo ano' : `no mês ${e.extraMes}`
  return gerarResumoCliente(
    {
      valorImovel: e.valorImovel,
      entrada: e.entrada,
      taxaAnual: e.taxaAnual,
      prazoMeses: e.prazoMeses,
      temEncargos: (e.mipMensal ?? 0) + (e.dfiMensal ?? 0) + (e.taxaAdministracao ?? 0) > 0,
      descricaoExtra: e.extraValor ? `${formatarBRL(e.extraValor)} ${quando}` : undefined,
    },
    resultado,
    window.location.href,
  )
}

/** Mostra o valor financiado e avisa se a entrada está abaixo do mínimo pela cota. */
function dicaEntrada(valores: ValoresFormulario, resultado: ResultadoSimulacao | null): string | undefined {
  const valorImovel = parseNumeroBR(valores.valorImovel)
  const entrada = parseNumeroBR(valores.entrada)
  const cotaPercentual = parseNumeroBR(valores.cotaFinanciamento) ?? 80
  if (valorImovel !== null && entrada !== null && cotaPercentual > 0 && cotaPercentual < 100) {
    const entradaMinima = reaisParaCentavos(valorImovel * (1 - cotaPercentual / 100))
    if (reaisParaCentavos(entrada) < entradaMinima) {
      return `Atenção: com cota de ${formatarNumeroBR(cotaPercentual)}%, a entrada mínima é ${formatarBRL(entradaMinima)}.`
    }
  }
  return resultado ? `Valor financiado: ${formatarBRL(resultado.valorFinanciado)}` : undefined
}

const OPCOES_REPETICAO = [
  { valor: '0', rotulo: 'Uma vez só' },
  { valor: '24', rotulo: 'A cada 2 anos (FGTS)' },
  { valor: '12', rotulo: 'Todo ano' },
]

export function Formulario({ valores, erros, alterar, resultado }: FormularioProps) {
  const idRepetir = useId()
  const campo = (nome: CampoSimulacao) => ({
    valor: valores[nome],
    aoAlterar: (texto: string) => alterar(nome, texto),
    erro: erros[nome],
  })

  const resumoCondicoes = `Financia até ${valores.cotaFinanciamento || '80'}% · MIP ${valores.mipMensal || '0'}% · DFI ${valores.dfiMensal || '0'}% · R$ ${valores.taxaAdministracao || '0'}`
  const temExtra = (parseNumeroBR(valores.extraValor) ?? 0) > 0

  return (
    <form
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      onSubmit={(evento) => evento.preventDefault()}
      aria-label="Dados do financiamento"
    >
      <h2 className="text-lg font-semibold text-slate-900">Dados do financiamento</h2>

      <Campo rotulo="Valor do imóvel" prefixo="R$" {...campo('valorImovel')} />
      <Campo
        rotulo="Entrada"
        prefixo="R$"
        {...campo('entrada')}
        dica={dicaEntrada(valores, resultado)}
      />
      <Campo
        rotulo="Taxa de juros"
        sufixo="% ao ano"
        {...campo('taxaAnual')}
        dica="Taxa efetiva anual, como aparece na simulação do banco."
      />
      <Campo
        rotulo="Prazo"
        sufixo="meses"
        {...campo('prazoMeses')}
        dica={[dicaPrazo(valores.prazoMeses), 'Caixa e BB: até 420 meses (35 anos)'].filter(Boolean).join(' · ')}
      />
      <Campo
        rotulo="Renda bruta mensal"
        prefixo="R$"
        {...campo('rendaMensal')}
        dica="Soma da renda de quem vai compor o financiamento."
      />
      <SugestaoTaxa
        rendaTexto={valores.rendaMensal}
        valorImovelTexto={valores.valorImovel}
        usarTaxa={(taxa) => alterar('taxaAnual', taxa)}
      />

      <Secao
        titulo="Condições do banco"
        resumo={resumoCondicoes}
        temErro={Boolean(erros.cotaFinanciamento || erros.mipMensal || erros.dfiMensal || erros.taxaAdministracao)}
      >
        <p className="text-xs text-slate-600">
          Valores de exemplo; use os da proposta do banco. O MIP varia com a idade. Deixe seguros e taxa em branco para
          ignorar.
        </p>
        <Campo
          rotulo="Cota de financiamento"
          sufixo="% do imóvel"
          {...campo('cotaFinanciamento')}
          dica="Quanto do imóvel o banco financia. Comum: 80%. MCMV Faixa 4: 60% a 70%. Alguns bancos: até 90%."
        />
        <Campo
          rotulo="Seguro MIP (morte e invalidez)"
          sufixo="% ao mês"
          {...campo('mipMensal')}
          dica="Sobre o saldo devedor: diminui junto com a dívida."
        />
        <Campo
          rotulo="Seguro DFI (danos ao imóvel)"
          sufixo="% ao mês"
          {...campo('dfiMensal')}
          dica="Sobre o valor do imóvel: fica igual o contrato todo."
        />
        <Campo rotulo="Taxa de administração" prefixo="R$" sufixo="por mês" {...campo('taxaAdministracao')} />
      </Secao>

      <Secao
        titulo="Amortização extra (FGTS)"
        resumo={temExtra ? `R$ ${valores.extraValor} a partir do mês ${valores.extraMes || '?'}` : 'Opcional'}
        temErro={Boolean(erros.extraValor || erros.extraMes || erros.extraIntervalo)}
      >
        <Campo rotulo="Valor extra" prefixo="R$" {...campo('extraValor')} dica="Ex.: saldo do FGTS ou 13º salário." />
        <Campo rotulo="Pagar no mês" sufixo="do contrato" {...campo('extraMes')} />
        <div>
          <label htmlFor={idRepetir} className="block text-sm font-medium text-slate-700">
            Repetir
          </label>
          <select
            id={idRepetir}
            value={valores.extraIntervalo}
            onChange={(evento) => alterar('extraIntervalo', evento.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-sac/30"
          >
            {OPCOES_REPETICAO.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>
                {opcao.rotulo}
              </option>
            ))}
          </select>
        </div>
      </Secao>

      <div className="space-y-1">
        <BotaoCompartilhar desabilitado={!resultado} />
        <BotaoCopiar
          variante="secundario"
          rotulo="Copiar resumo para o cliente"
          rotuloCopiado="Resumo copiado! Cole no WhatsApp"
          obterTexto={() => (resultado ? textoResumo(valores, resultado) : '')}
          desabilitado={!resultado}
          mensagemFalha="Não foi possível copiar o resumo neste navegador."
        />
      </div>
    </form>
  )
}

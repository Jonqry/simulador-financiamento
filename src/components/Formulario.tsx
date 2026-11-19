import { useEffect, useId, useRef, type ReactNode } from 'react'
import { formatarBRL, formatarPercentual, type CampoSimulacao, type ErrosSimulacao } from '../lib/financiamento'
import { formatarNumeroBR, parseNumeroBR } from '../lib/formulario/numero'
import { paraQueryString } from '../lib/formulario/url'
import { formatarValor, type EstadoFormulario, type OpcoesFormulario, type ValoresFormulario } from '../lib/formulario/valores'
import { gerarResumoCliente } from '../lib/resumoCliente'
import { descreverPrograma, type Enquadramento } from '../lib/taxasReferencia'
import type { SimulacaoPronta } from '../hooks/useSimulacao'
import { BotaoCompartilhar, BotaoCopiar } from './BotaoCompartilhar'
import { Campo } from './Campo'
import { ProgramaTaxa } from './ProgramaTaxa'

interface FormularioProps {
  valores: ValoresFormulario
  opcoes: OpcoesFormulario
  erros: ErrosSimulacao
  alterar: (campo: CampoSimulacao, texto: string) => void
  alterarOpcao: <K extends keyof OpcoesFormulario>(opcao: K, valor: OpcoesFormulario[K]) => void
  usarTaxaAutomatica: () => void
  formatar: (campo: CampoSimulacao) => void
  reiniciar: () => void
  enquadramento: Enquadramento | null
  simulacao: SimulacaoPronta | null
}

function dicaPrazo(texto: string, emAnos: boolean): string | undefined {
  const numero = parseNumeroBR(texto)
  if (numero === null || numero <= 0) return undefined
  if (emAnos) return `${Math.round(numero * 12)} meses`
  const anos = numero / 12
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
    <details ref={ref} className="group rounded-xs border-[1.5px] border-linha open:border-tinta open:bg-papel">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-semibold">
        <span>
          {titulo}
          {resumo && <span className="estreito block text-sm font-normal text-tinta-suave">{resumo}</span>}
        </span>
        <span aria-hidden className="text-tinta-suave transition group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="space-y-4 px-3 pt-1 pb-4">{children}</div>
    </details>
  )
}

/** Controle segmentado simples (botões com aria-pressed). */
function Segmentado<T extends string>({
  rotulo,
  opcoes,
  valor,
  aoAlterar,
}: {
  rotulo: string
  opcoes: readonly { valor: T; rotulo: string }[]
  valor: T
  aoAlterar: (valor: T) => void
}) {
  return (
    <div role="group" aria-label={rotulo} className="grid grid-cols-2 rounded-xs border-2 border-tinta bg-branco">
      {opcoes.map((opcao) => (
        <button
          key={opcao.valor}
          type="button"
          aria-pressed={valor === opcao.valor}
          onClick={() => aoAlterar(opcao.valor)}
          className={`px-2 py-1.5 text-sm font-semibold transition ${
            valor === opcao.valor ? 'bg-tinta text-branco' : 'text-tinta-suave hover:bg-sol hover:text-tinta'
          }`}
        >
          {opcao.rotulo}
        </button>
      ))}
    </div>
  )
}

/**
 * Link da simulação montado a partir do estado (e não de window.location.href,
 * que só é atualizado depois do render): assim o link do WhatsApp nunca sai atrasado.
 */
function linkDaSimulacao(estado: EstadoFormulario): string {
  return `${window.location.origin}${window.location.pathname}?${paraQueryString(estado)}`
}

function textoResumo(estado: EstadoFormulario, simulacao: SimulacaoPronta): string {
  const { entrada: e, resultado } = simulacao
  const intervalo = e.extraIntervalo ?? 0
  const quando = intervalo === 24 ? 'a cada 2 anos' : intervalo === 12 ? 'todo ano' : `no mês ${e.extraMes}`
  return gerarResumoCliente(
    {
      valorImovel: e.valorImovel,
      entrada: resultado.entrada,
      taxaAnual: e.taxaAnual,
      prazoMeses: e.prazoMeses,
      temEncargos: (e.mipMensal ?? 0) + (e.dfiMensal ?? 0) + (e.taxaAdministracao ?? 0) > 0,
      descricaoExtra: e.extraValor ? `${formatarBRL(e.extraValor)} ${quando}` : undefined,
      sistema: simulacao.sistema,
      comparar: estado.opcoes.comparar,
      programa: descreverPrograma(simulacao.enquadramento),
    },
    resultado,
    linkDaSimulacao(estado),
  )
}

/** Valor financiado, percentual da entrada e aviso de entrada abaixo do mínimo pela cota. */
function dicaEntrada(simulacao: SimulacaoPronta | null, emPercentual: boolean): string {
  if (!simulacao) return emPercentual ? 'Em percentual do valor do imóvel.' : 'Aceita percentual do imóvel: ex., 20%.'
  const { resultado, entrada } = simulacao
  const entradaMinima = Math.ceil(entrada.valorImovel * (1 - resultado.cotaFinanciamento))
  if (resultado.entrada < entradaMinima) {
    return `Atenção: com cota de ${formatarNumeroBR(resultado.cotaFinanciamento * 100)}%, a entrada mínima é ${formatarBRL(entradaMinima)}.`
  }
  // Corretor pensa em "20% de entrada": mostra o percentual junto.
  const percentual = formatarPercentual(resultado.entrada / entrada.valorImovel)
  const total = resultado.entrada !== entrada.entrada ? ` (total com FGTS e subsídio: ${formatarBRL(resultado.entrada)})` : ''
  const emReais = emPercentual ? `${formatarBRL(entrada.entrada)} · ` : ''
  return `${emReais}Valor financiado: ${formatarBRL(resultado.valorFinanciado)} · entrada de ${percentual}${total}`
}

const OPCOES_REPETICAO = [
  { valor: '0', rotulo: 'Uma vez só' },
  { valor: '24', rotulo: 'A cada 2 anos (FGTS)' },
  { valor: '12', rotulo: 'Todo ano' },
]

const MODOS = [
  { valor: 'imovel', rotulo: 'Tenho o imóvel' },
  { valor: 'renda', rotulo: 'Quanto posso comprar' },
] as const

export function Formulario({
  valores,
  opcoes,
  erros,
  alterar,
  alterarOpcao,
  usarTaxaAutomatica,
  formatar,
  reiniciar,
  enquadramento,
  simulacao,
}: FormularioProps) {
  const idRepetir = useId()
  const campo = (nome: CampoSimulacao) => ({
    valor: valores[nome],
    aoAlterar: (texto: string) => alterar(nome, texto),
    aoSair: () => formatar(nome),
    erro: erros[nome],
  })
  const estado = { valores, opcoes }
  const pelaRenda = opcoes.modo === 'renda'
  const reprovado = simulacao?.reprovado ?? false
  const podeEnviar = simulacao !== null && !reprovado

  // Taxa automática: o campo mostra a taxa do enquadramento.
  const taxaTexto = opcoes.taxaManual
    ? valores.taxaAnual
    : enquadramento
      ? formatarValor('taxaAnual', enquadramento.taxaAnual * 100)
      : ''

  const resumoCondicoes = `Financia até ${valores.cotaFinanciamento || '80'}% · parcela até ${valores.limiteRenda || '30'}% da renda · MIP ${valores.mipMensal || '0'}% · DFI ${valores.dfiMensal || '0'}% · R$ ${valores.taxaAdministracao || '0'}`
  const temExtra = (parseNumeroBR(valores.extraValor) ?? 0) > 0
  const fgts = parseNumeroBR(valores.fgtsEntrada) ?? 0
  const subsidio = parseNumeroBR(valores.subsidio) ?? 0
  const resumoFgts =
    fgts + subsidio > 0
      ? [fgts > 0 && `FGTS R$ ${valores.fgtsEntrada}`, subsidio > 0 && `subsídio R$ ${valores.subsidio}`].filter(Boolean).join(' · ')
      : 'Opcional'

  return (
    <form
      className="space-y-4 rounded-xs border-2 border-tinta bg-branco p-5"
      onSubmit={(evento) => evento.preventDefault()}
      aria-label="Dados do financiamento"
    >
      {/* O título e o "Recomeçar" quebram de linha quando não cabem lado a lado: os dois sem
          quebra alargavam a coluna e criavam rolagem para o lado (celular e barra de rolagem do Windows). */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <h2 className="text-lg font-extrabold [font-stretch:100%]">Dados do financiamento</h2>
        <button
          type="button"
          onClick={reiniciar}
          className="estreito py-1 text-sm font-medium whitespace-nowrap text-tinta-suave underline underline-offset-4 hover:bg-sol hover:text-tinta"
          title="Volta aos valores iniciais para simular outro cliente"
        >
          Recomeçar
        </button>
      </div>

      <Segmentado rotulo="O que simular" opcoes={MODOS} valor={opcoes.modo} aoAlterar={(modo) => alterarOpcao('modo', modo)} />

      {pelaRenda ? (
        <p className="estreito text-sm text-tinta-suave">
          O simulador calcula o maior imóvel que cabe na renda com a entrada informada, já na faixa certa do MCMV.
        </p>
      ) : (
        <Campo rotulo="Valor do imóvel" prefixo="R$" {...campo('valorImovel')} />
      )}
      <Campo
        rotulo="Entrada"
        prefixo="R$"
        {...campo('entrada')}
        dica={pelaRenda ? 'Recursos próprios. FGTS e subsídio ficam na seção abaixo.' : dicaEntrada(simulacao, valores.entrada.includes('%'))}
      />
      <Campo
        rotulo="Renda bruta mensal"
        prefixo="R$"
        {...campo('rendaMensal')}
        dica="Soma da renda de quem vai compor o financiamento."
      />

      <ProgramaTaxa
        enquadramento={enquadramento}
        opcoes={opcoes}
        taxaTexto={taxaTexto}
        erros={erros}
        alterarTaxa={(texto) => alterar('taxaAnual', texto)}
        formatarTaxa={() => formatar('taxaAnual')}
        usarTaxaAutomatica={usarTaxaAutomatica}
        alterarOpcao={alterarOpcao}
      />

      <Campo
        rotulo="Prazo"
        {...campo('prazoMeses')}
        sufixo={
          <select
            aria-label="Meses ou anos"
            value={opcoes.prazoEmAnos ? 'anos' : 'meses'}
            onChange={(e) => alterarOpcao('prazoEmAnos', e.target.value === 'anos')}
            className="bg-transparent text-sm text-tinta-suave"
          >
            <option value="meses">meses</option>
            <option value="anos">anos</option>
          </select>
        }
        dica={[dicaPrazo(valores.prazoMeses, opcoes.prazoEmAnos), `Caixa e BB vão até ${opcoes.prazoEmAnos ? '35 anos' : '420 meses'}`].filter(Boolean).join(' · ')}
      />

      <Secao titulo="FGTS e subsídio na entrada" resumo={resumoFgts} temErro={Boolean(erros.fgtsEntrada || erros.subsidio)}>
        <p className="estreito text-sm text-tinta-suave">Somam à entrada e abatem o valor financiado.</p>
        <Campo rotulo="FGTS" prefixo="R$" {...campo('fgtsEntrada')} />
        <Campo
          rotulo="Subsídio do MCMV"
          prefixo="R$"
          {...campo('subsidio')}
          dica="Desconto do programa (Faixas 1 e 2), conforme a análise da Caixa."
        />
      </Secao>

      <Secao
        titulo="Condições do banco"
        resumo={resumoCondicoes}
        temErro={Boolean(erros.cotaFinanciamento || erros.limiteRenda || erros.mipMensal || erros.dfiMensal || erros.taxaAdministracao)}
      >
        <p className="estreito text-sm text-tinta-suave">
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
          rotulo="Limite da parcela"
          sufixo="% da renda"
          {...campo('limiteRenda')}
          dica="Acima disso a simulação é reprovada. A maioria dos bancos usa 30%."
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
        titulo="Imóvel na planta (evolução de obra)"
        resumo={
          (parseNumeroBR(valores.obraMeses) ?? 0) > 0
            ? `${valores.obraMeses} meses até as chaves · ${valores.obraExecutada || '0'}% executado`
            : 'Opcional'
        }
        temErro={Boolean(erros.obraMeses || erros.obraExecutada)}
      >
        <p className="estreito text-sm text-tinta-suave">
          Na planta, até as chaves você paga juros sobre o valor que o banco já repassou à construtora, mais seguros e
          taxa. A amortização começa depois.
        </p>
        <Campo rotulo="Meses até as chaves" sufixo="meses" {...campo('obraMeses')} dica="Deixe vazio se o imóvel está pronto." />
        <Campo
          rotulo="Obra já executada"
          sufixo="%"
          {...campo('obraExecutada')}
          dica="Percentual concluído na assinatura do contrato (está no cronograma da construtora)."
        />
      </Secao>

      <Secao
        titulo="Amortização extra (FGTS)"
        resumo={temExtra ? `R$ ${valores.extraValor} a partir do mês ${valores.extraMes || '?'}` : 'Opcional'}
        temErro={Boolean(erros.extraValor || erros.extraMes || erros.extraIntervalo)}
      >
        <Campo rotulo="Valor extra" prefixo="R$" {...campo('extraValor')} dica="Ex.: saldo do FGTS ou 13º salário." />
        <Campo rotulo="Pagar no mês" sufixo="do contrato" {...campo('extraMes')} />
        <div>
          <label htmlFor={idRepetir} className="block text-sm font-semibold">
            Repetir
          </label>
          <select
            id={idRepetir}
            value={valores.extraIntervalo}
            onChange={(evento) => alterar('extraIntervalo', evento.target.value)}
            className="mt-1 w-full rounded-xs border-[1.5px] border-linha bg-branco px-3 py-2 font-medium text-tinta"
          >
            {OPCOES_REPETICAO.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>
                {opcao.rotulo}
              </option>
            ))}
          </select>
        </div>
      </Secao>

      <div className="space-y-2 border-t-2 border-tinta pt-4">
        <p className="text-sm font-semibold">Enviar para o cliente</p>
        {podeEnviar ? (
          <a
            href={`https://wa.me/?text=${encodeURIComponent(textoResumo(estado, simulacao))}`}
            target="_blank"
            rel="noreferrer"
            className="botao botao-principal w-full px-4 py-2.5 text-sm"
          >
            Enviar resumo no WhatsApp
          </a>
        ) : (
          <button type="button" disabled className="botao w-full px-4 py-2.5 text-sm">
            Enviar resumo no WhatsApp
          </button>
        )}
        {reprovado && (
          <p className="estreito text-sm font-semibold text-critico">
            Não aprovado pela renda: ajuste a simulação antes de enviar ao cliente.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <BotaoCopiar
            variante="secundario"
            rotulo="Copiar resumo"
            rotuloCopiado="Resumo copiado!"
            obterTexto={() => (podeEnviar ? textoResumo(estado, simulacao) : '')}
            desabilitado={!podeEnviar}
            mensagemFalha="Não foi possível copiar."
          />
          <BotaoCompartilhar desabilitado={!simulacao} />
        </div>
      </div>
    </form>
  )
}

import { useId, type ReactNode } from 'react'
import { formatarBRL, type CampoSimulacao, type ErrosSimulacao, type ResultadoSimulacao } from '../lib/financiamento'
import { parseNumeroBR } from '../lib/formulario/numero'
import type { ValoresFormulario } from '../lib/formulario/valores'
import { BotaoCompartilhar } from './BotaoCompartilhar'
import { Campo } from './Campo'

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
 * sem nenhum JavaScript. Abre sozinha se tiver erro dentro.
 */
function Secao({ titulo, resumo, temErro, children }: { titulo: string; resumo?: string; temErro: boolean; children: ReactNode }) {
  return (
    <details className="group rounded-lg border border-slate-200 open:bg-slate-50/60" open={temErro || undefined}>
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

  const resumoEncargos = `MIP ${valores.mipMensal || '0'}% · DFI ${valores.dfiMensal || '0'}% · R$ ${valores.taxaAdministracao || '0'}`
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
        dica={resultado ? `Valor financiado: ${formatarBRL(resultado.valorFinanciado)}` : undefined}
      />
      <Campo
        rotulo="Taxa de juros"
        sufixo="% ao ano"
        {...campo('taxaAnual')}
        dica="Taxa efetiva anual, como aparece na simulação do banco."
      />
      <Campo rotulo="Prazo" sufixo="meses" {...campo('prazoMeses')} dica={dicaPrazo(valores.prazoMeses)} />
      <Campo
        rotulo="Renda bruta mensal"
        prefixo="R$"
        {...campo('rendaMensal')}
        dica="Soma da renda de quem vai compor o financiamento."
      />

      <Secao
        titulo="Seguros e taxa"
        resumo={resumoEncargos}
        temErro={Boolean(erros.mipMensal || erros.dfiMensal || erros.taxaAdministracao)}
      >
        <p className="text-xs text-slate-600">
          Valores de exemplo. O MIP varia com a idade; use os do seu contrato. Deixe em branco para ignorar.
        </p>
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

      <BotaoCompartilhar desabilitado={!resultado} />
    </form>
  )
}

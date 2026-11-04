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

export function Formulario({ valores, erros, alterar, resultado }: FormularioProps) {
  return (
    <form
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      onSubmit={(evento) => evento.preventDefault()}
      aria-label="Dados do financiamento"
    >
      <h2 className="text-lg font-semibold text-slate-900">Dados do financiamento</h2>

      <Campo
        rotulo="Valor do imóvel"
        prefixo="R$"
        valor={valores.valorImovel}
        aoAlterar={(texto) => alterar('valorImovel', texto)}
        erro={erros.valorImovel}
      />
      <Campo
        rotulo="Entrada"
        prefixo="R$"
        valor={valores.entrada}
        aoAlterar={(texto) => alterar('entrada', texto)}
        erro={erros.entrada}
        dica={resultado ? `Valor financiado: ${formatarBRL(resultado.valorFinanciado)}` : undefined}
      />
      <Campo
        rotulo="Taxa de juros"
        sufixo="% ao ano"
        valor={valores.taxaAnual}
        aoAlterar={(texto) => alterar('taxaAnual', texto)}
        erro={erros.taxaAnual}
        dica="Taxa efetiva anual, como aparece na simulação do banco."
      />
      <Campo
        rotulo="Prazo"
        sufixo="meses"
        valor={valores.prazoMeses}
        aoAlterar={(texto) => alterar('prazoMeses', texto)}
        erro={erros.prazoMeses}
        dica={dicaPrazo(valores.prazoMeses)}
      />
      <Campo
        rotulo="Renda bruta mensal"
        prefixo="R$"
        valor={valores.rendaMensal}
        aoAlterar={(texto) => alterar('rendaMensal', texto)}
        erro={erros.rendaMensal}
        dica="Soma da renda de quem vai compor o financiamento."
      />

      <BotaoCompartilhar desabilitado={!resultado} />
    </form>
  )
}

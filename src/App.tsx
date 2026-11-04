// Interface provisória: a UI (formulário, tabela e gráficos) vem na próxima etapa.
// Por enquanto ela só prova que o módulo de cálculo funciona no navegador.
import { formatarBRL, simular } from './lib/financiamento'

const exemplo = simular({
  valorImovel: 400_000_00,
  entrada: 80_000_00,
  taxaAnual: 0.1149,
  prazoMeses: 360,
  rendaMensal: 15_000_00,
})

export default function App() {
  return (
    <main className="mx-auto max-w-2xl p-6 font-sans text-slate-800">
      <h1 className="text-2xl font-bold">Simulador de financiamento imobiliário</h1>
      <p className="mt-2 text-slate-600">Em construção. Exemplo calculado pelo módulo de cálculo:</p>
      <ul className="mt-4 space-y-1">
        <li>1ª parcela SAC: {formatarBRL(exemplo.sac.resumo.primeiraPrestacao)}</li>
        <li>Parcela PRICE: {formatarBRL(exemplo.price.resumo.primeiraPrestacao)}</li>
        <li>Juros a menos no SAC: {formatarBRL(exemplo.comparacao.economiaJurosSac)}</li>
      </ul>
    </main>
  )
}

const TERMOS: { termo: string; explicacao: string }[] = [
  {
    termo: 'SAC',
    explicacao:
      'Sistema de Amortização Constante. A dívida cai o mesmo valor todo mês, então os juros diminuem e a parcela começa mais alta e vai baixando. Custa menos no total.',
  },
  {
    termo: 'PRICE',
    explicacao:
      'Parcela fixa do começo ao fim. No início quase tudo é juros e a dívida demora a cair. A primeira parcela é menor que no SAC, mas o total pago é maior.',
  },
  { termo: 'Amortização', explicacao: 'A parte da parcela que de fato abate a dívida. O resto é juros, seguros e taxa.' },
  { termo: 'Saldo devedor', explicacao: 'Quanto ainda falta pagar ao banco depois de cada parcela.' },
  {
    termo: 'MIP',
    explicacao:
      'Seguro de Morte e Invalidez Permanente. Quita a dívida nesses casos. Calculado sobre o saldo devedor, então diminui com o tempo, e a taxa depende da idade.',
  },
  {
    termo: 'DFI',
    explicacao: 'Seguro de Danos Físicos ao Imóvel (incêndio, desabamento etc.). Calculado sobre o valor do imóvel; fica quase igual o contrato todo.',
  },
  { termo: 'Taxa de administração', explicacao: 'Valor fixo mensal cobrado por alguns bancos para administrar o contrato.' },
  {
    termo: 'CET',
    explicacao:
      'Custo Efetivo Total: a taxa anual que considera tudo que se paga (juros, seguros e taxas). É o número certo para comparar propostas de bancos diferentes.',
  },
  {
    termo: 'Comprometimento de renda',
    explicacao: 'Quanto da renda bruta mensal vai para a parcela. A referência usual dos bancos é até 30%.',
  },
  {
    termo: 'Cota de financiamento',
    explicacao: 'A parte do imóvel que o banco financia, geralmente até 80%. O restante é a entrada.',
  },
  {
    termo: 'Amortização com FGTS',
    explicacao:
      'O saldo do FGTS pode abater a dívida a cada 2 anos. Dá para reduzir o prazo (economiza mais) ou o valor da parcela (alivia o orçamento).',
  },
  {
    termo: 'Evolução de obra (juros de obra)',
    explicacao:
      'Na compra na planta, o banco repassa o dinheiro à construtora conforme a obra avança. Até as chaves, o cliente paga juros sobre o valor já repassado, mais seguros e taxa; esse valor cresce todo mês e não abate a dívida.',
  },
  {
    termo: 'TR',
    explicacao:
      'Taxa Referencial, que corrige o saldo devedor em muitos contratos. Este simulador não a inclui; com TR, os valores reais ficam um pouco maiores.',
  },
]

/** Termos explicados em linguagem de cliente: o corretor pode usar na conversa. */
export function Glossario() {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {TERMOS.map(({ termo, explicacao }) => (
        <div key={termo}>
          <dt className="text-sm font-semibold text-slate-900">{termo}</dt>
          <dd className="text-sm text-slate-600">{explicacao}</dd>
        </div>
      ))}
    </dl>
  )
}

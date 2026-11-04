# Simulador de Financiamento Imobiliário

Simulador que compara os sistemas **SAC** e **PRICE** lado a lado, com tabela de
amortização completa, gráficos e alerta de comprometimento de renda.

Projeto de portfólio feito por um corretor de imóveis que estuda Sistemas para
Internet: a ideia é responder com números a pergunta que todo cliente faz —
*"qual sistema vale mais a pena para mim?"*

> **Em desenvolvimento.** O módulo de cálculo está pronto e testado; a interface
> vem a seguir.

## Funcionalidades

- [x] Cálculo SAC e PRICE com arredondamento ao centavo
- [x] Conversão de taxa anual efetiva/nominal → mensal
- [x] Comparação de juros totais e diferença da 1ª parcela
- [x] Alerta de comprometimento de renda (padrão: 30%)
- [ ] Formulário com validação por campo
- [ ] Tabela de amortização
- [ ] Gráficos de saldo devedor e composição da parcela (Recharts)
- [ ] Link compartilhável com os valores na URL
- [ ] Deploy na Vercel

## Stack

React · TypeScript · Vite · Tailwind CSS · Recharts · Vitest

## Como rodar

```bash
npm install
npm run dev        # servidor de desenvolvimento
npm test           # testes em modo watch
npm run coverage   # testes + relatório de cobertura (mínimo 100% em src/lib)
npm run build      # typecheck + build de produção
```

## Estrutura

```
src/
└── lib/financiamento/   # regras de negócio: funções puras, sem React
    ├── tipos.ts         # Centavos, Parcela, ResumoSistema…
    ├── dinheiro.ts      # reais ↔ centavos, formatação BRL
    ├── taxas.ts         # conversão de taxas
    ├── sac.ts           # tabela SAC
    ├── price.ts         # tabela PRICE
    ├── renda.ts         # comprometimento de renda
    ├── simulacao.ts     # simular(): orquestra tudo para a UI
    └── *.test.ts        # testes ao lado de cada módulo
```

## Exemplo de uso do módulo

```ts
import { formatarBRL, simular } from './lib/financiamento'

const r = simular({
  valorImovel: 400_000_00, // centavos
  entrada: 80_000_00,
  taxaAnual: 0.1149, // 11,49% a.a. efetiva
  prazoMeses: 360,
  rendaMensal: 15_000_00,
})

formatarBRL(r.sac.resumo.primeiraPrestacao) // "R$ 3.802,46"
formatarBRL(r.price.resumo.primeiraPrestacao) // "R$ 3.029,53"
r.comparacao.economiaJurosSac // juros a menos no SAC, em centavos
```

## Decisões técnicas

As escolhas de arquitetura, precisão numérica, arredondamento e testes estão
explicadas em [`docs/DECISOES.md`](docs/DECISOES.md).

## Aviso

Simulação educativa. Não inclui seguros (MIP/DFI), taxa de administração nem
correção pela TR; os valores reais dependem das condições de cada banco.

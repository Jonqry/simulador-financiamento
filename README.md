# Simulador de Financiamento Imobiliário

Simulador que compara os sistemas **SAC** e **PRICE** lado a lado, com tabela de
amortização completa, gráficos e alerta de comprometimento de renda.

Projeto de portfólio feito por um corretor de imóveis que estuda Sistemas para
Internet: a ideia é responder com números a pergunta que todo cliente faz —
*"qual sistema vale mais a pena para mim?"*

![Tela do simulador comparando SAC e PRICE](docs/screenshot.png)

**[Abrir o simulador](https://simulador-financiamento-blush.vercel.app)**

## Funcionalidades

- [x] Cálculo SAC e PRICE com arredondamento ao centavo
- [x] Conversão de taxa anual efetiva/nominal → mensal
- [x] Comparação de juros totais e diferença da 1ª parcela
- [x] Alerta de comprometimento de renda (padrão: 30%)
- [x] Formulário com validação por campo (aceita "400.000,50" e "11,49")
- [x] Tabela de amortização mês a mês, alternando SAC/PRICE
- [x] Gráficos de saldo devedor e composição da parcela (Recharts)
- [x] Link compartilhável: os valores ficam na URL
- [x] Deploy na Vercel, com prévia do link no WhatsApp/LinkedIn (Open Graph)

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
├── lib/                     # lógica pura, sem React (100% de cobertura)
│   ├── financiamento/       # regras de negócio
│   │   ├── dinheiro.ts      # reais ↔ centavos, formatação BRL
│   │   ├── taxas.ts         # conversão de taxas
│   │   ├── sac.ts, price.ts # tabelas de amortização
│   │   ├── renda.ts         # comprometimento de renda
│   │   └── simulacao.ts     # simular(): orquestra tudo para a UI
│   ├── formulario/          # texto digitado → números; estado ↔ URL
│   └── graficos.ts          # dados prontos para o Recharts
├── hooks/useSimulacao.ts    # estado do formulário sincronizado com a URL
├── components/              # UI (formulário, cartões, tabela, gráficos)
└── App.test.tsx             # testes de integração da interface (jsdom)
```

Os testes ficam ao lado de cada módulo (`*.test.ts`).

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

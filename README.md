# Simulador de Financiamento Imobiliário

Simulador de financiamento para o dia a dia do corretor, com foco no **Minha
Casa, Minha Vida**: enquadra o cliente na faixa pela renda e pelo valor do
imóvel, aplica a taxa sozinha, calcula até quanto ele pode comprar e **reprova**
a simulação quando a parcela não cabe na renda, mostrando o que resolveria.

Projeto de portfólio feito por um corretor de imóveis que estuda Sistemas para
Internet: a ideia é responder com números as perguntas que todo cliente faz —
*"quanto fica a parcela?"* e *"até quanto eu consigo comprar?"*

![Tela do simulador: parcela na PRICE e o carimbo "Cabe na renda"](docs/screenshot.png)

**[Abrir o simulador](https://simulador-financiamento-blush.vercel.app)**

## Funcionalidades

- [x] Enquadramento MCMV/SBPE pela renda **e** pelo valor do imóvel: passou do teto da faixa, sobe de faixa (ex.: R$ 400.000 é Faixa 3; R$ 400.001, Faixa 4)
- [x] Taxa automática pela faixa, região e FGTS, com taxa manual (a da proposta do banco) por cima
- [x] Cliente com imóvel no nome vai direto para o SBPE; teto das Faixas 1 e 2 ajustável pela cidade
- [x] Idade do comprador mais velho limita o prazo (idade + prazo até 80 anos e 6 meses)
- [x] Conferido com a Simulação Completa da Caixa: juros e amortização batem centavo por centavo
- [x] PRICE em destaque no MCMV e SAC no SBPE; o outro sistema aparece ao comparar
- [x] Reprovação pela renda: o resultado vira "Não aprovado" com o imóvel máximo, a entrada e a renda que resolveriam, e o envio ao cliente fica bloqueado
- [x] Modo "Quanto posso comprar": imóvel máximo pela renda, já na faixa certa do MCMV
- [x] Entrada com FGTS e subsídio, ou em percentual do imóvel ("20%")
- [x] Prazo em meses ou anos, taxa efetiva ou nominal e limite de renda editável
- [x] Cálculo SAC e PRICE com arredondamento ao centavo
- [x] Conversão de taxa anual efetiva/nominal → mensal
- [x] Comparação de juros totais e diferença da 1ª parcela
- [x] Alerta de comprometimento de renda (padrão: 30%)
- [x] Formulário com validação por campo (aceita "400.000,50" e "11,49")
- [x] Tabela de amortização mês a mês, alternando SAC/PRICE
- [x] Gráficos de saldo devedor e composição da parcela (Recharts)
- [x] Link compartilhável: os valores ficam na URL
- [x] Deploy na Vercel, com prévia do link no WhatsApp/LinkedIn (Open Graph)
- [x] Seguros MIP e DFI, taxa de administração e CET estimado
- [x] Amortização extra (FGTS): reduzir prazo × reduzir parcela, única ou recorrente
- [x] Testes de ponta a ponta com Playwright, no CI e após cada deploy
- [x] Imóvel máximo que o cliente pode comprar (e se quem limita é a renda ou a entrada)
- [x] Taxa de referência pela renda: faixas do Minha Casa, Minha Vida ou taxas de mercado
- [x] Resumo pronto para WhatsApp e glossário dos termos
- [x] Cota de financiamento editável (até 90%) e prazo de até 35 anos
- [x] Imóvel na planta: encargos de evolução de obra até as chaves, com gráfico
- [x] Envio do resumo direto pelo WhatsApp e barra de resultado fixa no celular

## Stack

React · TypeScript · Vite · Tailwind CSS · Recharts · Vitest · Playwright

## Como rodar

```bash
npm install
npm run dev        # servidor de desenvolvimento
npm test           # testes em modo watch
npm run coverage   # testes + relatório de cobertura (mínimo 100% em src/lib)
npm run build      # typecheck + build de produção
npm run e2e        # testes de ponta a ponta (sobe o build local)
npm run e2e:producao  # os mesmos testes contra o site publicado
```

Na primeira vez, instale o navegador do Playwright: `npx playwright install chromium`.

## Estrutura

```
src/
├── lib/                     # lógica pura, sem React (100% de cobertura)
│   ├── financiamento/       # regras de negócio
│   │   ├── dinheiro.ts      # reais ↔ centavos, formatação BRL
│   │   ├── taxas.ts         # conversão de taxas
│   │   ├── motor.ts         # motor único de amortização (+ pagamentos extras)
│   │   ├── sac.ts, price.ts # os dois sistemas, como casos do motor
│   │   ├── encargos.ts      # seguros MIP/DFI e taxa de administração
│   │   ├── cet.ts           # taxa interna de retorno e CET
│   │   ├── capacidade.ts    # imóvel máximo pela renda e pela entrada
│   │   ├── obra.ts          # fase de obra (imóvel na planta)
│   │   ├── renda.ts         # comprometimento de renda
│   │   └── simulacao.ts     # simular(): orquestra tudo para a UI
│   ├── formulario/          # texto digitado → números; estado ↔ URL; montar a simulação da tela
│   ├── taxasReferencia.ts   # tabela MCMV, tetos e enquadramento (com fonte e data)
│   ├── imovelPelaRenda.ts   # imóvel máximo pela renda, faixa por faixa
│   ├── resumoCliente.ts     # texto do resumo para WhatsApp
│   └── graficos.ts          # dados prontos para o Recharts
├── hooks/useSimulacao.ts    # estado do formulário sincronizado com a URL
├── components/              # UI (formulário, cartões, tabela, gráficos)
└── App.test.tsx             # testes de integração da interface (jsdom)
e2e/                         # testes de ponta a ponta (Playwright)
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

Simulação educativa. Seguros e taxa usam os valores informados (os padrões são
exemplos); o cálculo não inclui correção pela TR nem custos de contratação. Os
valores reais dependem das condições de cada banco.

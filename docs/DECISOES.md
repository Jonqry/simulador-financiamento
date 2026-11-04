# Decisões técnicas

Registro das escolhas do projeto e do porquê de cada uma. Serve de roteiro para
explicar o projeto em entrevista: cada seção responde a uma pergunta que um
avaliador provavelmente vai fazer.

---

## 1. Por que começar pelas funções de cálculo, e não pela tela?

O valor do simulador está nos números. Se a parcela estiver errada, a UI mais
bonita do mundo não salva o projeto. Por isso o cálculo vive em
`src/lib/financiamento/` como **funções puras**: recebem dados, devolvem dados,
não acessam React, DOM, URL nem `localStorage`.

Consequências práticas:

- **Testável sem navegador.** Os testes rodam em ~1 s com Vitest em Node.
- **A UI fica burra.** Componentes só formatam e exibem o que `simular()` devolve.
- **Reaproveitável.** O mesmo módulo poderia rodar num backend ou num app mobile.

> Na entrevista: *"Separei regra de negócio de apresentação. O domínio é
> testado isoladamente com 100% de cobertura; a UI só consome."*

## 2. Por que dinheiro em centavos (inteiros)?

`0.1 + 0.2` em JavaScript dá `0.30000000000000004`. Em 360 parcelas, esse tipo
de erro se acumula e o saldo final não fecha em zero.

Decisão: **todo valor monetário dentro do módulo é um inteiro em centavos**
(tipo `Centavos`). A conversão acontece só nas bordas:

- entrada: `reaisParaCentavos(1234.56)` → `123456`
- saída: `formatarBRL(123456)` → `"R$ 1.234,56"`

Taxas continuam `number` (decimais), porque não são dinheiro. Os juros de cada
mês são calculados em ponto flutuante e **arredondados ao centavo na hora**,
como um banco faz no boleto.

**Alternativa considerada:** bibliotecas de decimal (`decimal.js`, `big.js`).
Dariam precisão arbitrária, mas adicionam dependência e verbosidade
(`a.plus(b).times(c)`). Para valores de até alguns milhões de reais, inteiros
em centavos cabem com folga no `Number.MAX_SAFE_INTEGER` (≈ 90 trilhões de
reais), então a solução simples basta.

**Caso real que apareceu no desenvolvimento:** em `rendaMinimaNecessaria`,
`21 / 0.35` dá `60.00000000000001`, e `Math.ceil` devolveria 61. A correção
(`toFixed(6)` antes do `ceil`) tem um teste com esse caso exato.

## 3. Taxa anual efetiva × nominal

Bancos divulgam as duas. A conversão correta depende de qual é:

| Taxa informada         | Mensal                    | 12% a.a. vira |
| ---------------------- | ------------------------- | ------------- |
| Efetiva (padrão do app) | `(1 + a)^(1/12) - 1`      | 0,9489% a.m.  |
| Nominal                | `a / 12`                  | 1,0000% a.m.  |

O erro clássico é dividir a efetiva por 12, o que superestima os juros.
`simular()` assume **efetiva**; as duas conversões estão disponíveis em
`taxas.ts` caso a UI ofereça a escolha depois.

## 4. As fórmulas

**SAC** — amortização constante:

```
amortização = P / n
juros_k     = saldo_(k-1) × i
prestação_k = amortização + juros_k        (decrescente)
```

**PRICE** — prestação constante (anuidade):

```
PMT         = P × i / (1 - (1 + i)^-n)
juros_k     = saldo_(k-1) × i
amortização = PMT - juros_k                (crescente)
```

Com `i = 0` a fórmula da PRICE vira `0/0`; o código trata esse caso à parte
(`PMT = P / n`) e há teste para isso.

## 5. A regra de arredondamento é parte da especificação

Arredondar a cada parcela faz sobrar ou faltar centavos no fim. As regras:

- **SAC:** amortização base com `Math.floor(P / n)`. O `floor` garante que as
  `n - 1` primeiras nunca somem mais que o principal; a última parcela absorve
  a sobra (no máximo `n - 1` centavos).
- **PRICE:** a prestação é arredondada ao centavo e a última parcela quita o
  saldo exato (detalhes abaixo).
- Nos dois sistemas a **última parcela zera o saldo**, sempre.

Um teste conferido fora do código (Python com `Decimal`) mostrou que, sem
saber a regra, você erra a 1ª parcela do SAC por 1 centavo (R$ 3.802,47 ×
R$ 3.802,46). Por isso o teste documenta a regra explicitamente.

### O ajuste da última parcela da PRICE não é "de centavos"

Eu esperava que a última parcela diferisse das outras por poucos centavos. A
conferência com uma implementação independente mostrou outra coisa:

| Cenário: R$ 320 mil, 360 meses, 11,49% a.a. | Valor        |
| ------------------------------------------- | ------------ |
| Prestação exata (fórmula)                   | R$ 3.029,5337 |
| Prestação cobrada (arredondada)             | R$ 3.029,53  |
| Última parcela                              | R$ 3.040,38  |

Todo mês o cliente paga 0,37 centavo a menos que o exato. Essa diferença fica
no saldo devedor e **rende juros por 30 anos**, então no fim vira R$ 10,85. O
erro máximo é `0,5 centavo × ((1 + i)^n − 1) / i` (o fator de acumulação de uma
série de pagamentos), e há um teste que verifica esse limite.

Alternativas consideradas:

- *Arredondar a prestação para cima:* a última fica menor em vez de maior. O
  desvio continua existindo, só muda de sinal.
- *Alternar 302953/302954 para acompanhar o valor exato:* elimina o desvio,
  mas a "prestação fixa" deixa de ser fixa, o que confunde mais que ajuda.
- *Manter e explicar* (escolhida): é o comportamento esperado de um cálculo ao
  centavo, a UI pode mostrar a última parcela separada na tabela.

## 6. Estratégia de testes

Três camadas, do mais concreto ao mais geral:

1. **Exemplos conferíveis à mão.** R$ 1.000 a 1% a.m. em 3 meses: a tabela
   inteira está escrita no teste. Qualquer pessoa confere na calculadora.
2. **Valores de referência.** O exemplo clássico de livro (R$ 100 mil, 1% a.m.,
   10 meses → PMT de R$ 10.558,21) e a fórmula fechada de juros do SAC
   (`P·i·(n+1)/2`).
3. **Invariantes em vários cenários** (`describe.each` × `it.each`): para
   qualquer entrada válida, nos dois sistemas,
   - soma das amortizações = principal (ao centavo);
   - saldo final = 0, e nunca negativo nem crescente;
   - prestação = juros + amortização em toda linha;
   - SAC paga menos juros e começa com parcela maior que a PRICE.

Os cenários incluem extremos: prazo de 1 mês, prazo máximo (420), taxa zero
e principal de 1 centavo. Um desses (13 centavos em 8 meses, taxa zero)
revelou que a PRICE podia deixar saldo negativo antes da última parcela; o
`Math.min` em `price.ts` existe por causa dele.

A cobertura exigida é **100%** para `src/lib` (configurado em
`vite.config.ts`): se alguém adicionar um `if` sem teste, o `npm run coverage`
falha.

> Próximo passo natural: testes baseados em propriedades com `fast-check`, que
> gera milhares de entradas aleatórias para os mesmos invariantes.

## 7. Dois tipos de validação

- **`validarSimulacao()`** — para o usuário. Devolve `{ campo: mensagem }`
  sem lançar exceção, para a UI mostrar o erro ao lado de cada input.
- **`assertParametrosValidos()`** — para o programador. Lança `RangeError`
  se `calcularSAC`/`calcularPRICE` recebem lixo. Se isso acontecer, é bug de
  quem chamou, não erro do usuário.

## 8. Alerta de comprometimento de renda

Bancos costumam limitar a prestação a cerca de **30% da renda bruta**. A regra
varia por instituição, então o limite é um parâmetro (padrão 30%), com uma
faixa de atenção de 5 pontos percentuais antes dele:

| Nível     | Faixa (padrão) |
| --------- | -------------- |
| `ok`      | até 25%        |
| `atencao` | 25% a 30%      |
| `acima`   | acima de 30%   |

O comprometimento é avaliado sobre a **maior** prestação de cada sistema. No
SAC é a primeira — e é justamente aí que o SAC costuma "não caber" mesmo sendo
mais barato no total. O teste `o SAC pode estourar o limite de renda enquanto a
PRICE cabe` mostra esse trade-off, que é o insight mais útil do simulador para
quem compra um imóvel.

## 9. Nomes em português

O domínio é brasileiro: SAC, Tabela PRICE, saldo devedor, amortização. Traduzir
para inglês (`outstandingBalance`?) criaria uma camada de tradução mental entre
o código e a conversa com quem entende do negócio. Uso a **linguagem do
domínio** (ideia de *ubiquitous language* do DDD) e mantenho em inglês só o que
é vocabulário técnico do ecossistema.

## 10. Ferramentas

| Ferramenta     | Por quê                                                             |
| -------------- | ------------------------------------------------------------------- |
| Vite           | Dev server instantâneo, build simples; padrão atual para SPA React. |
| TypeScript strict + `noUncheckedIndexedAccess` | `parcelas[0]` passa a ser `Parcela \| undefined`, forçando tratar tabela vazia. |
| Vitest         | Usa a mesma config do Vite, API compatível com Jest, rápido.        |
| Tailwind       | Estilo sem alternar entre arquivos; design consistente.            |
| Recharts       | Gráficos declarativos em React, suficiente para linha e área.      |
| Testing Library + jsdom | Testa a interface como o usuário usa: acha campos pelo rótulo, digita, confere o texto. |
| GitHub Actions | Testes, cobertura, typecheck e build a cada push na `main`.         |

---

# Interface

## 11. O formulário guarda texto, não número

O estado de cada campo é a **string digitada** (`ValoresFormulario`), e a
conversão para número acontece em `converter()`, fora do componente.

Por quê: enquanto a pessoa digita "11,49", o campo passa por "11," — que não é
um número. Se o estado fosse `number`, esse valor intermediário se perderia ou
viraria `NaN` e apagaria o que ela escreveu. Com string, o input mostra
exatamente o que foi digitado e o erro aparece ao lado.

Também por isso o input é `type="text"` com `inputMode="decimal"`, e não
`type="number"`: o `number` não aceita "400.000,50", muda o valor com a rodinha
do mouse e se comporta diferente em cada navegador. O `inputMode` ainda abre o
teclado numérico no celular.

**Alternativa considerada:** React Hook Form + Zod. Ótimos para formulários
grandes com envio. Aqui são 5 campos, sem envio, recalculando a cada tecla; um
`useState` e uma função pura de validação resolvem com menos código e sem
dependência. Se o formulário crescer (seguros, FGTS, amortização extra), é a
primeira coisa que eu adicionaria.

## 12. Leitura de número brasileiro

`parseNumeroBR` aceita "400.000", "400.000,50", "11,49" e também "11.49" (quem
cola de outro site). A regra está documentada no código e tem um caso
ambíguo assumido: "1.234" vira 1234, como um brasileiro leria. Há um teste de
ida e volta: tudo que `formatarNumeroBR` escreve, `parseNumeroBR` lê de volta
igual.

## 13. Dois tipos de erro, uma mensagem por campo

`converter()` junta erros de **formato** ("abc" → "Digite um número válido") e
de **regra** do módulo de cálculo ("A entrada precisa ser menor que o valor do
imóvel"). Se um campo tem os dois, o de formato vence, porque é o mais útil.

O erro fica ligado ao input por `aria-invalid` e `aria-describedby`, então
leitores de tela anunciam a mensagem quando o campo recebe foco. Enquanto
houver erro, o resultado some e o botão de compartilhar fica desabilitado: não
faz sentido mostrar números de uma simulação que não existe.

## 14. A URL como estado compartilhável

O link `?valor=400000&entrada=80000&taxa=11.49&prazo=360&renda=15000` reproduz
a simulação. Decisões:

- **`history.replaceState`, não `pushState`.** O `push` criaria uma entrada no
  histórico a cada tecla; o botão "voltar" do navegador viraria um "desfazer"
  caractere por caractere.
- **Sem React Router.** O app tem uma página só. A URL é lida uma vez no
  `useState` inicial e reescrita num `useEffect`. Router seria dependência
  para resolver um problema que não existe.
- **Dois formatos de número.** Na URL, formato de máquina (`11.49`, lido com
  `Number()`), que é inequívoco. No input, formato brasileiro (`11,49`).
  Misturar os dois daria ambiguidade: `1.234` na URL seria 1,234 ou 1234?
- **Link quebrado não quebra a tela.** Parâmetro ausente ou inválido cai no
  valor padrão, e parâmetros desconhecidos (`utm_source` do WhatsApp) são
  ignorados.
- **Nomes curtos em português** (`valor`, `taxa`, `prazo`): o link fica
  legível quando um corretor manda para o cliente.

## 15. Desempenho: `useDeferredValue` e lazy loading

Cada tecla recalcula 2 tabelas de até 420 linhas e redesenha 2 gráficos.

- **`useDeferredValue`** (React 18+): os erros são calculados com o valor
  atual (feedback imediato no campo), e o resultado pesado com um valor
  "adiado", que o React processa com prioridade menor. O input nunca trava.
- **`useMemo`** nos dados dos gráficos: só recalcula quando o resultado muda,
  não quando o usuário troca o sistema da tabela.
- **Animação dos gráficos desligada:** os dados mudam a cada tecla, e a
  animação só atrasaria a leitura.
- **Gráficos carregados sob demanda** (`React.lazy` + `Suspense`). O Recharts é
  ~60% do JavaScript. Sem isso, o build avisava que o bundle passava de 500 kB.
  Agora a página principal tem ~239 kB e o chunk dos gráficos (~382 kB) baixa
  em seguida, com um esqueleto no lugar.
  *Tentativa que não funcionou:* separar o Recharts com `manualChunks`. O Vite
  passou a adicionar `<link rel="modulepreload">` para ele no `index.html`,
  ou seja, baixava tudo de cara de novo. A solução foi um único ponto de
  entrada (`graficos/Graficos.ts`) importado pelos dois `lazy()`.
- **Sem virtualização na tabela.** 420 linhas renderizam rápido; `react-window`
  só compensaria com milhares.

## 16. Cores e acessibilidade dos gráficos

- **Paleta validada para daltonismo**: SAC azul `#2a78d6`, PRICE laranja
  `#eb6834` (azul × laranja continua bem distinto com protanopia e
  deuteranopia, ao contrário de verde × vermelho). Verifiquei com um script de diferença perceptual (ΔE em
  OKLab sob simulação de daltonismo) em vez de escolher no olho.
- **A cor segue o sistema.** SAC é azul em todo lugar: cartão, gráfico,
  seletor. Juros e amortização usam outras cores (violeta e aqua) para não
  serem confundidos com SAC/PRICE.
- **Cores de status reservadas** (verde/amarelo/vermelho) só para o alerta de
  renda, e sempre com ícone + texto ("Acima do limite"), nunca cor sozinha.
- **Texto nunca na cor da série**: valores e legendas são cinza-escuro; a
  identidade vem da bolinha colorida ao lado.
- **A tabela é a alternativa acessível aos gráficos**: cada `<figure>` tem uma
  legenda para leitores de tela apontando para ela.

## 17. Testes da interface

`App.test.tsx` roda em jsdom com Testing Library e testa **comportamento**, não
implementação: encontra campos pelo rótulo (`getByLabelText('Prazo')`), digita
com `userEvent` e confere o que aparece na tela e na URL. Cobre: valores
padrão, abrir link compartilhado, URL atualizando, erro no campo, alerta de
renda, troca SAC/PRICE na tabela e o botão de copiar.

A cobertura de 100% continua exigida só em `src/lib`, onde estão as regras. Os
componentes são cobertos pelos testes de integração, sem meta numérica: forçar
100% em UI costuma gerar testes frágeis que verificam classe CSS.

Detalhe: o jsdom não tem `ResizeObserver`, que o Recharts usa; o teste define
um substituto vazio.

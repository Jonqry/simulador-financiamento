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

---

# Publicação

## 18. Deploy e prévia do link

- **Vercel conectada ao GitHub:** cada push na `main` publica sozinho; o CI
  roda em paralelo no GitHub Actions. Não precisou de `vercel.json`: a Vercel
  detecta Vite (`npm run build`, pasta `dist`), e o app tem uma rota só.
- **Teste no site publicado** (não só local): mesmos valores e mesmos arquivos
  com hash do build local; link com parâmetro inválido (`valor=abc`) cai no
  padrão; `utm_source` é ignorado; depois de ~20 teclas o histórico do
  navegador continua com uma entrada só (prova do `replaceState`).
- **Open Graph:** sem essas tags, o link colado no WhatsApp ou no LinkedIn
  aparece cru. Agora sai com título, descrição e uma imagem 1200×630 gerada a
  partir das curvas reais do cenário padrão. As URLs nas tags são absolutas
  porque quem as lê é o robô de cada rede, que não resolve caminho relativo.
- **Limitação conhecida:** a prévia é a mesma para qualquer simulação. Uma
  prévia com os números do link exigiria gerar a imagem no servidor (ex.:
  função serverless com `@vercel/og`), já que os robôs não executam
  JavaScript. Fica como ideia de evolução.

---

# Versão 2: seguros, CET, amortização extra e E2E

## 19. Um motor só para SAC e PRICE (refatoração com rede de segurança)

Para suportar pagamentos extras, SAC e PRICE precisariam da mesma lógica
nova duas vezes. Em vez disso, criei `gerarTabela(sistema, params, opções)`
em `motor.ts`: os dois sistemas diferem só na regra da amortização regular
(fixa no SAC; prestação menos juros na PRICE). Juros, arredondamento,
última parcela e extras ficam num lugar só.

A refatoração foi feita **com os testes antigos como rede de segurança**:
`calcularSAC` e `calcularPRICE` viraram três linhas que chamam o motor, e os
144 testes existentes passaram sem nenhuma alteração. Um teste novo afirma
que, sem extras, o motor é idêntico às versões anteriores.

## 20. Encargos separados da amortização

Seguros e taxa **não mudam a dívida**, só o valor pago. Por isso
`aplicarEncargos()` recebe uma tabela já pronta e acrescenta MIP, DFI, taxa
e total em cada linha. A mesma função serve para SAC, PRICE e os cenários
com extra, sem repetir código.

- **MIP** incide sobre o saldo devedor do mês (antes do pagamento): cai com a dívida.
- **DFI** incide sobre o valor do imóvel: fica constante.
- **Taxa de administração**: valor fixo em reais.

Os valores padrão (MIP 0,025% a.m., DFI 0,01% a.m., R$ 25) são **exemplos**.
O MIP depende da idade e cada banco tem sua tabela, então o formulário avisa
para usar os números do contrato. O comprometimento de renda passou a usar a
parcela **total**, que é o que o banco considera.

## 21. CET por taxa interna de retorno

CET é a taxa que iguala o valor liberado ao valor presente de tudo que se
paga. Não tem fórmula fechada, então é resolvido numericamente.

- **Bissecção, não Newton-Raphson.** Newton converge mais rápido, mas pode
  divergir com um chute ruim. Aqui a função é monótona (mais taxa, menor
  valor presente), então a bissecção sempre converge; 100 iterações levam
  menos de 1 ms.
- **Conferido com outro método:** a implementação independente em Python
  usou o método da secante e chegou aos mesmos valores (12,19% SAC, 12,12% PRICE).
- **Teste de sanidade:** sem seguros e taxa, o CET tem de dar a própria taxa
  de juros (11,49%), e dá, a menos do arredondamento.
- **Simplificação assumida:** o CET oficial (Resolução CMN 3.517) inclui
  custos de contratação (avaliação, registro, tarifas), que o simulador não pede.

**Descoberta que virou explicação na tela:** com os valores padrão, o CET da
PRICE (12,12%) sai *menor* que o do SAC (12,19%), mesmo a PRICE custando
R$ 251 mil a mais. Não é bug: DFI e taxa são valores fixos, e na PRICE a
dívida fica alta por mais tempo, então esses custos pesam menos *em
proporção*. CET é taxa, não total. A interface mostra essa explicação
quando o caso acontece, para ninguém escolher a PRICE achando que é mais barata.

## 22. Amortização extra: prazo × parcela

O usuário informa valor, mês e repetição (uma vez, todo ano ou a cada 2 anos,
que é o intervalo mínimo do FGTS). O simulador calcula os **dois modos nos
dois sistemas** e mostra uma tabela 2×2 com economia, prazo final e parcela
depois do extra.

- **Reduzir prazo:** mantém a regra da parcela; a dívida acaba antes.
- **Reduzir parcela:** depois de cada extra, recalcula a parcela para o
  prazo restante (SAC: saldo ÷ meses restantes; PRICE: nova anuidade).
- O extra nunca passa do saldo; um extra gigante simplesmente quita o contrato.

**Teste que estava errado, não o código:** eu afirmei que no modo "reduzir
parcela" o prazo nunca muda. O teste falhou: com R$ 20 mil a cada 2 anos, os
próprios extras quitam a dívida antes (em 240 meses no SAC). Corrigi a
afirmação do teste, que agora diz o que de fato vale, e adicionei outro
mostrando que, com **um** extra só, o prazo se mantém.

No celular, a tabela 2×2 vira um cartão por sistema, para não precisar de
rolagem lateral.

## 23. Formulário com campos opcionais

`EntradaSimulacao` continua **plana** (sem objetos aninhados): cada campo do
formulário é uma chave, e os erros usam as mesmas chaves. A conversão texto
→ número virou uma **tabela de configuração** (unidade, obrigatório, valor
padrão por campo) em vez de um `if` por campo: campo novo = uma linha.

Seguros e extra ficam em seções recolhíveis com `<details>` nativo
(acessível sem JavaScript). Campos opcionais vazios valem zero. No link, os
campos de extra só entram quando há valor extra, para o link padrão
continuar curto.

## 24. Testes de ponta a ponta (Playwright)

Vitest garante os números; Playwright garante que **o site funciona num
navegador de verdade**: build de produção, carregamento sob demanda dos
gráficos, URL, área de transferência, tags de prévia.

- **8 cenários × 2 dispositivos** (desktop e celular Pixel 7, ambos Chromium,
  para o CI instalar um navegador só).
- **Dois jeitos de rodar:** sem `BASE_URL`, o Playwright sobe o build local
  (`vite preview`), que é o que o CI faz a cada push; com `BASE_URL`, testa
  um site já publicado.
- **Após cada deploy de produção:** o workflow `e2e-producao.yml` roda a
  cada push na `main`, **espera o deploy daquele commit entrar no ar** e só
  então testa o domínio público. Para saber qual versão está no ar, o build
  grava o commit numa meta tag (`<meta name="versao">`, a partir da variável
  `VERCEL_GIT_COMMIT_SHA` da Vercel); o workflow consulta o site a cada 10 s,
  por até 10 minutos. Com `concurrency`, um push novo cancela a espera do
  anterior, cujo deploy nunca vai aparecer.

  *Primeira tentativa que não funcionou:* escutar o evento
  `deployment_status`, que a integração da Vercel costuma publicar no GitHub.
  Depois do push, conferi a página de deployments do repositório: 404. Este
  projeto não publica deployments no GitHub, então o workflow nunca
  dispararia. A solução da meta tag não depende de integração nenhuma:
  funciona com qualquer hospedagem.

**O primeiro E2E já pegou um bug real.** A seção "Amortização extra" abria
quando havia erro (`open={temErro}`), e quando a pessoa corrigia o erro o
React tirava o atributo `open`, fechando a seção no meio do preenchimento. O
teste no jsdom não pegou porque lá nada fica invisível: o Playwright tentou
escolher uma opção num `<select>` que tinha sumido da tela. A correção (abrir
via `ref` quando surge erro, nunca fechar sozinho) veio com um teste de
regressão no Vitest e está num commit próprio (`fix:`).

---

# Versão 3: ferramentas para o corretor

## 25. Imóvel máximo (capacidade de compra)

A pergunta do dia a dia do corretor é "até quanto posso mostrar para esse
cliente?". O simulador responde para SAC e PRICE e diz **o que limita**:

- **Renda:** a maior parcela (com seguros e taxa) chegaria a 30% da renda.
- **Entrada:** o banco financia até 80% do imóvel, então a entrada E permite
  imóvel de até E ÷ 0,2. Sem entrada, não dá para financiar.

**Busca binária em vez de fórmula.** Dá para escrever uma fórmula
aproximada, mas a parcela depende do arredondamento mês a mês, do MIP (sobre
o saldo) e do DFI (sobre o valor do imóvel, que cresce junto com o
financiamento). Em vez de aproximar, a busca testa valores com o **mesmo**
cálculo da simulação. Como a parcela cresce com o valor financiado, ~35
passos bastam, e o invariante da busca (o valor atual sempre cabe) garante
que o resultado nunca passa do limite. O teste prova que é o máximo: o valor
encontrado cabe, e 1 centavo a mais já não cabe.

Conferido com uma implementação independente em Python, que usa outro
método (varredura com refinamento decimal).

## 26. Taxa de referência pela renda (MCMV e mercado)

Taxas mudam, e cada banco tem a sua. Por isso:

- **Dados isolados num arquivo só** (`taxasReferencia.ts`), com a fonte e a
  data. Atualizar é trocar números ali.
- **Sugestão, nunca automática.** A tela mostra a faixa, a taxa e o teto do
  imóvel, e o usuário clica em "usar". Aplicar sozinho esconderia uma
  decisão que depende do banco e da análise de crédito.
- **Até R$ 13 mil de renda:** tabela do Minha Casa, Minha Vida por faixa,
  região (N/NE ou S/SE/CO) e se é cotista do FGTS. Avisa quando o imóvel
  passa do teto da faixa.
- **Acima disso:** faixa de taxas de mercado (de 10,26% a 15% a.a. + TR em
  nov/2026).
- **Padrões conservadores:** "não cotista" (taxa mais alta) e Norte/Nordeste
  (o projeto nasceu em Recife; é um seletor, fácil de trocar).
- Região e cotista ficam fora da URL e do cálculo: servem só para escolher a
  linha da tabela.

Fontes: quadro de juros do MCMV do Ministério das Cidades (atualizado em
28/10/2026), faixas da Portaria MCID 333/2026 e taxas "a partir de" dos
bancos em nov/2026. As fontes secundárias divergiam em detalhes (ex.: Faixa 2
"cerca de 6,5%" numa e "4,75% a 5,5%" noutra); usei a tabela completa por
renda, que bate com o exemplo oficial do governo (renda de R$ 4.900 → 6,5%).

## 27. Resumo para WhatsApp e glossário

- **Resumo para o cliente:** o botão monta um texto com imóvel, entrada,
  parcelas, total pago, economia do SAC, economia com FGTS (se houver) e o
  link. Usa o negrito do WhatsApp (`*texto*`). É uma função pura
  (`gerarResumoCliente`), testada com o texto completo esperado.
- **Sem a renda do cliente no texto:** a mensagem pode ser encaminhada, e
  renda é dado pessoal. Há um teste só para isso.
- **Glossário** em linguagem de cliente (SAC, PRICE, MIP, DFI, CET, cota, TR
  etc.), para o corretor usar na conversa. Inclui a TR, que o simulador não
  calcula, para deixar essa limitação clara.

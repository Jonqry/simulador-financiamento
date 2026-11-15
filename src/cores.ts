/**
 * Cores dos gráficos (Recharts precisa dos valores em JS). As cores de SAC e
 * PRICE também estão em src/index.css (@theme) para as classes do Tailwind
 * (bg-sac etc.).
 *
 * Mesma família visual do portfólio: azul de planta, terracota, grafite,
 * marca-texto amarelo e cinza de cota. Paleta validada para daltonismo
 * (diferença perceptual ΔE ≥ 8 entre pares vizinhos sob
 * protanopia/deuteranopia/tritanopia). SAC e PRICE nunca mudam de cor entre
 * gráficos: a cor segue o sistema, não a posição.
 *
 * Nas áreas empilhadas, `*Contorno` é a linha (e a cor da legenda) e o valor
 * base é o preenchimento: o amarelo puro some sobre o papel claro, então a
 * linha usa um dourado mais escuro.
 */
export const CORES = {
  sac: '#1e5a8c',
  price: '#c4572a',
  amortizacao: '#22292b',
  juros: '#f5d547',
  jurosContorno: '#a8840f',
  encargos: '#b4bfc2',
  encargosContorno: '#8d9a9e',
  grade: '#d9e0dc',
  eixo: '#55636a',
} as const

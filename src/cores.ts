/**
 * Cores dos gráficos (Recharts precisa dos valores em JS). Os mesmos valores
 * estão em src/index.css (@theme) para as classes do Tailwind (bg-sac etc.).
 *
 * Paleta validada para daltonismo (diferença perceptual ΔE ≥ 8 entre pares
 * vizinhos sob protanopia/deuteranopia/tritanopia). SAC e PRICE nunca mudam
 * de cor entre gráficos: a cor segue o sistema, não a posição.
 */
export const CORES = {
  sac: '#2a78d6',
  price: '#eb6834',
  amortizacao: '#1baf7a',
  juros: '#6250d6',
  encargos: '#e87ba4',
  grade: '#e2e8f0',
  eixo: '#64748b',
} as const

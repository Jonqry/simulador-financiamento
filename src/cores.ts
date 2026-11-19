/**
 * Cores dos gráficos (Recharts precisa dos valores em JS). As cores de SAC e
 * PRICE também estão em src/index.css (@theme) para as classes do Tailwind
 * (bg-sac etc.).
 *
 * Mesma família da via do cliente: azul-carbono (PRICE), vinho (SAC), tinta,
 * âmbar e cinza. Paleta conferida para daltonismo (ΔE em CIELAB ≥ 27 entre
 * as séries sob protanopia/deuteranopia/tritanopia simuladas). SAC e
 * PRICE nunca mudam de cor entre gráficos: a cor segue o sistema, não a
 * posição.
 *
 * Nas áreas empilhadas, `*Contorno` é a linha (e a cor da legenda) e o valor
 * base é o preenchimento: o âmbar claro some sobre o papel, então a linha usa
 * um tom mais escuro.
 */
export const CORES = {
  sac: '#a3407f',
  price: '#2e43b8',
  amortizacao: '#1f2433',
  juros: '#e9a23b',
  jurosContorno: '#9a6512',
  encargos: '#b9c0cf',
  encargosContorno: '#8b93a7',
  grade: '#dde2ec',
  eixo: '#5b6275',
} as const

/**
 * Lê um número digitado no formato brasileiro.
 *
 * Aceita "400.000", "400000", "400.000,50", "11,49" e também "11.49"
 * (quem cola de outro lugar costuma usar ponto decimal). Regras:
 *
 * 1. Com vírgula: pontos são separador de milhar e a vírgula é decimal.
 * 2. Sem vírgula, se os pontos separam grupos de 3 dígitos ("1.500",
 *    "400.000"), são milhar.
 * 3. Caso contrário um único ponto é decimal ("11.49", "1.5").
 *
 * Ambiguidade conhecida: "1.234" vira 1234 (regra 2), como um brasileiro leria.
 * Devolve null se o texto não for um número.
 */
export function parseNumeroBR(texto: string): number | null {
  const limpo = texto.replace(/R\$|%|\s/g, '')
  if (limpo === '') return null

  let normalizado: string
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(limpo)) {
    normalizado = limpo.replace(/\./g, '').replace(',', '.')
  } else if (/^-?\d+(,\d+)?$/.test(limpo)) {
    normalizado = limpo.replace(',', '.')
  } else if (/^-?\d+\.\d+$/.test(limpo)) {
    normalizado = limpo
  } else {
    return null
  }

  return Number(normalizado)
}

/** Formata para exibir no input: 400000 → "400.000", 11.49 → "11,49". */
export function formatarNumeroBR(valor: number, casasDecimais = 2): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: casasDecimais }).format(valor)
}

import { useEffect, useState } from 'react'
import { formatarBRL, type ResultadoSimulacao, type Sistema } from '../lib/financiamento'

interface BarraResultadoProps {
  resultado: ResultadoSimulacao
  /** Sistemas mostrados, o do destaque primeiro. */
  sistemas: Sistema[]
  reprovado: boolean
  /** id do bloco de resultados: a barra some quando ele aparece na tela. */
  alvoId: string
}

/**
 * Barra fixa no rodapé, só no celular. Lá o formulário ocupa quase duas
 * telas, então quem digita não via a parcela mudar. A barra mostra a 1ª
 * parcela (ou que a renda não passa) o tempo todo e leva aos detalhes com um toque.
 *
 * Some sozinha quando o bloco de resultados entra na tela
 * (IntersectionObserver), para não repetir o que já está visível.
 */
export function BarraResultado({ resultado, sistemas, reprovado, alvoId }: BarraResultadoProps) {
  const [alvoVisivel, setAlvoVisivel] = useState(false)

  useEffect(() => {
    const alvo = document.getElementById(alvoId)
    // Sem IntersectionObserver (navegador muito antigo ou ambiente de teste), a barra fica sempre visível.
    if (!alvo || typeof IntersectionObserver === 'undefined') return
    const observador = new IntersectionObserver(([entrada]) => setAlvoVisivel(entrada?.isIntersecting ?? false))
    observador.observe(alvo)
    return () => observador.disconnect()
  }, [alvoId])

  if (alvoVisivel) return null

  return (
    <aside
      aria-label="Resumo da simulação"
      className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-tinta bg-papel/95 px-4 py-2 backdrop-blur lg:hidden"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        {reprovado ? (
          <p className="text-sm font-bold text-critico">
            <span aria-hidden>✕ </span>Não aprovado pela renda
          </p>
        ) : (
          <dl className="flex gap-4 text-sm">
            {sistemas.map((sistema) => (
              <div key={sistema}>
                <dt className="estreito flex items-center gap-1.5 text-xs text-tinta-suave">
                  <span aria-hidden className={`marcador ${sistema === 'SAC' ? 'bg-sac' : 'bg-price'}`} />
                  {sistema}, 1ª parcela
                </dt>
                <dd className="font-bold tabular-nums">
                  {formatarBRL((sistema === 'SAC' ? resultado.sac : resultado.price).custos.primeiraParcela)}
                </dd>
              </div>
            ))}
          </dl>
        )}
        <a href={`#${alvoId}`} className="botao botao-principal shrink-0 px-3 py-2 text-sm">
          Ver detalhes
        </a>
      </div>
    </aside>
  )
}

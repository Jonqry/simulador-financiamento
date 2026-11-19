/**
 * O carimbo do veredito, como o que o banco bate na proposta. Decorativo: o
 * título ou o alerta ao lado já dizem o mesmo em texto para leitores de tela.
 * A key muda com o veredito, então o carimbo "bate" de novo quando ele vira.
 */
export function Carimbo({ cabe }: { cabe: boolean }) {
  return (
    <span key={String(cabe)} aria-hidden className={`carimbo ${cabe ? 'text-bom' : 'text-critico'}`}>
      {cabe ? 'Cabe na' : 'Não cabe'}
      <br />
      {cabe ? 'renda' : 'na renda'}
    </span>
  )
}

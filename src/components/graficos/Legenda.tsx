/** Legenda própria (no lugar da do Recharts) para controlar texto e layout. */
export function Legenda({ itens }: { itens: { nome: string; cor: string }[] }) {
  return (
    <ul className="estreito mb-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-tinta-suave">
      {itens.map((item) => (
        <li key={item.nome} className="flex items-center gap-1.5">
          <span aria-hidden className="h-[3px] w-5" style={{ backgroundColor: item.cor }} />
          {item.nome}
        </li>
      ))}
    </ul>
  )
}

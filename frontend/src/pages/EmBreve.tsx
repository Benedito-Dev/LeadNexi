import { Construction } from 'lucide-react'
import { ListPageHeader } from '@/components/list-page/ListPageHeader'
import type { TelaPlanejada } from './telasPlanejadas'

/** Cartão "em construção" com o que a tela vai ter, tirado do mapa. */
export function CartaoEmBreve({ tela }: { tela: TelaPlanejada }) {
  return (
    <section className="max-w-3xl rounded-xl border border-dashed border-border bg-card p-6">
      <p className="m-0 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-leadnexi-violet-texto">
        <Construction aria-hidden className="h-4 w-4" strokeWidth={1.75} />
        Em construção · etapa {tela.etapa} do mapa
      </p>
      <h2 className="mb-0 mt-2 text-lg font-extrabold tracking-[-0.02em] text-foreground">O que vai ter aqui</h2>
      <ul className="mb-0 mt-3 flex flex-col gap-2 p-0">
        {tela.itens.map((item) => (
          <li key={item} className="flex items-start gap-3 text-sm font-medium text-muted-foreground">
            <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-leadnexi-violet" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Tela inteira ainda não construída: cabeçalho e o cartão "em construção". */
export function TelaEmBreve({ tela }: { tela: TelaPlanejada }) {
  return (
    <div className="flex w-full flex-col gap-5 font-marca">
      <title>{`${tela.titulo} · LeadNexi`}</title>
      <ListPageHeader icon={tela.icone} title={tela.titulo} summary={tela.resumo} />
      <CartaoEmBreve tela={tela} />
    </div>
  )
}

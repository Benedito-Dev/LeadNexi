import { Columns3, MessagesSquare, RefreshCw, Search } from 'lucide-react'
import { FotoRedonda } from '@/components/ui/foto-redonda'
import { cn } from '@/lib/utils'
import { formatarDecorrido } from '../../hoje/textos'
import { chaveDaConversa, fotoDoLead } from '../api'
import { SeloDoCanal } from './SeloDoCanal'
import { esperandoVoce, FILTROS, type Filtro } from '../filtros'
import type { Conversa } from '../tipos'

type Props = {
  conversas: Conversa[] | null
  filtro: Filtro
  onFiltro: (filtro: Filtro) => void
  busca: string
  onBusca: (busca: string) => void
  /** Chave da conversa aberta (canal + lead) */
  abertaChave: string | null
  onAbrir: (conversa: Conversa) => void
  onAtualizar: () => void
}

/** Coluna da esquerda: busca, filtros em pílulas e as conversas (a mais recente em cima). */
export function ListaDeConversas({ conversas, filtro, onFiltro, busca, onBusca, abertaChave, onAbrir, onAtualizar }: Props) {
  const termo = busca.trim().toLowerCase()
  const visiveis = (conversas ?? []).filter((c) => {
    if (filtro === 'sua-vez' && !esperandoVoce(c)) return false
    if (filtro === 'leads' && c.archived) return false
    if (filtro === 'nao-leads' && !c.archived) return false
    return (
      !termo ||
      c.name.toLowerCase().includes(termo) ||
      (c.instagramUsername ?? '').toLowerCase().includes(termo) ||
      (c.telefone ?? '').replace(/\D/g, '').includes(termo.replace(/\D/g, '') || '§') ||
      (c.lastMessage?.text ?? '').toLowerCase().includes(termo)
    )
  })
  const contagem: Record<Filtro, number> = {
    todas: conversas?.length ?? 0,
    'sua-vez': (conversas ?? []).filter(esperandoVoce).length,
    leads: (conversas ?? []).filter((c) => !c.archived).length,
    'nao-leads': (conversas ?? []).filter((c) => c.archived).length,
  }

  return (
    <aside className="flex min-h-0 flex-col border-border md:border-r">
      <div className="flex flex-col gap-3 border-b border-border p-3">
        <div className="flex items-center gap-2">
          <label className="flex h-10 flex-1 items-center gap-2.5 rounded-xl border border-input bg-background px-3.5 focus-within:border-leadnexi-violet/60">
            <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
            <input
              value={busca}
              onChange={(e) => onBusca(e.target.value)}
              placeholder="Buscar por nome, @ ou mensagem"
              aria-label="Buscar conversa"
              className="h-auto min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-foreground shadow-none outline-none ring-0 placeholder:text-muted-foreground focus:border-0 focus:shadow-none focus:ring-0"
            />
          </label>
          <button type="button" onClick={onAtualizar} aria-label="Atualizar conversas" title="Atualizar" className="grid h-9 w-9 place-items-center rounded-lg text-leadnexi-violet-texto hover:bg-accent">
            <RefreshCw aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto" role="tablist" aria-label="Filtrar conversas">
          {FILTROS.map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              role="tab"
              aria-selected={filtro === valor}
              onClick={() => onFiltro(valor)}
              className={cn(
                'inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs font-semibold transition-colors',
                filtro === valor ? 'bg-leadnexi-violet-600 text-leadnexi-on-accent' : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {rotulo}
              {valor !== 'todas' && contagem[valor] > 0 && <span className={cn('text-[11px] tabular-nums', filtro === valor ? 'opacity-80' : 'opacity-70')}>{contagem[valor]}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        {conversas === null ? (
          <div aria-busy="true" aria-label="Carregando conversas" className="flex flex-col">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <span key={i} className="h-[60px] animate-pulse border-b border-border bg-muted/30" />
            ))}
          </div>
        ) : visiveis.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <MessagesSquare aria-hidden className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <p className="m-0 text-sm font-bold text-foreground">{conversas.length === 0 ? 'Nenhuma conversa ainda' : 'Nada neste filtro'}</p>
            <p className="m-0 text-xs font-medium text-muted-foreground">
              {conversas.length === 0 ? 'Quando alguém mandar direct para a conta conectada, a conversa aparece aqui e vira lead sozinha.' : 'Tente outro filtro ou limpe a busca.'}
            </p>
          </div>
        ) : (
          <ul className="m-0 flex flex-col p-0">
            {visiveis.map((conversa) => (
              <ItemDaLista key={chaveDaConversa(conversa)} conversa={conversa} aberta={chaveDaConversa(conversa) === abertaChave} onAbrir={() => onAbrir(conversa)} />
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}

function ItemDaLista({ conversa, aberta, onAbrir }: { conversa: Conversa; aberta: boolean; onAbrir: () => void }) {
  const ultima = conversa.lastMessage
  const suaVez = esperandoVoce(conversa)
  return (
    <li className="list-none border-b border-border">
      <button
        type="button"
        onClick={onAbrir}
        aria-current={aberta ? 'true' : undefined}
        className={cn('flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors', aberta ? 'bg-accent' : 'hover:bg-accent/50')}
      >
        <span className="relative shrink-0">
          <FotoRedonda src={fotoDoLead(conversa.avatarId)} nome={conversa.name} className="h-10 w-10 bg-leadnexi-violet/15 text-sm text-leadnexi-violet-texto" />
          <SeloDoCanal canal={conversa.canal} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className={cn('min-w-0 flex-1 truncate text-sm', suaVez ? 'font-bold text-foreground' : 'font-medium text-foreground')}>{conversa.name}</span>
            {ultima && <span className={cn('shrink-0 text-[11px] tabular-nums', suaVez ? 'font-bold text-leadnexi-violet-texto' : 'font-medium text-muted-foreground')}>{formatarDecorrido(ultima.createdAt)}</span>}
          </span>
          <span className="mt-0.5 flex items-center gap-2">
            <span className={cn('min-w-0 flex-1 truncate text-[13px]', suaVez ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
              {ultima ? `${ultima.direction === 'sent' ? 'Você: ' : ''}${ultima.text || '(sem texto)'}` : 'Sem mensagens'}
            </span>
            {suaVez ? (
              <span className="grid h-[18px] min-w-[18px] shrink-0 place-items-center rounded-full bg-leadnexi-violet-600 px-1 text-[10px] font-bold text-leadnexi-on-accent" aria-label="Esperando sua resposta">
                1
              </span>
            ) : (
              <span className="inline-flex max-w-[45%] shrink-0 items-center gap-1 truncate rounded px-1 text-[10px] font-semibold text-muted-foreground ring-1 ring-inset ring-border">
                <Columns3 aria-hidden className="h-2.5 w-2.5 shrink-0" strokeWidth={2} />
                <span className="truncate">{conversa.archived ? 'Não é lead' : conversa.stageName}</span>
              </span>
            )}
          </span>
        </span>
      </button>
    </li>
  )
}

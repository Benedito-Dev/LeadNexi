import { useEffect, useState, type FormEvent } from 'react'
import { Hash, Plus, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { addToast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { apagarGrupoDeHashtags, listarGruposDeHashtags, salvarGrupoDeHashtags, type GrupoDeHashtags } from '../api'
import { hashtagsDa } from '../imagens'

const etiqueta = 'inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-[13px] font-semibold transition-colors'

/**
 * Grupos de hashtags salvos: um clique põe o grupo no fim da legenda (sem repetir as que já estão
 * lá). "Salvar as da legenda" guarda as hashtags escritas como um grupo novo.
 */
export function GruposDeHashtags({ legenda, onMudar }: { legenda: string; onMudar: (legenda: string) => void }) {
  const [grupos, setGrupos] = useState<GrupoDeHashtags[]>([])
  const [nomeando, setNomeando] = useState(false)
  const [nome, setNome] = useState('')
  const naLegenda = hashtagsDa(legenda)
  const presentes = new Set(naLegenda.map((tag) => tag.toLowerCase()))

  useEffect(() => {
    listarGruposDeHashtags()
      .then(setGrupos)
      .catch(() => undefined)
  }, [])

  const inserir = (tags: string) => {
    const faltando = tags.split(' ').filter((tag) => tag && !presentes.has(tag.toLowerCase()))
    if (faltando.length === 0) return
    const base = legenda.trimEnd()
    onMudar(`${base}${base ? '\n\n' : ''}${faltando.join(' ')}`)
  }

  const salvar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (!nome.trim()) return
    try {
      const grupo = await salvarGrupoDeHashtags({ name: nome.trim(), tags: naLegenda.join(' ') })
      setGrupos((atuais) => [...atuais.filter((g) => g.id !== grupo.id), grupo])
      setNome('')
      setNomeando(false)
    } catch {
      addToast('error', 'Não foi possível salvar o grupo', 'Tente de novo.')
    }
  }

  const apagar = async (id: string) => {
    try {
      await apagarGrupoDeHashtags(id)
      setGrupos((atuais) => atuais.filter((g) => g.id !== id))
    } catch {
      addToast('error', 'Não foi possível apagar o grupo', 'Tente de novo.')
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Grupos de hashtags</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {grupos.map((grupo) => {
          const todasPresentes = grupo.tags.split(' ').every((tag) => presentes.has(tag.toLowerCase()))
          return (
            <span key={grupo.id} className={cn(etiqueta, 'pr-1', todasPresentes ? 'bg-muted text-muted-foreground' : 'bg-card text-foreground hover:border-leadnexi-violet/60')}>
              <button type="button" onClick={() => inserir(grupo.tags)} title={grupo.tags} className="inline-flex items-center gap-1">
                <Hash aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
                {grupo.name}
              </button>
              <button type="button" aria-label={`Apagar o grupo ${grupo.name}`} onClick={() => void apagar(grupo.id)} className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-leadnexi-danger">
                <X aria-hidden className="h-3 w-3" strokeWidth={2} />
              </button>
            </span>
          )
        })}
        {nomeando ? (
          <form onSubmit={(e) => void salvar(e)} className="flex items-center gap-1.5">
            <Input autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do grupo" maxLength={60} className="h-8 w-40 text-[13px]" />
            <button type="submit" className={cn(etiqueta, 'bg-leadnexi-violet-600 text-leadnexi-on-accent')}>
              Salvar
            </button>
            <button type="button" onClick={() => setNomeando(false)} className={cn(etiqueta, 'text-muted-foreground')}>
              Cancelar
            </button>
          </form>
        ) : (
          naLegenda.length > 0 && (
            <button type="button" onClick={() => setNomeando(true)} className={cn(etiqueta, 'border-dashed text-muted-foreground hover:text-foreground')}>
              <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
              Salvar as {naLegenda.length} da legenda
            </button>
          )
        )}
        {grupos.length === 0 && naLegenda.length === 0 && <span className="text-xs text-muted-foreground">Escreva hashtags na legenda para salvar um grupo.</span>}
      </div>
    </div>
  )
}

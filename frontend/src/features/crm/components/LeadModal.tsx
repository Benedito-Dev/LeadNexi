import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { WhatsAppIcon } from '@/brand/icons'
import { useAuth } from '@/auth/contexto'
import { DeleteDialog } from '@/components/modal/DeleteDialog'
import { MutaseDialog } from '@/components/modal/MutaseDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toE164BR } from '@/lib/phone'
import { cn } from '@/lib/utils'
import { addToast } from '@/lib/toast'
import { adicionarNota, agendarContato, apagarLead, apagarNota, listarAtividades } from '../api'
import { formatarDataHora, situacaoDoContato } from '../datas'
import { ICONE_DA_ETAPA } from '../etapas'
import type { Atividade, Lead, StageType } from '../types'
import { EtiquetaContato } from './EtiquetaContato'
import { LeadForm } from './LeadForm'
import { iconeDaOrigem } from '../origens'

// Verde do WhatsApp com texto escuro por cima (contraste ~7,5:1 nos dois temas)
const botaoWhatsApp =
  'gap-2 bg-chat-wa-accent font-semibold text-chat-wa-accent-foreground no-underline hover:bg-chat-wa-accent/90'

type LeadModalProps = {
  /** Lead aberto; `null` = ficha fechada. */
  lead: Lead | null
  /** Etapa onde o lead está (nome, tipo e cor da coluna); `fechada` = Fechou/Perdido. */
  etapa: { nome: string; tipo: StageType; cor: string; fechada: boolean } | null
  origens: string[]
  onFechar: () => void
  /** Resposta do servidor depois de editar: o quadro mescla no card (a contagem de anotações fica a do quadro). */
  onLeadAtualizado: (lead: Lead) => void
  /** Anotação criada (+1) ou apagada (-1): o card atualiza o contador. */
  onNotasMudaram: (leadId: string, delta: number) => void
  onLeadApagado: (lead: Lead) => void
}

/**
 * Ficha do lead, portada do `EventModal` do Rizar: dados do lead (salvam ao sair do campo),
 * anotações e, no rodapé fixo, apagar, conversar no WhatsApp e fechar.
 */
export function LeadModal({ lead, etapa, origens, onFechar, onLeadAtualizado, onNotasMudaram, onLeadApagado }: LeadModalProps) {
  const { user } = useAuth()
  const [notas, setNotas] = useState<Atividade[]>([])
  const [novaNota, setNovaNota] = useState<{ texto: string; contato: string } | null>(null)
  const [salvandoNota, setSalvandoNota] = useState(false)
  const [notaParaApagar, setNotaParaApagar] = useState<string | null>(null)
  const [apagandoLead, setApagandoLead] = useState(false)
  const [confirmarApagarLead, setConfirmarApagarLead] = useState(false)
  const leadId = lead?.id ?? null

  useEffect(() => {
    if (!leadId) return
    let cancelado = false
    listarAtividades(leadId)
      .then((lista) => !cancelado && setNotas(lista.filter((a) => a.type === 'NOTE')))
      .catch(() => addToast('error', 'Erro ao buscar as anotações'))
    return () => {
      cancelado = true
    }
  }, [leadId])

  if (!lead) return null

  const salvarNota = async () => {
    if (!novaNota?.texto.trim()) {
      addToast('error', 'Preencha o campo da anotação.')
      return
    }
    setSalvandoNota(true)
    try {
      const nota = await adicionarNota(lead.id, novaNota.texto.trim())
      setNotas((atual) => [nota, ...atual])
      onNotasMudaram(lead.id, 1)
      // A data do formulário agenda o próximo contato do lead (no LeadNexi ele é do lead, não da anotação)
      if (novaNota.contato) {
        onLeadAtualizado(await agendarContato(lead.id, new Date(novaNota.contato).toISOString()))
      }
      addToast('success', 'Sucesso', 'Anotação criada com sucesso')
      setNovaNota(null)
    } catch (erro) {
      addToast('error', 'Erro', (erro as Error).message)
    } finally {
      setSalvandoNota(false)
    }
  }

  const confirmarApagarNota = async () => {
    if (!notaParaApagar) return
    try {
      await apagarNota(lead.id, notaParaApagar)
      setNotas((atual) => atual.filter((n) => n.id !== notaParaApagar))
      onNotasMudaram(lead.id, -1)
      addToast('success', 'Anotação apagada')
    } catch {
      addToast('error', 'Não foi possível apagar a anotação')
    } finally {
      setNotaParaApagar(null)
    }
  }

  const confirmarApagarLeadAgora = async () => {
    setApagandoLead(true)
    try {
      await apagarLead(lead.id)
      addToast('success', 'Lead apagado')
      setConfirmarApagarLead(false)
      onLeadApagado(lead)
    } catch (erro) {
      addToast('error', 'Erro', (erro as Error).message || 'Não foi possível apagar o lead')
    } finally {
      setApagandoLead(false)
    }
  }

  const telefoneWhatsApp = toE164BR(lead.phone)
  const contato = etapa?.fechada ? null : situacaoDoContato(lead.followUpAt)
  const origem = lead.source ? { nome: lead.source, ...iconeDaOrigem(lead.source) } : null
  const IconeEtapa = etapa ? ICONE_DA_ETAPA[etapa.tipo] : null

  // Abaixo do nome: onde o lead está, de onde veio e quando é o próximo contato
  // Os três no mesmo formato (altura, cantos, fonte); cada um com a sua cor
  const etiqueta = 'inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 py-0 text-xs font-semibold'
  const resumo = (
    <span className="mt-2 flex flex-wrap items-center gap-2 font-marca">
      {etapa && IconeEtapa && (
        <span
          className={cn(etiqueta, 'text-foreground')}
          style={{
            backgroundColor: `color-mix(in srgb, ${etapa.cor} 15%, transparent)`,
            borderColor: `color-mix(in srgb, ${etapa.cor} 45%, transparent)`,
          }}
          title="Etapa"
        >
          <IconeEtapa className="h-4 w-4 shrink-0" strokeWidth={1.75} style={{ color: etapa.cor }} aria-hidden />
          {etapa.nome}
        </span>
      )}
      {origem && (
        <span className={cn(etiqueta, 'border-border bg-muted/50 text-foreground')} title="Origem">
          <origem.Icone aria-hidden strokeWidth={1.75} className={cn('h-4 w-4 shrink-0', origem.cor)} />
          {origem.nome}
        </span>
      )}
      {contato && <EtiquetaContato contato={contato} comIcone className={etiqueta} />}
    </span>
  )

  return (
    <MutaseDialog open onOpenChange={onFechar} title={lead.name} description={resumo} size="lg" className="bg-card [&_h2]:font-marca [&_h2]:text-xl [&_h2]:font-extrabold">
      <MutaseDialog.Body className="space-y-4">
        <div className="rounded-lg border border-border shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-primary/5 border-b border-border">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Dados do lead
            </h4>
          </div>
          <div className="p-4">
            {/* key: a ficha de outro lead começa com os campos dele, não com os do anterior */}
            <LeadForm key={lead.id} lead={lead} origens={origens} onLeadAtualizado={onLeadAtualizado} />
          </div>
        </div>

        <div className="rounded-lg border border-border shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-primary/5 border-b border-border flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Anotações
              <span className="text-xs font-normal text-muted-foreground">({notas.length})</span>
            </h4>
            <button
              onClick={() => setNovaNota((atual) => (atual ? null : { texto: '', contato: '' }))}
              className="h-6 w-6 flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer transition-colors"
              aria-label="Adicionar anotação"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            {novaNota && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="nota-contato">Data do próximo contato (opcional):</Label>
                  <Input
                    id="nota-contato"
                    type="datetime-local"
                    value={novaNota.contato}
                    onChange={({ target }) => setNovaNota({ ...novaNota, contato: target.value })}
                  />
                </div>
                <Textarea
                  autoFocus
                  rows={5}
                  maxLength={5000}
                  placeholder="O que vocês conversaram?"
                  value={novaNota.texto}
                  onChange={({ target }) => setNovaNota({ ...novaNota, texto: target.value })}
                />
                <div className="text-right">
                  <Button variant="outline" onClick={salvarNota} disabled={salvandoNota}>
                    {salvandoNota ? 'Salvando...' : 'Adicionar anotação'}
                  </Button>
                </div>
              </div>
            )}

            {notas.length === 0 && !novaNota && (
              <p className="text-sm text-muted-foreground">Nenhuma anotação ainda. Use o + para registrar a conversa.</p>
            )}

            {notas.map((nota) => (
              <div
                key={nota.id}
                className="border border-border/70 rounded-lg p-3 bg-card shadow-sm hover:border-primary/30 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <strong className="text-sm">{user?.name}</strong>
                    <button
                      className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                      onClick={() => setNotaParaApagar(nota.id)}
                      aria-label="Apagar anotação"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="text-sm text-muted-foreground">{formatarDataHora(nota.createdAt)}</span>
                </div>
                <div className="p-1 rounded-sm text-sm bg-background whitespace-pre-wrap break-words">{nota.text}</div>
              </div>
            ))}
          </div>
        </div>

        <DeleteDialog
          open={!!notaParaApagar}
          onOpenChange={() => setNotaParaApagar(null)}
          onDelete={confirmarApagarNota}
          headerText="esta anotação"
          bodyText="esta anotação"
        />

        <DeleteDialog
          open={confirmarApagarLead}
          onOpenChange={() => setConfirmarApagarLead(false)}
          onDelete={confirmarApagarLeadAgora}
          loading={apagandoLead}
          headerText="este lead"
          bodyText="este lead e todas as anotações dele"
        />
      </MutaseDialog.Body>

      {/* Rodapé grudado no fim do modal: as ações ficam à vista sem rolar a ficha */}
      <MutaseDialog.Footer className="sticky bottom-[-1.5rem] z-10 -mx-6 -mb-6 justify-between gap-2 border-t border-border bg-card px-6 pb-6 pt-3 sm:justify-between sm:space-x-0">
        <Button
          variant="outline"
          className="text-destructive border-destructive hover:bg-destructive/10"
          onClick={() => setConfirmarApagarLead(true)}
        >
          Apagar lead
        </Button>
        <div className="flex items-center gap-2">
          {telefoneWhatsApp ? (
            <Button asChild className={botaoWhatsApp}>
              <a href={`https://wa.me/${telefoneWhatsApp}`} target="_blank" rel="noreferrer">
                <WhatsAppIcon size={18} />
                Conversar no WhatsApp
              </a>
            </Button>
          ) : (
            <Button disabled className={botaoWhatsApp} title="Este lead não tem telefone cadastrado">
              <WhatsAppIcon size={18} />
              Conversar no WhatsApp
            </Button>
          )}
          <Button variant="outline" onClick={onFechar}>
            Fechar
          </Button>
        </div>
      </MutaseDialog.Footer>
    </MutaseDialog>
  )
}

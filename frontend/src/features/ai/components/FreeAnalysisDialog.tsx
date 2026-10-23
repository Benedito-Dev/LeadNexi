import { FileDown, Plus, Trash2, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button } from '../../../components/ui/Button.tsx'
import { Field, Textarea } from '../../../components/ui/Field.tsx'
import { Input } from '../../../components/ui/Input.tsx'
import { Modal } from '../../../components/ui/Modal.tsx'
import type { Lead } from '../../leads/types.ts'
import { useGenerateAnalysis } from '../hooks.ts'
import type { FreeAnalysis } from '../types.ts'
import { AiButton, AiError, GuardrailWarnings, SuggestionFeedback } from './AiParts.tsx'

type Draft = Pick<FreeAnalysis, 'headline' | 'findings' | 'opportunities' | 'invitation'> & {
  referenceText: string
  referenceSource: string
}

function toDraft(analysis: FreeAnalysis): Draft {
  return {
    headline: analysis.headline,
    findings: analysis.findings,
    opportunities: [...analysis.opportunities, '', '', ''].slice(0, 3),
    invitation: analysis.invitation,
    referenceText: analysis.reference?.text ?? '',
    referenceSource: analysis.reference?.source ?? '',
  }
}

/**
 * "Análise grátis" (spec 4.5): a IA escreve os textos de 1 tela para o lead; o usuário revisa e
 * edita tudo antes de baixar o PDF (o navegador imprime a página pronta).
 */
export function FreeAnalysisDialog({ lead, open, onClose }: { lead: Pick<Lead, 'id' | 'name'>; open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} label={`Análise grátis de ${lead.name}`}>
      <DialogContent lead={lead} onClose={onClose} />
    </Modal>
  )
}

function DialogContent({ lead, onClose }: { lead: Pick<Lead, 'id' | 'name'>; onClose: () => void }) {
  const generate = useGenerateAnalysis(lead.id)
  const [draft, setDraft] = useState<Draft | null>(null)
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => (current ? { ...current, [key]: value } : current))

  function run() {
    generate.mutate(undefined, { onSuccess: (analysis) => setDraft(toDraft(analysis)) })
  }

  return (
    <>
      <header className="flex items-start gap-3 border-b px-6 pt-5 pb-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-h2">Análise grátis</h2>
          <p className="mt-1 text-small text-slate-400">
            {lead.name} · A IA escreve, você revisa cada linha antes de baixar.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="-mr-1 grid size-8 shrink-0 cursor-pointer place-items-center rounded-sm text-slate-400 transition-colors hover:bg-navy-750 hover:text-slate-300"
        >
          <X aria-hidden size={20} strokeWidth={1.75} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <AiButton onClick={run} pending={generate.isPending}>
            {draft ? 'Gerar de novo' : 'Gerar textos com IA'}
          </AiButton>
          {generate.data && <SuggestionFeedback key={generate.data.suggestionId} suggestionId={generate.data.suggestionId} />}
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <AiError error={generate.error} />
          {generate.data && <GuardrailWarnings warnings={generate.data.warnings} />}
        </div>

        {!draft ? (
          <p className="mt-6 rounded-md border border-dashed border-navy-600 px-4 py-8 text-center text-small text-slate-400">
            A IA usa os dados do lead (nota no Google, anúncios) e o banco de provas. O que não foi verificado fica de fora.
          </p>
        ) : (
          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="flex flex-col gap-4">
              <Field label="Título" htmlFor="analysis-headline">
                <Input id="analysis-headline" value={draft.headline} maxLength={120} onChange={(event) => set('headline', event.target.value)} />
              </Field>
              <ListEditor label="O que encontramos" items={draft.findings} onChange={(items) => set('findings', items)} max={4} />
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-small font-semibold text-slate-300">3 oportunidades</legend>
                {draft.opportunities.map((item, index) => (
                  <Input
                    key={index}
                    value={item}
                    maxLength={200}
                    aria-label={`Oportunidade ${index + 1}`}
                    onChange={(event) => set('opportunities', draft.opportunities.map((current, position) => (position === index ? event.target.value : current)))}
                  />
                ))}
              </fieldset>
              <Field label="Resultado de referência" htmlFor="analysis-reference" hint="Só do banco de provas. Vazio, a seção não aparece.">
                <Textarea id="analysis-reference" value={draft.referenceText} rows={2} maxLength={400} onChange={(event) => set('referenceText', event.target.value)} />
              </Field>
              <Field label="Fonte do resultado" htmlFor="analysis-source">
                <Input id="analysis-source" value={draft.referenceSource} maxLength={120} onChange={(event) => set('referenceSource', event.target.value)} />
              </Field>
              <Field label="Convite" htmlFor="analysis-invitation">
                <Textarea id="analysis-invitation" value={draft.invitation} rows={2} maxLength={300} onChange={(event) => set('invitation', event.target.value)} />
              </Field>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-small font-semibold text-slate-300">Prévia</p>
              <AnalysisPreview draft={draft} />
              <Button onClick={() => printAnalysis(draft)}>
                <FileDown aria-hidden size={18} strokeWidth={1.75} />
                Baixar PDF
              </Button>
              <p className="text-xs font-semibold text-slate-400">Abre a página pronta; escolha "Salvar como PDF" na impressão.</p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function ListEditor({ label, items, onChange, max }: { label: string; items: string[]; onChange: (items: string[]) => void; max: number }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-small font-semibold text-slate-300">{label}</legend>
      {items.map((item, index) => (
        <div key={index} className="flex gap-2">
          <div className="min-w-0 flex-1">
            <Input
              value={item}
              maxLength={200}
              aria-label={`${label} ${index + 1}`}
              onChange={(event) => onChange(items.map((current, position) => (position === index ? event.target.value : current)))}
            />
          </div>
          <button
            type="button"
            aria-label={`Remover item ${index + 1}`}
            onClick={() => onChange(items.filter((_, position) => position !== index))}
            className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-md text-slate-400 transition-colors hover:bg-navy-750 hover:text-danger"
          >
            <Trash2 aria-hidden size={16} strokeWidth={1.75} />
          </button>
        </div>
      ))}
      {items.length < max && (
        <button
          type="button"
          onClick={() => onChange([...items, ''])}
          className="inline-flex h-9 w-fit cursor-pointer items-center gap-2 rounded-sm px-3 text-small font-bold text-cyan transition-colors hover:bg-cyan-tint"
        >
          <Plus aria-hidden size={16} strokeWidth={1.75} />
          Adicionar item
        </button>
      )}
    </fieldset>
  )
}

/** Prévia da página (mesma ordem do PDF), no tema do app. */
function AnalysisPreview({ draft }: { draft: Draft }) {
  const findings = draft.findings.filter((item) => item.trim())
  const opportunities = draft.opportunities.filter((item) => item.trim())
  return (
    <article className="overflow-hidden rounded-lg border bg-navy-750">
      <div aria-hidden className="h-1 bg-flow" />
      <div className="flex flex-col gap-4 p-5">
        <div>
          <p className="text-xs font-bold text-cyan">Alvo Digital · Análise gratuita</p>
          <h3 className="mt-1 text-ui font-extrabold text-white">{draft.headline}</h3>
        </div>
        {findings.length > 0 && (
          <PreviewSection title="O que encontramos">
            <ul className="flex list-disc flex-col gap-1 pl-4">{findings.map((item) => <li key={item}>{item}</li>)}</ul>
          </PreviewSection>
        )}
        {opportunities.length > 0 && (
          <PreviewSection title={`${opportunities.length} oportunidades`}>
            <ol className="flex list-decimal flex-col gap-1 pl-4">{opportunities.map((item) => <li key={item}>{item}</li>)}</ol>
          </PreviewSection>
        )}
        {draft.referenceText.trim() && (
          <div className="rounded-md border border-navy-600 bg-navy-800 p-3">
            <p className="text-xs font-bold text-violet-300">Resultado de referência</p>
            <p className="mt-1 text-small text-slate-300">{draft.referenceText}</p>
            {draft.referenceSource.trim() && <p className="mt-1 text-xs text-slate-400">Fonte: {draft.referenceSource}</p>}
          </div>
        )}
        {draft.invitation.trim() && <p className="text-small font-bold text-white">{draft.invitation}</p>}
        <p className="text-xs font-semibold text-slate-400">Benedito · Alvo Digital · Fortaleza</p>
      </div>
    </article>
  )
}

function PreviewSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="text-small text-slate-300">
      <h4 className="mb-1 text-xs font-bold text-slate-400">{title}</h4>
      {children}
    </section>
  )
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char)

/**
 * Abre a página da análise numa janela própria e chama a impressão ("Salvar como PDF").
 * Fundo claro (imprime bem); as cores vêm dos tokens da marca (--lnx-*).
 */
function printAnalysis(draft: Draft) {
  const css = getComputedStyle(document.documentElement)
  const token = (name: string) => css.getPropertyValue(`--lnx-${name}`).trim()
  const list = (items: string[], tag: 'ul' | 'ol') => {
    const filled = items.filter((item) => item.trim())
    return filled.length ? `<${tag}>${filled.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</${tag}>` : ''
  }
  const findings = list(draft.findings, 'ul')
  const opportunities = list(draft.opportunities, 'ol')
  const opportunityCount = draft.opportunities.filter((item) => item.trim()).length

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(draft.headline)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: ${token('font-sans')}; color: ${token('navy')}; background: ${token('white')}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 210mm; min-height: 297mm; padding: 18mm 16mm; display: flex; flex-direction: column; gap: 9mm; }
  .bar { height: 4px; background: ${token('gradient-flow')}; border-radius: 4px; }
  .brand { font-size: 12px; font-weight: 800; color: ${token('cyan-600')}; }
  h1 { margin: 2mm 0 0; font-size: 30px; line-height: 1.15; font-weight: 800; letter-spacing: -.02em; }
  h2 { margin: 0 0 3mm; font-size: 13px; font-weight: 800; color: ${token('violet-600')}; }
  ul, ol { margin: 0; padding-left: 6mm; font-size: 15px; line-height: 1.6; }
  li { margin-bottom: 1.5mm; }
  .ref { border: 1px solid ${token('slate-300')}; border-radius: 12px; padding: 5mm; font-size: 15px; line-height: 1.5; }
  .ref small { display: block; margin-top: 2mm; font-size: 12px; color: ${token('slate')}; }
  .invite { font-size: 18px; font-weight: 700; line-height: 1.4; }
  .sign { margin-top: auto; font-size: 12px; font-weight: 700; color: ${token('slate')}; }
</style></head><body><div class="page">
  <div class="bar"></div>
  <div><div class="brand">Alvo Digital · Análise gratuita</div><h1>${escapeHtml(draft.headline)}</h1></div>
  ${findings ? `<section><h2>O que encontramos</h2>${findings}</section>` : ''}
  ${opportunities ? `<section><h2>${opportunityCount} oportunidades</h2>${opportunities}</section>` : ''}
  ${draft.referenceText.trim() ? `<section><h2>Resultado de referência</h2><div class="ref">${escapeHtml(draft.referenceText)}${draft.referenceSource.trim() ? `<small>Fonte: ${escapeHtml(draft.referenceSource)}</small>` : ''}</div></section>` : ''}
  ${draft.invitation.trim() ? `<p class="invite">${escapeHtml(draft.invitation)}</p>` : ''}
  <div class="sign">Benedito · Alvo Digital · Fortaleza</div>
</div><script>window.onload = () => { window.print(); };</script></body></html>`

  const page = window.open('', '_blank')
  if (!page) return
  page.document.write(html)
  page.document.close()
}

import { useState } from 'react'
import { BotaoDaIA } from '@/components/ia/BotaoDaIA'
import { ErroDeApi } from '@/lib/api'
import { MensagemDeErro } from '../../instagram/components/CartaoAppDaMeta'
import { resumirLead } from '../../ia/api'
import { dicaDaIA, useStatusDaIA } from '../../ia/useStatusDaIA'
import { formatarDataHora } from '../datas'
import type { Lead } from '../types'

const quando = (dias: number | null) => (dias === null ? null : dias === 0 ? 'hoje' : dias === 1 ? 'amanhã' : `em ${dias} dias`)

/**
 * "Resumir" da ficha: a IA conta em 3 linhas onde o lead está, o que ele quer e o próximo passo.
 * O resumo fica guardado no lead e aparece de novo ao abrir a ficha.
 */
export function ResumoDaIA({ lead, onResumido }: { lead: Lead; onResumido: (lead: Lead) => void }) {
  const status = useStatusDaIA()
  const [resumindo, setResumindo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const resumo = lead.aiSummary ?? null

  const resumir = async () => {
    setResumindo(true)
    setErro(null)
    try {
      const { generatedAt, ...novo } = await resumirLead(lead.id)
      onResumido({ ...lead, aiSummary: novo, aiSummaryAt: generatedAt })
    } catch (e) {
      setErro(e instanceof ErroDeApi ? e.message : 'A IA não respondeu. Tente de novo.')
    } finally {
      setResumindo(false)
    }
  }

  const linhas = resumo
    ? [
        { rotulo: 'Situação', texto: resumo.situation },
        { rotulo: 'O que quer', texto: resumo.wants },
        { rotulo: 'Próximo passo', texto: [resumo.nextStep, quando(resumo.nextStepDays)].filter(Boolean).join(' · ') },
      ]
    : []

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-border pb-2">
        <h4 className="font-marca text-base font-bold text-foreground">Resumo</h4>
        <BotaoDaIA
          rotulo={resumo ? 'Resumir de novo' : 'Resumir'}
          rotuloOcupado="Resumindo…"
          ocupado={resumindo}
          desabilitado={status?.configured !== true || resumindo}
          dica={dicaDaIA(status, 'A IA resume a conversa em 3 linhas, com o próximo passo')}
          onClick={() => void resumir()}
        />
      </div>
      {erro && <MensagemDeErro texto={erro} />}
      {resumo ? (
        <dl className="m-0 space-y-2">
          {linhas.map(({ rotulo, texto }) => (
            <div key={rotulo} className="grid gap-0.5 sm:grid-cols-[120px_1fr] sm:gap-3">
              <dt className="text-xs font-semibold text-muted-foreground">{rotulo}</dt>
              <dd className="m-0 text-sm font-medium text-foreground">{texto}</dd>
            </div>
          ))}
          {lead.aiSummaryAt && <p className="m-0 text-xs font-medium tabular-nums text-muted-foreground">Resumido em {formatarDataHora(lead.aiSummaryAt)}</p>}
        </dl>
      ) : (
        !erro && <p className="m-0 text-sm text-muted-foreground">A IA lê o histórico e conta onde o lead está, o que ele quer e o próximo passo.</p>
      )}
    </section>
  )
}

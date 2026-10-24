import { useState, type ReactNode } from 'react'
import { PhoneInput } from '@/components/ui/phone-input'
import { toE164BR } from '@/lib/phone'
import { addToast } from '@/lib/toast'
import { agendarContato, atualizarLead, desmarcarContato, type DadosLead } from '../api'
import { formatarDataHora, paraCampoDataHora } from '../datas'
import type { Lead } from '../types'

const inputClasses =
  'w-[92%] h-9 px-3 text-sm text-foreground bg-card border border-border rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none transition-all duration-200'

type Campos = {
  name: string
  email: string
  phone: string
  instagram: string
  valor: string
  source: string
  followUpAt: string
}

const camposDo = (lead: Lead): Campos => ({
  name: lead.name,
  email: lead.email ?? '',
  phone: toE164BR(lead.phone) || (lead.phone ?? ''),
  instagram: lead.instagramUsername ? `@${lead.instagramUsername}` : '',
  valor: lead.estimatedValue ? String(Number(lead.estimatedValue)) : '',
  source: lead.source ?? '',
  followUpAt: paraCampoDataHora(lead.followUpAt),
})

function Linha({ rotulo, htmlFor, children }: { rotulo: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <label className="w-[20%] shrink-0 text-sm font-semibold text-muted-foreground" htmlFor={htmlFor}>
        {rotulo}
      </label>
      {children}
    </div>
  )
}

type LeadFormProps = {
  lead: Lead
  /** Origens já usadas no pipeline, sugeridas no campo "Origem". */
  origens: string[]
  onLeadAtualizado: (lead: Lead) => void
}

/**
 * Dados do lead na ficha, portado do `ProspectForm` do Rizar: cada campo salva ao sair dele, e só
 * manda o que mudou. O próximo contato usa o agendamento do LeadNexi (fica no histórico do lead).
 */
export function LeadForm({ lead, origens, onLeadAtualizado }: LeadFormProps) {
  const [campos, setCampos] = useState<Campos>(() => camposDo(lead))
  const [salvos, setSalvos] = useState<Campos>(() => camposDo(lead))

  const mudar = (campo: keyof Campos, valor: string) => setCampos((atual) => ({ ...atual, [campo]: valor }))

  /** Salva um campo ao sair dele, se mudou. Se o servidor recusar, o campo volta ao valor salvo. */
  const salvar = async (campo: keyof Campos) => {
    const valor = campos[campo]
    if (valor === salvos[campo]) return
    const voltar = () => setCampos((atual) => ({ ...atual, [campo]: salvos[campo] }))

    try {
      if (campo === 'followUpAt') {
        const atualizado = valor ? await agendarContato(lead.id, new Date(valor).toISOString()) : await desmarcarContato(lead.id)
        onLeadAtualizado(atualizado)
      } else {
        if (campo === 'name' && !valor.trim()) {
          addToast('error', 'Erro', 'O nome do lead é obrigatório')
          voltar()
          return
        }
        const dados: DadosLead = {
          name: { name: valor.trim() },
          email: { email: valor.trim() || null },
          phone: { phone: valor ? `+${valor}` : null },
          instagram: { instagramUsername: valor.trim() || null },
          valor: { estimatedValue: valor === '' ? null : Number(valor) },
          source: { source: valor.trim() || null },
        }[campo]
        onLeadAtualizado(await atualizarLead(lead.id, dados))
      }
      setSalvos((atual) => ({ ...atual, [campo]: valor }))
    } catch (erro) {
      addToast('error', 'Erro', (erro as Error).message)
      voltar()
    }
  }

  return (
    <div className="mb-3">
      <Linha rotulo="Nome:" htmlFor="lead-nome">
        <input
          className={inputClasses}
          id="lead-nome"
          value={campos.name}
          maxLength={120}
          onBlur={() => void salvar('name')}
          onChange={({ target }) => mudar('name', target.value)}
        />
      </Linha>
      <Linha rotulo="Email:" htmlFor="lead-email">
        <input
          className={inputClasses}
          id="lead-email"
          type="email"
          inputMode="email"
          value={campos.email}
          onBlur={() => void salvar('email')}
          onChange={({ target }) => mudar('email', target.value)}
        />
      </Linha>
      <Linha rotulo="Telefone:" htmlFor="lead-telefone">
        <div className="w-[92%]">
          <PhoneInput
            id="lead-telefone"
            value={campos.phone}
            onBlur={() => void salvar('phone')}
            // Número pela metade não substitui o salvo: só número inteiro (ou campo vazio) vale
            onChange={(canonico, { completo }) => completo && mudar('phone', canonico)}
          />
        </div>
      </Linha>
      <Linha rotulo="Instagram:" htmlFor="lead-instagram">
        <input
          className={inputClasses}
          id="lead-instagram"
          placeholder="@perfil"
          value={campos.instagram}
          onBlur={() => void salvar('instagram')}
          onChange={({ target }) => mudar('instagram', target.value)}
        />
      </Linha>
      <Linha rotulo="Valor estimado:" htmlFor="lead-valor">
        <input
          className={inputClasses}
          id="lead-valor"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder="R$"
          value={campos.valor}
          onBlur={() => void salvar('valor')}
          onChange={({ target }) => mudar('valor', target.value)}
        />
      </Linha>
      <Linha rotulo="Origem:" htmlFor="lead-origem">
        <input
          className={inputClasses}
          id="lead-origem"
          list="lead-origens"
          placeholder="Ex.: Instagram"
          value={campos.source}
          onBlur={() => void salvar('source')}
          onChange={({ target }) => mudar('source', target.value)}
        />
        <datalist id="lead-origens">
          {origens.map((origem) => (
            <option key={origem} value={origem} />
          ))}
        </datalist>
      </Linha>
      <Linha rotulo="Prox. Contato:" htmlFor="lead-contato">
        <input
          className={inputClasses}
          id="lead-contato"
          type="datetime-local"
          value={campos.followUpAt}
          onBlur={() => void salvar('followUpAt')}
          onChange={({ target }) => mudar('followUpAt', target.value)}
        />
      </Linha>
      <div className="flex items-center gap-3 mb-2">
        <span className="w-[20%] shrink-0 text-sm font-semibold text-muted-foreground">Cadastrado em:</span>
        <span className="text-sm text-muted-foreground">{formatarDataHora(lead.createdAt)}</span>
      </div>
    </div>
  )
}

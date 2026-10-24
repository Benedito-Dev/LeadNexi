import { useState } from 'react'
import CreatableSelect from 'react-select/creatable'
import { MutaseDialog } from '@/components/modal/MutaseDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhoneInput } from '@/components/ui/phone-input'
import { addToast } from '@/lib/toast'
import { criarLead } from '../api'
import type { Etapa, Lead, Opcao } from '../types'

const selectClasses =
  'flex h-9 w-full rounded-md border border-input bg-card pl-3 pr-8 py-1 text-sm ' +
  'shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

type AddCardModalProps = {
  /** Etapa onde o lead entra; `null` = modal fechado. */
  laneId: string | null
  triggerModal: () => void
  updateProspectsList: (lead: Lead) => void
  origens: Opcao[]
  etapas: Etapa[]
  nomePipeline?: string
}

/** "Adicionar novo prospect", com os mesmos campos e obrigatórios do Rizar. */
export function AddCardModal({ laneId, triggerModal, updateProspectsList, origens, etapas, nomePipeline }: AddCardModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [instagram, setInstagram] = useState('')
  const [valor, setValor] = useState('')
  const [dataProxContact, setDataProxContact] = useState('')
  const [origin, setOrigin] = useState<Opcao | null>(null)
  const [etapa, setEtapa] = useState(laneId ?? '')
  const [loading, setLoading] = useState(false)

  const resetForm = () => {
    setName('')
    setEmail('')
    setPhone('')
    setInstagram('')
    setValor('')
    setDataProxContact('')
    setOrigin(null)
    setEtapa(laneId ?? '')
  }

  const fechar = () => {
    resetForm()
    triggerModal()
  }

  const onSubmit = async () => {
    if (!name.trim() || !phone || !dataProxContact || !origin || !etapa) {
      addToast('error', 'Preencha todos os campos obrigatórios: Nome, Telefone, Próximo Contato, Origem e Etapa')
      return
    }
    setLoading(true)
    try {
      const lead = await criarLead({
        name: name.trim(),
        stageId: etapa,
        phone: `+${phone}`,
        email: email.trim() || undefined,
        instagramUsername: instagram.trim() || undefined,
        estimatedValue: valor === '' ? undefined : Number(valor),
        followUpAt: new Date(dataProxContact).toISOString(),
        source: origin.value,
      })
      addToast('success', 'Sucesso', 'Prospect criado com sucesso')
      updateProspectsList(lead)
      fechar()
    } catch (err) {
      addToast('error', 'Erro', (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <MutaseDialog
      open={laneId !== null}
      onOpenChange={fechar}
      title="Adicionar Novo Prospect"
      description="Preencha os dados do novo prospect para adicionar ao pipeline"
    >
      <MutaseDialog.Body>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="prospectEtapa" className="required">
              Etapa
            </Label>
            <select
              id="prospectEtapa"
              className={selectClasses}
              disabled={loading || etapas.length === 0}
              value={etapa}
              onChange={({ target }) => setEtapa(target.value)}
            >
              {etapas.length === 0 && <option value="">Nenhuma etapa neste pipeline</option>}
              {etapas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            {nomePipeline && <p className="text-xs text-muted-foreground">Pipeline: {nomePipeline}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prospectName" className="required">
              Nome
            </Label>
            <Input
              id="prospectName"
              disabled={loading}
              value={name}
              onChange={({ target }) => setName(target.value)}
              placeholder="Nome do prospect"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prospectEmail">Email</Label>
            <Input
              id="prospectEmail"
              type="email"
              inputMode="email"
              disabled={loading}
              placeholder="exemplo@email.com"
              value={email}
              onChange={({ target }) => setEmail(target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prospectPhone" className="required">
              Telefone
            </Label>
            <PhoneInput id="prospectPhone" disabled={loading} value={phone} onChange={setPhone} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prospectInstagram">Instagram</Label>
            <Input
              id="prospectInstagram"
              disabled={loading}
              placeholder="@perfil"
              value={instagram}
              onChange={({ target }) => setInstagram(target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prospectValor">Valor estimado (R$)</Label>
            <Input
              id="prospectValor"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              disabled={loading}
              placeholder="15000"
              value={valor}
              onChange={({ target }) => setValor(target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="proxContact" className="required">
              Próximo Contato
            </Label>
            <Input
              id="proxContact"
              type="datetime-local"
              disabled={loading}
              value={dataProxContact}
              onChange={({ target }) => setDataProxContact(target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="origem-novo" className="required">
              Origem
            </Label>
            {/* O LeadNexi guarda a origem como texto: dá para escolher uma já usada ou digitar outra */}
            <CreatableSelect<Opcao>
              inputId="origem-novo"
              options={origens}
              value={origin}
              onChange={(opcao) => setOrigin(opcao)}
              placeholder="Buscar origem..."
              formatCreateLabel={(texto) => `Usar "${texto}"`}
              isClearable
              isDisabled={loading}
              noOptionsMessage={() => 'Nenhuma origem encontrada'}
              menuPortalTarget={document.body}
              menuPosition="fixed"
              menuPlacement="auto"
              styles={{
                menuPortal: (base) => ({ ...base, zIndex: 9999, pointerEvents: 'auto' }),
                control: (base) => ({
                  ...base,
                  minHeight: '36px',
                  fontSize: '14px',
                  borderColor: 'hsl(var(--input))',
                  backgroundColor: 'hsl(var(--card))',
                  boxShadow: '0 1px 2px 0 hsl(var(--foreground) / 0.05)',
                }),
                menu: (base) => ({
                  ...base,
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  pointerEvents: 'auto',
                }),
                menuList: (base) => ({ ...base, backgroundColor: 'hsl(var(--popover))' }),
                option: (base, state) => ({
                  ...base,
                  backgroundColor: state.isSelected
                    ? 'hsl(var(--primary))'
                    : state.isFocused
                      ? 'hsl(var(--accent))'
                      : 'transparent',
                  color: state.isSelected
                    ? 'hsl(var(--primary-foreground))'
                    : state.isFocused
                      ? 'hsl(var(--accent-foreground))'
                      : 'hsl(var(--popover-foreground))',
                  cursor: 'pointer',
                }),
                singleValue: (base) => ({ ...base, color: 'hsl(var(--foreground))' }),
                input: (base) => ({ ...base, color: 'hsl(var(--foreground))' }),
                placeholder: (base) => ({ ...base, color: 'hsl(var(--muted-foreground))' }),
                noOptionsMessage: (base) => ({ ...base, color: 'hsl(var(--muted-foreground))' }),
              }}
            />
          </div>
        </div>
      </MutaseDialog.Body>

      <MutaseDialog.Footer>
        <Button variant="outline" onClick={fechar} disabled={loading}>
          Cancelar
        </Button>
        <Button disabled={loading} onClick={onSubmit}>
          {loading ? 'Salvando...' : 'Salvar'}
        </Button>
      </MutaseDialog.Footer>
    </MutaseDialog>
  )
}

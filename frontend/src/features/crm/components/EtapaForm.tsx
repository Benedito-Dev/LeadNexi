import { FormField } from '@/components/form/FormField'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import type { DadosEtapa } from '../api'
import { OPCOES_TIPO_ETAPA } from '../etapas'
import type { StageType } from '../types'

type EtapaFormProps = {
  valor: DadosEtapa
  onChange: (valor: DadosEtapa) => void
}

/**
 * Formulário da etapa, no layout do `ProspectStatusForm` do Rizar. "Ordem" virou "Tipo da etapa"
 * (a ordem aqui se muda arrastando na lista) e "Status" saiu (etapa no LeadNexi não desativa).
 */
export function EtapaForm({ valor, onChange }: EtapaFormProps) {
  const mudar = <K extends keyof DadosEtapa>(campo: K, novo: DadosEtapa[K]) => onChange({ ...valor, [campo]: novo })

  return (
    <>
      <FormField label="Nome da Etapa" required htmlFor="name">
        <Input
          id="name"
          placeholder="Ex: Reunião marcada"
          value={valor.name}
          onChange={({ target }) => mudar('name', target.value)}
          required
        />
      </FormField>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-6">
          <FormField label="Tipo da Etapa" required htmlFor="stageType">
            <NativeSelect
              id="stageType"
              className="w-full"
              value={valor.stageType}
              onChange={(novo) => mudar('stageType', novo as StageType)}
              options={OPCOES_TIPO_ETAPA}
            />
            <p className="text-sm text-muted-foreground">
              "Fechou" cria a ficha de cliente; "Perdido" pede o motivo ao mover o lead
            </p>
          </FormField>
        </div>

        <div className="col-span-12 md:col-span-6">
          <FormField label="Cor da Etapa" htmlFor="color_code">
            <div className="flex items-center gap-2">
              <Input
                id="color_code"
                type="color"
                value={valor.color}
                onChange={(e) => mudar('color', e.target.value)}
                className="w-20 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={valor.color}
                onChange={(e) => mudar('color', e.target.value)}
                placeholder="#3B82F6"
                maxLength={7}
              />
            </div>
            <p className="text-sm text-muted-foreground">Cor hexadecimal para identificação visual da etapa</p>
          </FormField>
        </div>
      </div>
    </>
  )
}

import { useState, type FormEvent } from 'react'
import { LoaderCircle } from 'lucide-react'
import { FormField } from '@/components/form/FormField'
import { botaoPrincipalDoTopo, botaoSecundarioDoTopo } from '@/components/list-page/botoes'
import { MutaseDialog } from '@/components/modal/MutaseDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErroDeApi } from '@/lib/api'
import { MensagemDeErro } from '../../instagram/components/CartaoAppDaMeta'
import { criarLista, editarLista, type DadosDaLista, type Lista } from '../api'

type ListaFormProps = {
  /** `null` = lista nova; senão, a lista a editar. */
  lista: Lista | null
  onFechar: () => void
  onSalva: (lista: Lista) => void
}

/** Nova lista ou editar: nome, nicho, cidade e a meta de contatos. */
export function ListaForm({ lista, onFechar, onSalva }: ListaFormProps) {
  const [dados, setDados] = useState({
    name: lista?.name ?? '',
    niche: lista?.niche ?? '',
    city: lista?.city ?? '',
    meta: lista?.targetContacts ? String(lista.targetContacts) : '',
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const salvar = async (evento: FormEvent) => {
    evento.preventDefault()
    const meta = dados.meta.trim() ? Number(dados.meta) : null
    if (!dados.name.trim()) return setErro('Dê um nome para a lista.')
    if (meta !== null && (!Number.isInteger(meta) || meta < 1 || meta > 100_000)) return setErro('A meta de contatos é um número entre 1 e 100.000.')
    const envio: DadosDaLista = { name: dados.name.trim(), niche: dados.niche.trim(), city: dados.city.trim(), targetContacts: meta }
    setSalvando(true)
    setErro(null)
    try {
      onSalva(lista ? await editarLista(lista.id, envio) : await criarLista(envio))
    } catch (e) {
      setErro(e instanceof ErroDeApi && e.status !== null && e.status < 500 ? e.message : 'Não foi possível salvar a lista. Tente de novo.')
      setSalvando(false)
    }
  }

  const campo = (chave: keyof typeof dados) => ({
    id: `lista-${chave}`,
    value: dados[chave],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDados((d) => ({ ...d, [chave]: e.target.value })),
    disabled: salvando,
  })

  return (
    <MutaseDialog open onOpenChange={onFechar} title={lista ? 'Editar lista' : 'Nova lista'} description="Um nicho de lojas para prospectar, como “Lojas de celular – Aldeota”.">
      <form onSubmit={(e) => void salvar(e)}>
        <MutaseDialog.Body className="space-y-4">
          <FormField label="Nome" required htmlFor="lista-name">
            <Input {...campo('name')} maxLength={160} placeholder="Ex.: Lojas de celular – Aldeota" autoFocus />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Nicho" htmlFor="lista-niche">
              <Input {...campo('niche')} maxLength={80} placeholder="Ex.: Lojas de celular" />
            </FormField>
            <FormField label="Cidade ou bairro" htmlFor="lista-city">
              <Input {...campo('city')} maxLength={100} placeholder="Ex.: Fortaleza" />
            </FormField>
          </div>
          <FormField label="Meta de contatos (opcional)" htmlFor="lista-meta">
            <Input {...campo('meta')} inputMode="numeric" placeholder="Ex.: 30" className="tabular-nums" />
          </FormField>
          {erro && <MensagemDeErro texto={erro} />}
        </MutaseDialog.Body>
        <MutaseDialog.Footer>
          <Button type="button" variant="outline" className={botaoSecundarioDoTopo} onClick={onFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" className={botaoPrincipalDoTopo} disabled={salvando}>
            {salvando && <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" strokeWidth={1.75} />}
            {lista ? 'Salvar' : 'Criar lista'}
          </Button>
        </MutaseDialog.Footer>
      </form>
    </MutaseDialog>
  )
}

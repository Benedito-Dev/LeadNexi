import { useCallback, useEffect, useState } from 'react'
import { ListChecks, Plus } from 'lucide-react'
import { botaoPrincipalDoTopo } from '@/components/list-page/botoes'
import { ListPageHeader } from '@/components/list-page/ListPageHeader'
import { Button } from '@/components/ui/button'
import { addToast } from '@/lib/toast'
import { buscarProspeccao } from '../configuracoes/api'
import { ImportarLeadsModal } from '../crm/components/ImportarLeadsModal'
import { MensagemDeErro } from '../instagram/components/CartaoAppDaMeta'
import { editarLista, listarListas, type Lista } from './api'
import { CartaoDaLista } from './components/CartaoDaLista'
import { ListaForm } from './components/ListaForm'

/**
 * CRM › Listas: os nichos de prospecção, quanto cada um rendeu e o aviso da regra de troca
 * ("30 contatados, menos de 2 respostas = trocar nicho ou mensagem"). Importar planilha numa lista.
 */
export function ListasPage() {
  const [listas, setListas] = useState<Lista[] | null>(null)
  const [erro, setErro] = useState(false)
  const [regra, setRegra] = useState<{ contatos: number; respostas: number } | null>(null)
  const [verArquivadas, setVerArquivadas] = useState(false)
  // undefined = fechado; null = lista nova
  const [editando, setEditando] = useState<Lista | null | undefined>(undefined)
  const [importarEm, setImportarEm] = useState<Lista | null>(null)

  const carregar = useCallback(() => {
    listarListas()
      .then((lista) => {
        setListas(lista)
        setErro(false)
      })
      .catch(() => setErro(true))
  }, [])

  useEffect(() => {
    carregar()
    buscarProspeccao()
      .then((p) => setRegra({ contatos: p.decisionContacts, respostas: p.decisionMinReplies }))
      .catch(() => setRegra(null))
  }, [carregar])

  const arquivar = async (lista: Lista, arquivar: boolean) => {
    try {
      await editarLista(lista.id, { archived: arquivar })
      addToast('success', arquivar ? 'Lista arquivada' : 'Lista de volta', arquivar ? 'Os leads dela saem do quadro e da tela Hoje.' : lista.name)
      carregar()
    } catch {
      addToast('error', 'Não foi possível mudar a lista', 'Tente de novo.')
    }
  }

  const ativas = listas?.filter((l) => !l.archived) ?? []
  const arquivadas = listas?.filter((l) => l.archived) ?? []
  const visiveis = verArquivadas ? arquivadas : ativas

  return (
    <div className="flex w-full flex-col gap-5 font-marca">
      <title>Listas · LeadNexi</title>
      <ListPageHeader
        icon={ListChecks}
        title="Listas"
        summary="Nichos de prospecção e quanto cada um está rendendo"
        actions={
          <Button className={botaoPrincipalDoTopo} onClick={() => setEditando(null)}>
            <Plus aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            Nova lista
          </Button>
        }
      />

      {arquivadas.length > 0 && (
        <div className="flex gap-1.5" role="group" aria-label="Quais listas mostrar">
          {[
            { arquivada: false, rotulo: `Ativas (${ativas.length})` },
            { arquivada: true, rotulo: `Arquivadas (${arquivadas.length})` },
          ].map(({ arquivada, rotulo }) => (
            <button
              key={rotulo}
              type="button"
              aria-pressed={verArquivadas === arquivada}
              onClick={() => setVerArquivadas(arquivada)}
              className={
                verArquivadas === arquivada
                  ? 'rounded-full border border-leadnexi-violet/50 bg-leadnexi-violet/10 px-3 py-1 text-xs font-semibold text-foreground'
                  : 'rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground'
              }
            >
              {rotulo}
            </button>
          ))}
        </div>
      )}

      {erro ? (
        <MensagemDeErro texto="Não foi possível carregar as listas. Atualize a página para tentar de novo." />
      ) : listas === null ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} aria-hidden className="h-44 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : visiveis.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-6 text-sm font-medium text-muted-foreground">
          {verArquivadas ? 'Nenhuma lista arquivada.' : 'Nenhuma lista ainda. Crie uma para cada nicho que você prospecta, como “Lojas de celular – Aldeota”.'}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visiveis.map((lista) => (
            <CartaoDaLista
              key={lista.id}
              lista={lista}
              regra={regra}
              onEditar={() => setEditando(lista)}
              onImportar={() => setImportarEm(lista)}
              onArquivar={(arquivarLista) => void arquivar(lista, arquivarLista)}
            />
          ))}
        </div>
      )}

      {editando !== undefined && (
        <ListaForm
          lista={editando}
          onFechar={() => setEditando(undefined)}
          onSalva={(salva) => {
            addToast('success', editando ? 'Lista salva' : 'Lista criada', salva.name)
            setEditando(undefined)
            carregar()
          }}
        />
      )}

      <ImportarLeadsModal aberto={importarEm !== null} lista={importarEm ?? undefined} aoFechar={() => setImportarEm(null)} aoConcluir={carregar} />
    </div>
  )
}

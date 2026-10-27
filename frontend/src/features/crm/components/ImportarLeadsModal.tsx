import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, FileDown, Upload } from 'lucide-react'
import { botaoPrincipalDoTopo, botaoSecundarioDoTopo } from '@/components/list-page/botoes'
import { MutaseDialog } from '@/components/modal/MutaseDialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Seletor } from '@/components/ui/seletor'
import { addToast } from '@/lib/toast'
import { importarLeads, listarPipelines, type LinhaImportacao, type ModoDuplicado } from '../api'
import { etapaDoStatus, guessTargets, IMPORT_LIMIT, mapRow, type ColumnTarget } from '../importar/mapeamento'
import { mainSheet, readSpreadsheet, SPREADSHEET_ACCEPT, type Sheet } from '../importar/planilha'
import type { PipelineResumo } from '../types'

/** Campos que a planilha pode preencher, na ordem da conferência. */
const CAMPOS: { campo: ColumnTarget; rotulo: string; obrigatorio?: boolean }[] = [
  { campo: 'name', rotulo: 'Nome', obrigatorio: true },
  { campo: 'phone', rotulo: 'Telefone' },
  { campo: 'email', rotulo: 'E-mail' },
  { campo: 'instagramUsername', rotulo: 'Instagram' },
  { campo: 'estimatedValue', rotulo: 'Valor estimado' },
  { campo: 'followUpAt', rotulo: 'Próximo contato' },
  { campo: 'status', rotulo: 'Etapa' },
  { campo: 'notes', rotulo: 'Observações' },
  { campo: 'neighborhood', rotulo: 'Bairro' },
  { campo: 'address', rotulo: 'Endereço' },
]

const MODOS_DUPLICADO = [
  { value: 'skip', label: 'Deixar de fora' },
  { value: 'update', label: 'Atualizar com os dados da planilha' },
  { value: 'duplicate', label: 'Importar mesmo assim (duplica)' },
]

const NAO_IMPORTAR = ''

type Resultado = {
  criados: number
  atualizados: number
  repetidos: number
  invalidos: { linha: number; motivo: string }[]
  etapasNaoReconhecidas: { valor: string; linhas: number }[]
}

/** Baixa um CSV de exemplo com as colunas que a conferência reconhece sozinha. */
function baixarModelo() {
  const linhas = [
    'Nome;Telefone;E-mail;Instagram;Valor estimado;Próximo contato;Etapa;Observações',
    'Padaria Exemplo;(85) 99906-2339;contato@padaria.com;@padariaexemplo;1500;25/10/2026;A contatar;Indicação do João',
  ]
  // BOM: o Excel abre o CSV com os acentos certos
  const blob = new Blob(['﻿' + linhas.join('\n')], { type: 'text/csv;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'modelo-importacao-leads.csv'
  link.click()
  URL.revokeObjectURL(link.href)
}

type ImportarLeadsModalProps = {
  aberto: boolean
  aoFechar: () => void
  /** Pipeline aberto no quadro: vem sugerido como destino. */
  pipelineAtual?: string
  /** Terminou de importar: o quadro recarrega para os leads novos aparecerem. */
  aoConcluir: () => void
  /** Lista de prospecção que recebe os leads (aberto pela tela Listas). */
  lista?: { id: string; name: string }
}

/**
 * Importação de leads por planilha, no formato da janela do Rizar. A planilha é lida no navegador
 * (o arquivo não sai do computador); só as linhas vão para o servidor, em partes de 1.000.
 */
export function ImportarLeadsModal({ aberto, aoFechar, pipelineAtual, aoConcluir, lista }: ImportarLeadsModalProps) {
  const [passo, setPasso] = useState<'arquivo' | 'conferencia' | 'resultado'>('arquivo')
  const [nomeArquivo, setNomeArquivo] = useState('')
  const [planilha, setPlanilha] = useState<Sheet | null>(null)
  const [mapeamento, setMapeamento] = useState<Partial<Record<ColumnTarget, string>>>({})
  const [juntarResto, setJuntarResto] = useState(true)
  const [pipelines, setPipelines] = useState<PipelineResumo[]>([])
  const [pipelineId, setPipelineId] = useState('')
  const [etapaId, setEtapaId] = useState('')
  const [modoDuplicado, setModoDuplicado] = useState<ModoDuplicado>('skip')
  const [ocupado, setOcupado] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const inputArquivo = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!aberto) return
    listarPipelines()
      .then((lista) => {
        setPipelines(lista)
        const inicial = lista.find((p) => p.id === pipelineAtual) ?? (lista.length === 1 ? lista[0] : null)
        if (inicial) {
          setPipelineId(inicial.id)
          setEtapaId(inicial.stages[0]?.id ?? '')
        }
      })
      .catch(() => setPipelines([]))
  }, [aberto, pipelineAtual])

  const etapas = useMemo(() => pipelines.find((p) => p.id === pipelineId)?.stages ?? [], [pipelines, pipelineId])

  const recomecar = () => {
    setPasso('arquivo')
    setNomeArquivo('')
    setPlanilha(null)
    setMapeamento({})
    setResultado(null)
  }

  const fechar = () => {
    recomecar()
    aoFechar()
  }

  const escolherArquivo = async (arquivo: File | undefined) => {
    if (!arquivo) return
    setOcupado(true)
    try {
      const aba = mainSheet(await readSpreadsheet(arquivo))
      if (!aba || aba.rows.length === 0) {
        addToast('error', 'Planilha vazia', 'Não achei linhas com dados nesse arquivo.')
        return
      }
      // A conferência já vem preenchida pelos nomes das colunas ("Telefone", "E-mail"...)
      const sugestao: Partial<Record<ColumnTarget, string>> = {}
      guessTargets(aba.headers).forEach((alvo, indice) => {
        if (CAMPOS.some((c) => c.campo === alvo) && sugestao[alvo] === undefined) sugestao[alvo] = String(indice)
      })
      setNomeArquivo(arquivo.name)
      setPlanilha(aba)
      setMapeamento(sugestao)
      setPasso('conferencia')
    } catch {
      addToast('error', 'Erro', 'Não consegui ler esse arquivo. Confira se é uma planilha (.xlsx, .csv ou .ods).')
    } finally {
      setOcupado(false)
      if (inputArquivo.current) inputArquivo.current.value = ''
    }
  }

  const opcoesDeColuna = [
    { value: NAO_IMPORTAR, label: '— não importar —' },
    ...(planilha?.headers.map((cabecalho, indice) => ({ value: String(indice), label: cabecalho })) ?? []),
  ]

  const temContato = Boolean(mapeamento.phone || mapeamento.email || mapeamento.instagramUsername)
  const faltaObrigatorio = !mapeamento.name || !temContato || !pipelineId || !etapaId

  const importar = async () => {
    if (!planilha) return
    // Coluna sem campo: vai para as observações ("Coluna: valor") ou fica de fora
    const alvos: ColumnTarget[] = planilha.headers.map((_, indice) => {
      const campo = CAMPOS.find((c) => mapeamento[c.campo] === String(indice))
      return campo ? campo.campo : juntarResto ? 'extra' : 'ignore'
    })

    const naoReconhecidas = new Map<string, number>()
    const linhas: { linha: number; dados: LinhaImportacao }[] = planilha.rows.map((row) => {
      const lead = mapRow(planilha, alvos, row)
      let stageId = etapaId
      if (lead.status) {
        const daPlanilha = etapaDoStatus(lead.status, etapas)
        if (daPlanilha) stageId = daPlanilha
        else naoReconhecidas.set(lead.status, (naoReconhecidas.get(lead.status) ?? 0) + 1)
      }
      return {
        linha: lead.line,
        dados: {
          name: lead.name,
          stageId,
          phone: lead.phone,
          email: lead.email,
          instagramUsername: lead.instagramUsername,
          estimatedValue: lead.estimatedValue,
          followUpAt: lead.followUpAt,
          notes: lead.notes,
          neighborhood: lead.neighborhood,
          address: lead.address,
        },
      }
    })

    setOcupado(true)
    const parcial: Resultado = {
      criados: 0,
      atualizados: 0,
      repetidos: 0,
      invalidos: [],
      etapasNaoReconhecidas: [...naoReconhecidas].map(([valor, n]) => ({ valor, linhas: n })),
    }
    try {
      for (let inicio = 0; inicio < linhas.length; inicio += IMPORT_LIMIT) {
        const parte = linhas.slice(inicio, inicio + IMPORT_LIMIT)
        const resposta = await importarLeads(
          parte.map((l) => l.dados),
          modoDuplicado,
          lista?.id,
        )
        for (const r of resposta.rows) {
          if (r.status === 'created') parcial.criados += 1
          else if (r.status === 'updated') parcial.atualizados += 1
          else if (r.status === 'duplicate') parcial.repetidos += 1
          else if (r.status === 'invalid') parcial.invalidos.push({ linha: parte[r.index].linha, motivo: r.reason ?? 'Linha inválida' })
        }
      }
      setResultado(parcial)
      setPasso('resultado')
      if (parcial.criados + parcial.atualizados > 0) aoConcluir()
    } catch (erro) {
      // Partes já enviadas ficaram no CRM: mostra o que entrou até aqui
      if (parcial.criados + parcial.atualizados > 0) {
        setResultado(parcial)
        setPasso('resultado')
        aoConcluir()
      }
      addToast('error', 'Erro', (erro as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <MutaseDialog
      open={aberto}
      onOpenChange={fechar}
      title="Importar leads"
      description={lista ? `Traga os leads de uma planilha para a lista "${lista.name}"` : 'Traga os leads de uma planilha (.xlsx, .csv ou .ods)'}
    >
      <MutaseDialog.Body>
        {passo === 'arquivo' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-dashed border-input bg-muted/30 p-6 text-center">
              <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" strokeWidth={1.75} />
              <p className="mx-auto mb-3 mt-0 max-w-sm text-sm text-muted-foreground">
                Envie a planilha como ela veio do outro sistema. Você confere as colunas no próximo passo.
              </p>
              <input
                ref={inputArquivo}
                type="file"
                accept={SPREADSHEET_ACCEPT}
                className="hidden"
                onChange={({ target }) => void escolherArquivo(target.files?.[0])}
              />
              <Button
                variant="outline"
                className={botaoSecundarioDoTopo}
                disabled={ocupado}
                onClick={() => inputArquivo.current?.click()}
              >
                {ocupado ? 'Lendo o arquivo...' : 'Escolher arquivo'}
              </Button>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Não tem uma planilha pronta?</span>
              <Button variant="ghost" size="sm" className="gap-1.5 text-foreground hover:bg-accent" onClick={baixarModelo}>
                <FileDown className="h-4 w-4" strokeWidth={1.75} />
                Baixar modelo
              </Button>
            </div>
            <p className="m-0 text-xs text-muted-foreground">
              O arquivo é lido aqui no seu computador; só os leads vão para o LeadNexi. Os importados entram com a origem
              "Planilha".
            </p>
          </div>
        )}

        {passo === 'conferencia' && planilha && (
          <div className="space-y-4">
            <p className="m-0 text-sm text-muted-foreground">
              <strong className="text-foreground">{planilha.rows.length}</strong> linhas em{' '}
              <strong className="text-foreground">{nomeArquivo}</strong>. Confira de onde vem cada informação:
            </p>
            <div className="space-y-2">
              {CAMPOS.map(({ campo, rotulo, obrigatorio }) => (
                <div key={campo} className="grid grid-cols-12 items-center gap-2">
                  <Label htmlFor={`campo-${campo}`} className="col-span-4 mb-0 text-sm">
                    {rotulo}
                    {obrigatorio && <span className="text-destructive"> *</span>}
                  </Label>
                  <div className="col-span-8">
                    <Seletor
                      id={`campo-${campo}`}
                      valor={mapeamento[campo] ?? NAO_IMPORTAR}
                      opcoes={opcoesDeColuna}
                      onChange={(valor) => setMapeamento((antes) => ({ ...antes, [campo]: valor }))}
                    />
                  </div>
                </div>
              ))}
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={juntarResto} onChange={({ target }) => setJuntarResto(target.checked)} />
              Juntar as outras colunas às observações do lead
            </label>
            {(!mapeamento.name || !temContato) && (
              <p className="m-0 text-sm text-destructive">
                Indique a coluna do Nome e pelo menos uma de Telefone, E-mail ou Instagram — sem elas não há como falar
                com o lead nem saber se ele já existe aqui.
              </p>
            )}

            <div className="space-y-3 border-t border-border pt-3">
              <Label className="text-xs text-muted-foreground">Onde estes leads entram</Label>
              <div className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="destino-pipeline" className="mb-0 text-xs">
                    Pipeline <span className="text-destructive">*</span>
                  </Label>
                  <Seletor
                    id="destino-pipeline"
                    valor={pipelineId}
                    vazio="Escolha o pipeline"
                    opcoes={pipelines.map((p) => ({ value: p.id, label: p.name }))}
                    onChange={(id) => {
                      setPipelineId(id)
                      setEtapaId(pipelines.find((p) => p.id === id)?.stages[0]?.id ?? '')
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="destino-etapa" className="mb-0 text-xs">
                    Etapa do funil <span className="text-destructive">*</span>
                  </Label>
                  <Seletor
                    id="destino-etapa"
                    valor={etapaId}
                    vazio={pipelineId ? 'Escolha a etapa' : 'Escolha o pipeline antes'}
                    disabled={!pipelineId}
                    opcoes={etapas.map((e) => ({ value: e.id, label: e.name }))}
                    onChange={setEtapaId}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="destino-repetidos" className="mb-0 text-xs">
                    Quem já está no CRM (mesmo @, telefone ou nome)
                  </Label>
                  <Seletor
                    id="destino-repetidos"
                    valor={modoDuplicado}
                    opcoes={MODOS_DUPLICADO}
                    onChange={(valor) => setModoDuplicado(valor as ModoDuplicado)}
                  />
                </div>
              </div>
              {pipelineId && etapas.length === 0 && (
                <p className="m-0 text-sm text-destructive">
                  Este pipeline não tem etapas cadastradas. Crie ao menos uma em CRM &gt; Pipelines antes de importar.
                </p>
              )}
              <p className="m-0 text-xs text-muted-foreground">
                Se a planilha tiver uma coluna de <strong>etapa</strong>, aponte ela acima e cada linha entra na etapa
                correspondente deste funil. Linha em branco — ou nome que não bate com nenhuma etapa — cai na etapa
                escolhida aqui.
              </p>
            </div>
          </div>
        )}

        {passo === 'resultado' && resultado && (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CheckCircle2 className="h-4 w-4 text-success-foreground" strokeWidth={1.75} />
              Importação concluída.
            </div>
            <ul className="space-y-1 text-sm">
              <li>
                <strong>{resultado.criados}</strong> leads novos
              </li>
              {resultado.atualizados > 0 && (
                <li>
                  <strong>{resultado.atualizados}</strong> já existiam e foram atualizados
                </li>
              )}
              {resultado.repetidos > 0 && (
                <li>
                  <strong>{resultado.repetidos}</strong> já existiam e ficaram de fora
                </li>
              )}
              <li>
                <strong>{resultado.invalidos.length}</strong> linhas não entraram
              </li>
            </ul>

            {resultado.etapasNaoReconhecidas.length > 0 && (
              <div className="rounded-lg border border-warn-border bg-warn p-3">
                <p className="m-0 text-sm font-medium text-warn-foreground">Etapas da planilha que não existem neste funil</p>
                <p className="mb-0 mt-1 text-xs text-warn-foreground/80">
                  Estas linhas entraram na etapa que você escolheu. Ou o nome está escrito diferente na planilha, ou a
                  etapa ainda não foi criada no funil.
                </p>
                <ul className="mt-2 space-y-1 text-sm text-warn-foreground">
                  {resultado.etapasNaoReconhecidas.map((e) => (
                    <li key={e.valor}>
                      <span className="font-medium">“{e.valor}”</span>
                      <span className="text-warn-foreground/70">
                        {' '}
                        — {e.linhas} {e.linhas === 1 ? 'linha' : 'linhas'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {resultado.invalidos.length > 0 && (
              <div className="rounded-lg border border-error-border bg-error p-3">
                <p className="m-0 flex items-center gap-1.5 text-sm font-medium text-error-foreground">
                  <AlertCircle className="h-4 w-4" strokeWidth={1.75} />
                  Linhas que não entraram
                </p>
                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm text-error-foreground">
                  {resultado.invalidos.slice(0, 50).map((i) => (
                    <li key={i.linha}>
                      <span className="font-medium">Linha {i.linha}:</span> {i.motivo}
                    </li>
                  ))}
                  {resultado.invalidos.length > 50 && <li>… e mais {resultado.invalidos.length - 50}.</li>}
                </ul>
              </div>
            )}
          </div>
        )}
      </MutaseDialog.Body>

      <MutaseDialog.Footer className="gap-2">
        {passo === 'conferencia' && (
          <>
            <Button variant="outline" className={botaoSecundarioDoTopo} onClick={recomecar} disabled={ocupado}>
              Trocar arquivo
            </Button>
            <Button className={botaoPrincipalDoTopo} onClick={importar} disabled={faltaObrigatorio || ocupado}>
              {ocupado ? 'Importando...' : `Importar ${planilha?.rows.length ?? 0} leads`}
            </Button>
          </>
        )}
        {passo === 'resultado' && (
          <>
            <Button variant="outline" className={botaoSecundarioDoTopo} onClick={recomecar}>
              Importar outra planilha
            </Button>
            <Button className={botaoPrincipalDoTopo} onClick={fechar}>
              Fechar
            </Button>
          </>
        )}
        {passo === 'arquivo' && (
          <Button variant="outline" className={botaoSecundarioDoTopo} onClick={fechar}>
            Cancelar
          </Button>
        )}
      </MutaseDialog.Footer>
    </MutaseDialog>
  )
}

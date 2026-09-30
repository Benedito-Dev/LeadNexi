import type { Sheet, SheetCell } from './spreadsheet.ts'

/** Linhas por importação (o servidor recusa acima disso) */
export const IMPORT_LIMIT = 1000

/** Para onde vai cada coluna da planilha */
export type ColumnTarget =
  | 'name'
  | 'phone'
  | 'email'
  | 'instagramUsername'
  | 'estimatedValue'
  | 'status'
  | 'notes'
  /** Sem campo próprio: entra nas observações como "Coluna: valor" */
  | 'extra'
  | 'ignore'

export const TARGET_LABELS: Record<ColumnTarget, string> = {
  name: 'Nome',
  phone: 'Telefone',
  email: 'E-mail',
  instagramUsername: 'Instagram (@)',
  estimatedValue: 'Valor estimado',
  status: 'Status (vira a etapa)',
  notes: 'Observações',
  extra: 'Juntar às observações',
  ignore: 'Não importar',
}

/** Campos que só uma coluna pode ocupar */
export const SINGLE_TARGETS: ColumnTarget[] = ['name', 'phone', 'email', 'instagramUsername', 'estimatedValue', 'status']

/** Nomes de cabeçalho reconhecidos (sem acento, minúsculas), na ordem de prioridade */
const HEADER_HINTS: [ColumnTarget, RegExp][] = [
  ['ignore', /^(#|n|no|nº|n°|id|item)$/],
  ['name', /^(nome|negocio|empresa|cliente|lead|contato|razao social|nome fantasia|estabelecimento)$/],
  ['phone', /(telefone|celular|whats|fone|tel\b)/],
  ['email', /e-?mail/],
  ['instagramUsername', /(instagram|insta\b|^@$)/],
  ['estimatedValue', /^(valor|valor estimado|ticket|orcamento|preco)/],
  ['status', /^(status|etapa|situacao|fase|estagio)$/],
  ['notes', /^(observac|obs\b|anotac|notas?$)/],
]

export function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}@#º°\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/** Destino de cada coluna pelo nome do cabeçalho; o resto vai para as observações. */
export function guessTargets(headers: string[]): ColumnTarget[] {
  const taken = new Set<ColumnTarget>()
  return headers.map((header) => {
    const key = normalize(header)
    const hit = HEADER_HINTS.find(([target, pattern]) => pattern.test(key) && !taken.has(target))
    if (!hit) return 'extra'
    if (SINGLE_TARGETS.includes(hit[0])) taken.add(hit[0])
    return hit[0]
  })
}

/**
 * Linha que parece instrução ou anotação solta (só uma célula preenchida numa planilha de várias
 * colunas, como "Como usar:"): começa desmarcada na conferência.
 */
export function looksLikeNote(cells: SheetCell[]) {
  return cells.length > 2 && cells.filter((cell) => cell.text).length === 1
}

/** Valor em reais: "R$ 1.500,50", "1500.5" ou "1500" → 1500.5 (sem número: undefined) */
export function parseMoney(text: string): number | undefined {
  const clean = text.replace(/[^\d,.-]/g, '')
  if (!clean) return undefined
  // Com vírgula, ela é a casa decimal (padrão brasileiro) e os pontos são milhar
  const value = Number(clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean)
  return Number.isFinite(value) && value >= 0 ? value : undefined
}

/** Valor da célula para as observações: o link, quando o texto é só um rótulo ("Abrir no Maps") */
function cellValue(cell: SheetCell) {
  return cell.link ?? cell.text
}

export interface MappedLead {
  /** Linha na planilha (para mostrar na conferência) */
  line: number
  name: string
  phone?: string
  email?: string
  instagramUsername?: string
  estimatedValue?: number
  /** Texto do status (ligado a uma etapa na tela) */
  status: string
  notes?: string
}

/** Aplica as escolhas de colunas a uma linha: campos do lead + observações montadas. */
export function mapRow(sheet: Sheet, targets: ColumnTarget[], row: Sheet['rows'][number]): MappedLead {
  const lead: MappedLead = { line: row.line, name: '', status: '' }
  const notes: string[] = []
  const extras: string[] = []

  targets.forEach((target, index) => {
    const cell = row.cells[index] ?? { text: '' }
    const text = cell.text
    if (!text || target === 'ignore') return
    switch (target) {
      case 'name':
        lead.name = text
        break
      case 'phone':
        lead.phone = text
        break
      case 'email':
        lead.email = text
        break
      case 'instagramUsername':
        lead.instagramUsername = text
        break
      case 'estimatedValue':
        lead.estimatedValue = parseMoney(text)
        break
      case 'status':
        lead.status = text
        break
      case 'notes':
        notes.push(text)
        break
      case 'extra':
        extras.push(`${sheet.headers[index]}: ${cellValue(cell)}`)
        break
    }
  })

  const combined = [...notes, ...extras].join('\n')
  if (combined) lead.notes = combined
  return lead
}

/** Status distintos da planilha, na ordem em que aparecem */
export function distinctStatuses(leads: MappedLead[]) {
  return [...new Set(leads.map((lead) => lead.status).filter(Boolean))]
}

export interface StageChoice {
  id: string
  label: string
}

/** Palavras que indicam o fim do funil (ganho) ou o começo */
const CLOSED = /(fech|ganh|vend|conclu)/
const START = /(a contatar|novo|nova|entrada|prospec|lead)/

/**
 * Etapa sugerida para um status: mesmo nome, nome parecido, "Fechou" → última etapa, "A contatar"
 * → primeira; sem pista, a primeira.
 */
export function guessStage(status: string, stages: StageChoice[]): string {
  const key = normalize(status)
  const byName = (stage: StageChoice) => normalize(stage.label.split(' · ').at(-1) ?? stage.label)
  const exact = stages.find((stage) => byName(stage) === key)
  if (exact) return exact.id
  const similar = stages.find((stage) => {
    const name = byName(stage)
    return name.length >= 4 && (key.includes(name) || name.includes(key) || name.slice(0, 5) === key.slice(0, 5))
  })
  if (similar) return similar.id
  if (CLOSED.test(key)) return stages.at(-1)?.id ?? ''
  if (START.test(key)) return stages[0]?.id ?? ''
  return stages[0]?.id ?? ''
}

import type { Sheet, SheetCell } from './spreadsheet.ts'

export const IMPORT_LIMIT = 1000

export type ColumnTarget =
  | 'name'
  | 'phone'
  | 'phoneType'
  | 'email'
  | 'instagramUsername'
  | 'estimatedValue'
  | 'neighborhood'
  | 'address'
  | 'mapsUrl'
  | 'googlePlaceId'
  | 'googleRating'
  | 'googleReviewCount'
  | 'isNetwork'
  | 'adStatus'
  | 'cadenceStep'
  | 'followUpAt'
  | 'status'
  | 'notes'
  | 'extra'
  | 'ignore'

export const TARGET_LABELS: Record<ColumnTarget, string> = {
  name: 'Nome',
  phone: 'Telefone',
  phoneType: 'Tipo de telefone',
  email: 'E-mail',
  instagramUsername: 'Instagram (@)',
  estimatedValue: 'Valor estimado',
  neighborhood: 'Bairro',
  address: 'Endereço',
  mapsUrl: 'Link do Google Maps',
  googlePlaceId: 'ID do lugar no Maps',
  googleRating: 'Nota no Google',
  googleReviewCount: 'Avaliações no Google',
  isNetwork: 'É uma rede',
  adStatus: 'Anuncia',
  cadenceStep: 'Passo da cadência',
  followUpAt: 'Próximo contato',
  status: 'Status (vira a etapa)',
  notes: 'Observações',
  extra: 'Juntar às observações',
  ignore: 'Não importar',
}

export const SINGLE_TARGETS: ColumnTarget[] = [
  'name',
  'phone',
  'phoneType',
  'email',
  'instagramUsername',
  'estimatedValue',
  'neighborhood',
  'address',
  'mapsUrl',
  'googlePlaceId',
  'googleRating',
  'googleReviewCount',
  'isNetwork',
  'adStatus',
  'cadenceStep',
  'followUpAt',
  'status',
]

const HEADER_HINTS: [ColumnTarget, RegExp][] = [
  ['ignore', /^(#|n|no|nº|n°|id|item)$/],
  ['name', /^(nome|negocio|empresa|cliente|lead|contato|razao social|nome fantasia|estabelecimento)$/],
  ['phoneType', /(telefone tipo|tipo telefone|tipo do telefone|celular ou fixo)/],
  ['phone', /(telefone|celular|whats|fone|tel\b)/],
  ['email', /e-?mail/],
  ['instagramUsername', /(instagram|insta\b|^@$)/],
  ['estimatedValue', /^(valor|valor estimado|ticket|orcamento|preco)/],
  ['neighborhood', /^(bairro|regiao|região)/],
  ['address', /^(endereco|endereço|rua|logradouro)/],
  ['mapsUrl', /(maps|google maps|link.*google|url.*maps)/],
  ['googlePlaceId', /(place.?id|id.*lugar)/],
  ['googleRating', /(nota|avaliacao|avaliação).*(google)?|google.*(nota|avaliacao|avaliação)/],
  ['googleReviewCount', /(avaliacoes|avaliações|reviews).*(google)?|google.*(avaliacoes|avaliações|reviews)/],
  ['isNetwork', /^(rede|network|e uma rede|é uma rede)$/],
  ['adStatus', /^(anuncia|anúncia|anuncio|anúncio|ads|publicidade)/],
  ['cadenceStep', /(passo.*cadencia|passo.*cadência|cadencia|cadência)/],
  ['followUpAt', /(proximo.*passo|próximo.*passo|proximo.*contato|próximo.*contato|follow.?up)/],
  ['status', /^(status|etapa|situacao|situação|fase|estagio|estágio)$/],
  ['notes', /^(observac|observação|obs\b|anotac|notas?$)/],
]

export function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}@#º°\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

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

export function looksLikeNote(cells: SheetCell[]) {
  return cells.length > 2 && cells.filter((cell) => cell.text).length === 1
}

export function parseMoney(text: string): number | undefined {
  const clean = text.replace(/[^\d,.-]/g, '')
  if (!clean) return undefined
  const value = Number(clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean)
  return Number.isFinite(value) && value >= 0 ? value : undefined
}

function parseNumber(text: string): number | undefined {
  const value = Number(text.replace(/[^\d,.-]/g, '').replace(',', '.'))
  return Number.isFinite(value) && value >= 0 ? value : undefined
}

function parseInteger(text: string): number | undefined {
  const value = Number(text.replace(/\D/g, ''))
  return Number.isInteger(value) && value >= 0 ? value : undefined
}

function parseBoolean(text: string): boolean | undefined {
  const key = normalize(text)
  if (['sim', 'yes', 'true', '1', 'rede'].includes(key)) return true
  if (['nao', 'não', 'no', 'false', '0'].includes(key)) return false
  return undefined
}

function parseDate(text: string): string | undefined {
  const value = text.trim()
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value)
  if (br) return new Date(`${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}T12:00:00.000Z`).toISOString()
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00.000Z` : value
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function cellValue(cell: SheetCell) {
  return cell.link ?? cell.text
}

export interface MappedLead {
  line: number
  name: string
  status: string
  phone?: string
  phoneType?: string
  email?: string
  instagramUsername?: string
  estimatedValue?: number
  neighborhood?: string
  address?: string
  mapsUrl?: string
  googlePlaceId?: string
  googleRating?: number
  googleReviewCount?: number
  isNetwork?: boolean
  adStatus?: string
  cadenceStep?: number
  followUpAt?: string
  notes?: string
}

export function mapRow(sheet: Sheet, targets: ColumnTarget[], row: Sheet['rows'][number]): MappedLead {
  const lead: MappedLead = { line: row.line, name: '', status: '' }
  const notes: string[] = []

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
      case 'phoneType':
        lead.phoneType = text
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
      case 'neighborhood':
        lead.neighborhood = text
        break
      case 'address':
        lead.address = text
        break
      case 'mapsUrl':
        lead.mapsUrl = cellValue(cell)
        break
      case 'googlePlaceId':
        lead.googlePlaceId = text
        break
      case 'googleRating':
        lead.googleRating = parseNumber(text)
        break
      case 'googleReviewCount':
        lead.googleReviewCount = parseInteger(text)
        break
      case 'isNetwork':
        lead.isNetwork = parseBoolean(text)
        break
      case 'adStatus':
        lead.adStatus = text
        break
      case 'cadenceStep':
        lead.cadenceStep = parseInteger(text)
        break
      case 'followUpAt':
        lead.followUpAt = parseDate(text)
        break
      case 'status':
        lead.status = text
        break
      case 'notes':
      case 'extra':
        notes.push(target === 'extra' ? `${sheet.headers[index]}: ${cellValue(cell)}` : text)
        break
    }
  })

  if (notes.length > 0) lead.notes = notes.join('\n')
  return lead
}

export function distinctStatuses(leads: MappedLead[]) {
  return [...new Set(leads.map((lead) => lead.status).filter(Boolean))]
}

export interface StageChoice {
  id: string
  label: string
}

const CLOSED = /(fech|ganh|vend|conclu)/
const START = /(a contatar|novo|nova|entrada|prospec|lead)/

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

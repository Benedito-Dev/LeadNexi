/** Célula lida: o texto como aparece na planilha e, se houver, o link por trás dele */
export interface SheetCell {
  text: string
  link?: string
}

/** Uma aba: cabeçalhos (a primeira linha com 2+ células preenchidas) e as linhas abaixo deles */
export interface Sheet {
  name: string
  headers: string[]
  /** Linhas sem nenhuma célula preenchida já ficam de fora */
  rows: { line: number; cells: SheetCell[] }[]
}

/** Extensões aceitas no seletor de arquivo */
export const SPREADSHEET_ACCEPT = '.xlsx,.xls,.csv,.ods'

/**
 * Lê a planilha no navegador (o arquivo não sai do computador; só as linhas escolhidas vão para o
 * servidor). A biblioteca (SheetJS) só é baixada quando alguém importa.
 */
export async function readSpreadsheet(file: File): Promise<Sheet[]> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(await file.arrayBuffer(), { cellDates: true })

  return workbook.SheetNames.flatMap((name) => {
    const sheet = workbook.Sheets[name]
    if (!sheet?.['!ref']) return []
    const range = XLSX.utils.decode_range(sheet['!ref'])

    const lines: { line: number; cells: SheetCell[] }[] = []
    for (let r = range.s.r; r <= range.e.r; r++) {
      const cells: SheetCell[] = []
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = sheet[XLSX.utils.encode_cell({ r, c })]
        cells.push(readCell(cell))
      }
      if (cells.some((cell) => cell.text)) lines.push({ line: r + 1, cells })
    }

    const headerAt = lines.findIndex((row) => row.cells.filter((cell) => cell.text).length >= 2)
    if (headerAt === -1) return []
    const headers = lines[headerAt].cells.map((cell, index) => cell.text || `Coluna ${index + 1}`)
    return [{ name, headers, rows: lines.slice(headerAt + 1) }]
  })
}

/** Texto formatado (como aparece no Excel); data vira dd/mm/aaaa; link do hiperlink à parte. */
function readCell(cell: { v?: unknown; w?: string; l?: { Target?: string } } | undefined): SheetCell {
  if (!cell || cell.v === undefined || cell.v === null) return { text: '' }
  const text =
    cell.v instanceof Date
      ? cell.v.toLocaleDateString('pt-BR')
      : (cell.w ?? String(cell.v)).replace(/\s+/g, ' ').trim()
  const link = cell.l?.Target
  return link && /^https?:\/\//i.test(link) ? { text, link } : { text }
}

/** A aba com mais linhas (ex.: "Leads" e não "Resumo") */
export function mainSheet(sheets: Sheet[]) {
  return sheets.reduce<Sheet | undefined>((best, sheet) => (!best || sheet.rows.length > best.rows.length ? sheet : best), undefined)
}

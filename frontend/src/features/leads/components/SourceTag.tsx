// Etiqueta de origem do lead (BRAND.md, seção 8): pílula 12/700, padding 4×10.
const styles: Record<string, string> = {
  instagram: 'bg-violet-tint text-violet-300',
  whatsapp: 'bg-cyan-tint text-cyan',
}

export function SourceTag({ source }: { source: string }) {
  const style = styles[source.toLowerCase()] ?? 'bg-slate-tint text-slate-300'
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs leading-none font-bold ${style}`}>
      {source}
    </span>
  )
}

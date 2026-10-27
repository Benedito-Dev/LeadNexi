import { useState } from 'react'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react'
import { campoMenu } from '@/components/ui/campo-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Seletor } from '@/components/ui/seletor'
import { cn } from '@/lib/utils'

const DIAS_DA_SEMANA = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']
const HORARIOS_RAPIDOS = ['09:00', '12:00', '18:00', '20:00']
const HORAS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))
const MINUTOS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

const dois = (n: number) => String(n).padStart(2, '0')
/** "2026-10-27" no horário local. */
const chaveDoDia = (data: Date) => `${data.getFullYear()}-${dois(data.getMonth() + 1)}-${dois(data.getDate())}`

/** Dias da grade do mês: semanas inteiras, de segunda a domingo. */
function diasDoMes(mes: Date) {
  const primeiro = new Date(mes.getFullYear(), mes.getMonth(), 1)
  const inicio = new Date(primeiro)
  inicio.setDate(1 - ((primeiro.getDay() + 6) % 7))
  const ultimo = new Date(mes.getFullYear(), mes.getMonth() + 1, 0)
  const total = Math.ceil(((ultimo.getTime() - inicio.getTime()) / 86_400_000 + 1) / 7) * 7
  return Array.from({ length: total }, (_, i) => new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i))
}

/** "Ter, 27 out · 09:00" */
function rotulo(valor: string) {
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return null
  const dia = data.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '').replace(/ de /g, ' ')
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} · ${valor.slice(11, 16)}`
}

type Props = {
  id?: string
  /** "AAAA-MM-DDTHH:mm" no horário local (o mesmo formato do <input type="datetime-local">). */
  valor: string
  onChange: (valor: string) => void
  /** Mais cedo permitido, no mesmo formato: dias antes dele ficam desabilitados. */
  minimo?: string
  className?: string
}

/**
 * Data e hora no visual do LeadNexi (no lugar do seletor nativo do navegador): o campo mostra
 * "Ter, 27 out · 09:00" e abre o calendário do mês, horários rápidos e hora e minuto.
 */
export function SeletorDeDataEHora({ id, valor, onChange, minimo, className }: Props) {
  const dia = valor.slice(0, 10)
  const hora = valor.slice(11, 16) || '09:00'
  const [mes, setMes] = useState(() => (dia ? new Date(`${dia}T12:00`) : new Date()))
  const [hoje] = useState(() => chaveDoDia(new Date()))
  const diaMinimo = minimo?.slice(0, 10)

  const escolherDia = (data: Date) => onChange(`${chaveDoDia(data)}T${hora}`)
  const escolherHora = (novaHora: string) => onChange(`${dia || hoje}T${novaHora}`)
  const andar = (passo: -1 | 1) => setMes((m) => new Date(m.getFullYear(), m.getMonth() + passo, 1))

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" id={id} className={cn(campoMenu, 'h-11', className)}>
          <span className="flex items-center gap-2.5">
            <CalendarDays aria-hidden className="h-[18px] w-[18px] text-leadnexi-violet-texto" strokeWidth={1.75} />
            <span className={cn('tabular-nums', !rotulo(valor) && 'font-medium text-muted-foreground')}>{rotulo(valor) ?? 'Escolha a data e a hora'}</span>
          </span>
          <ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-4 font-marca">
        <div className="flex items-center justify-between">
          <button type="button" aria-label="Mês anterior" onClick={() => andar(-1)} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
            <ChevronLeft aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <span className="text-sm font-extrabold text-foreground first-letter:uppercase" aria-live="polite">
            {mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </span>
          <button type="button" aria-label="Próximo mês" onClick={() => andar(1)} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
            <ChevronRight aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1 text-center">
          {DIAS_DA_SEMANA.map((d, i) => (
            <span key={i} aria-hidden className="pb-1 text-[11px] font-bold text-muted-foreground">
              {d}
            </span>
          ))}
          {diasDoMes(mes).map((data) => {
            const chave = chaveDoDia(data)
            const escolhido = chave === dia
            const desabilitado = Boolean(diaMinimo && chave < diaMinimo)
            const foraDoMes = data.getMonth() !== mes.getMonth()
            return (
              <button
                key={chave}
                type="button"
                disabled={desabilitado}
                onClick={() => escolherDia(data)}
                aria-label={data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                aria-pressed={escolhido}
                className={cn(
                  'grid h-9 place-items-center rounded-lg text-sm font-semibold tabular-nums transition-colors',
                  escolhido
                    ? 'bg-leadnexi-violet-600 text-leadnexi-on-accent'
                    : desabilitado
                      ? 'cursor-not-allowed text-muted-foreground/35'
                      : cn('hover:bg-accent', foraDoMes ? 'text-muted-foreground/60' : 'text-foreground', chave === hoje && 'ring-1 ring-inset ring-leadnexi-violet/60'),
                )}
              >
                {data.getDate()}
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex flex-col gap-2.5 border-t border-border pt-4">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            <Clock3 aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
            Horário
          </span>
          <div className="grid grid-cols-4 gap-1.5">
            {HORARIOS_RAPIDOS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => escolherHora(h)}
                className={cn(
                  'h-8 rounded-lg border text-[13px] font-semibold tabular-nums transition-colors',
                  hora === h ? 'border-leadnexi-violet bg-leadnexi-violet/15 text-leadnexi-violet-texto' : 'border-border text-foreground hover:bg-accent',
                )}
              >
                {h}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Seletor valor={hora.slice(0, 2)} opcoes={HORAS.map((h) => ({ value: h, label: `${h} h` }))} onChange={(h) => escolherHora(`${h}:${hora.slice(3, 5)}`)} className="tabular-nums" />
            <span className="font-bold text-muted-foreground">:</span>
            <Seletor
              valor={MINUTOS.includes(hora.slice(3, 5)) ? hora.slice(3, 5) : ''}
              opcoes={MINUTOS.map((m) => ({ value: m, label: `${m} min` }))}
              onChange={(m) => escolherHora(`${hora.slice(0, 2)}:${m}`)}
              vazio={`${hora.slice(3, 5)} min`}
              className="tabular-nums"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

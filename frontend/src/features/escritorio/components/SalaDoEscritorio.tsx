import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Agente } from '../api'
import { estadoDoAgente, ROTULO_DO_ESTADO, type Estado } from '../estado'
import { ESCALA_DO_PERSONAGEM, FRENTES_DOS_SOFAS, lugarDoAgente, personagemDo, SALA, SALAS } from '../planta'
import { useCaminhada } from '../useCaminhada'
import { Personagem } from './Personagem'

/** Pixels da sala em % da tela (a sala escala junto com a largura). */
const emX = (x: number) => `${(x / SALA.largura) * 100}%`
const emY = (y: number) => `${(y / SALA.altura) * 100}%`

const PONTO_DO_ESTADO: Record<Estado, string> = {
  trabalhando: 'bg-leadnexi-cyan',
  terminou: 'bg-success-foreground',
  falhou: 'bg-leadnexi-danger',
  dormindo: 'bg-muted-foreground',
}

/** Janelas da parede (coordenadas da sala): de noite, o vidro escurece. */
const JANELAS = [
  { x: 30, y: 12 },
  { x: 264, y: 12 },
]

type SalaProps = { agentes: Agente[]; hora: string; selecionado: string | null; onSelecionar: (id: string) => void }

/**
 * A sala em pixel art (montada com o Pixel Office, de 2dPig, CC0) com os agentes por cima:
 * trabalhando, na cadeira da baia; dormindo ou terminado, no sofá da copa. Ao mudar de estado,
 * o personagem vai andando pelo corredor até o lugar novo.
 */
export function SalaDoEscritorio({ agentes, hora, selecionado, onSelecionar }: SalaProps) {
  const noite = Number(hora.slice(0, 2)) < 6 || Number(hora.slice(0, 2)) >= 18
  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-border" style={{ aspectRatio: `${SALA.largura} / ${SALA.altura}`, containerType: 'inline-size' }}>
      <img src="/escritorio/sala.png" alt="" className="absolute inset-0 h-full w-full select-none [image-rendering:pixelated]" draggable={false} />

      {JANELAS.map(({ x, y }) => (
        <span
          key={x}
          aria-hidden
          className={cn('absolute transition-opacity duration-1000', noite ? 'bg-[hsl(var(--sidebar-bg))] opacity-60' : 'opacity-0')}
          style={{ left: emX(x + 2), top: emY(y + 2), width: emX(22), height: emY(17) }}
        />
      ))}

      {/* O relógio da parede mostra a hora de Fortaleza */}
      <span
        aria-label={`Agora são ${hora} em Fortaleza`}
        className="absolute grid place-items-center bg-[hsl(var(--sidebar-bg))] font-mono font-bold leading-none tabular-nums text-leadnexi-danger"
        style={{ left: emX(150), top: emY(15), width: emX(19), height: emY(6), fontSize: '1.5cqw' }}
      >
        {hora}
      </span>

      {SALAS.map(({ nome, x, y }) => (
        <span
          key={nome}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 px-3 py-0.5 text-xs font-bold text-[hsl(var(--sidebar-bg))] shadow-sm sm:text-sm"
          style={{ left: emX(x), top: emY(y) }}
        >
          {nome}
        </span>
      ))}

      {agentes.map((agente, indice) => (
        <AgenteNaSala key={agente.id} agente={agente} indice={indice} selecionado={selecionado === agente.id} onSelecionar={() => onSelecionar(agente.id)} />
      ))}

      {FRENTES_DOS_SOFAS.map(({ arquivo, x, y, largura, altura }) => (
        <img
          key={arquivo}
          src={`/escritorio/${arquivo}.png`}
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none absolute select-none [image-rendering:pixelated]"
          style={{ left: emX(x), top: emY(y), width: emX(largura), height: emY(altura) }}
        />
      ))}
    </div>
  )
}

type AgenteNaSalaProps = { agente: Agente; indice: number; selecionado: boolean; onSelecionar: () => void }

/** Um agente na sala: anda até o lugar do estado dele, com a plaquinha do nome em cima. */
function AgenteNaSala({ agente, indice, selecionado, onSelecionar }: AgenteNaSalaProps) {
  const estado = estadoDoAgente(agente)
  const { posicao, andando, paraEsquerda } = useCaminhada(lugarDoAgente(indice, estado === 'trabalhando' || estado === 'falhou'))
  const { largura: larguraOriginal, altura: alturaOriginal } = personagemDo(agente.character)
  const largura = larguraOriginal * ESCALA_DO_PERSONAGEM
  const altura = alturaOriginal * ESCALA_DO_PERSONAGEM
  const animacao = andando ? 'lnx-andando' : estado === 'trabalhando' ? 'lnx-robo-digita' : estado === 'dormindo' ? undefined : 'lnx-robo-respira'

  return (
    <button
      type="button"
      onClick={onSelecionar}
      aria-label={`${agente.name}: ${ROTULO_DO_ESTADO[estado]}`}
      className="group absolute outline-none"
      // A posição é o ponto dos pés: o personagem fica centrado nele e de pé em cima
      style={{ left: emX(posicao.x - largura / 2), top: emY(posicao.y - altura), width: emX(largura), height: emY(altura) }}
    >
      {/* Plaquinha com o nome, no estilo das referências */}
      <span
        className={cn(
          'absolute bottom-full left-1/2 mb-1 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-[hsl(var(--sidebar-bg))]/90 px-2.5 py-1 text-xs font-bold text-white shadow-md ring-2 transition-shadow',
          selecionado ? 'ring-leadnexi-violet' : 'ring-transparent group-hover:ring-white/40',
        )}
      >
        <span aria-hidden className={cn('h-2 w-2 rounded-full', PONTO_DO_ESTADO[estado])} />
        {agente.name}
        <BalaoDoEstado estado={estado} />
      </span>
      <span className={cn('block h-full w-full', animacao)}>
        <Personagem character={agente.character} dormindo={estado === 'dormindo' && !andando} className={cn('block', paraEsquerda && '-scale-x-100')} />
      </span>
    </button>
  )
}

/** O que o agente está fazendo, ao lado do nome: digitando, dormindo, pronto ou com erro. */
function BalaoDoEstado({ estado }: { estado: Estado }) {
  if (estado === 'trabalhando') {
    return (
      <span className="flex gap-0.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className="lnx-pontinho h-1 w-1 rounded-full bg-leadnexi-cyan" />
        ))}
      </span>
    )
  }
  if (estado === 'terminou') return <Check aria-hidden className="h-3 w-3 text-success-foreground" strokeWidth={3} />
  if (estado === 'falhou') return <span aria-hidden className="font-mono text-leadnexi-danger">!</span>
  return (
    <span aria-hidden className="font-mono text-[10px] text-white/60">
      z<span className="text-[8px]">z</span>
    </span>
  )
}

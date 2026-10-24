import { useState } from 'react'
import { TIPOS_DE_ACAO, type Missao } from './missoes'

/**
 * A fila do dia com um lead em foco: ações primeiro (responder, follow-ups, novas lojas) e os
 * compromissos no fim, com anterior/próximo. Quando uma missão sai da fila (feita ou adiada), a
 * próxima ocupa o mesmo lugar.
 */
export function useFilaEmFoco(fila: Missao[]) {
  const acoes = fila.filter((m) => TIPOS_DE_ACAO.includes(m.tipo))
  const todas = [...acoes, ...fila.filter((m) => m.tipo === 'meeting')]
  const [indice, setIndice] = useState(0)
  const atual = Math.min(indice, Math.max(todas.length - 1, 0))

  return {
    acoes,
    todas,
    atual,
    emFoco: todas[atual] as Missao | undefined,
    irPara: setIndice,
    anterior: () => setIndice(Math.max(atual - 1, 0)),
    proxima: () => setIndice(Math.min(atual + 1, todas.length - 1)),
  }
}

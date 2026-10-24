import type { Opcao } from './types'

// Abertura do quadro: ?pipeline -> último usado -> primeiro (igual ao Rizar, DEV-285).
const CHAVE = 'leadnexi.crm.pipeline'

export function lerPipelineLembrado(): string | null {
  try {
    return localStorage.getItem(CHAVE)
  } catch {
    return null
  }
}

export function gravarPipelineLembrado(id: string) {
  try {
    localStorage.setItem(CHAVE, id)
  } catch {
    // Sem armazenamento, o quadro abre no primeiro pipeline
  }
}

export function escolherPipelineInicial(opcoes: Opcao[], doEndereco: string | null, lembrado: string | null) {
  return (
    opcoes.find((o) => o.value === doEndereco) ?? opcoes.find((o) => o.value === lembrado) ?? opcoes[0] ?? null
  )
}

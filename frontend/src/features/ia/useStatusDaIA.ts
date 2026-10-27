import { useEffect, useState } from 'react'
import { buscarStatusDaIA, type StatusDaIA } from './api'

// A situação da IA só muda com o servidor reiniciando: uma busca serve a sessão inteira.
let buscando: Promise<StatusDaIA | null> | null = null

/** A IA está ligada no servidor? `null` enquanto pergunta (ou se não deu para saber). */
export function useStatusDaIA() {
  const [status, setStatus] = useState<StatusDaIA | null>(null)

  useEffect(() => {
    let ativo = true
    buscando ??= buscarStatusDaIA().catch(() => {
      buscando = null
      return null
    })
    void buscando.then((resposta) => ativo && setStatus(resposta))
    return () => {
      ativo = false
    }
  }, [])

  return status
}

/** Dica dos botões de IA: o que a ação faz ou, com a IA desligada, o que falta. */
export function dicaDaIA(status: StatusDaIA | null, oQueFaz: string) {
  if (status === null) return 'Conferindo se a IA está ligada…'
  return status.configured ? oQueFaz : 'IA desligada: falta a chave da Anthropic (ANTHROPIC_API_KEY) no servidor'
}

import { useState } from 'react'
import { ErroDeApi } from '@/lib/api'
import { iniciarConexao } from './api'

/** "Conectar Instagram": pede o link do login oficial e manda o navegador para ele. */
export function useConectar() {
  const [conectando, setConectando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const conectar = async () => {
    setConectando(true)
    setErro(null)
    try {
      window.location.assign((await iniciarConexao()).url)
    } catch (e) {
      // 503: app da Meta ainda não configurado (a mensagem do servidor explica)
      setErro(e instanceof ErroDeApi && e.status === 503 ? e.message : 'Não foi possível iniciar a conexão. Tente de novo.')
      setConectando(false)
    }
  }

  return { conectar, conectando, erro }
}

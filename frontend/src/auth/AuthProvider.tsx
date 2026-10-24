import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { aoExpirarSessao, api, corpo, definirAccessToken, renovarSessao, type Sessao } from '@/lib/api'
import { AuthContexto, type Usuario } from './contexto'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null)
  const [carregando, setCarregando] = useState(true)

  // Restaura a sessão pelo cookie de refresh antes de decidir entre login e app
  useEffect(() => {
    aoExpirarSessao(() => setUser(null))
    renovarSessao()
      .then((sessao) => setUser(sessao?.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setCarregando(false))
  }, [])

  const conferir = useCallback(
    (email: string, senha: string) =>
      api<Sessao>('/auth/login', { method: 'POST', body: corpo({ email, password: senha }) }),
    [],
  )

  const abrirSessao = useCallback((sessao: Sessao) => {
    definirAccessToken(sessao.accessToken)
    setUser(sessao.user)
  }, [])

  const sair = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' })
    } finally {
      definirAccessToken(null)
      setUser(null)
    }
  }, [])

  const valor = useMemo(
    () => ({ user, carregando, conferir, abrirSessao, sair }),
    [user, carregando, conferir, abrirSessao, sair],
  )
  return <AuthContexto.Provider value={valor}>{children}</AuthContexto.Provider>
}


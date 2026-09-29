// Cliente HTTP base. O Vite faz proxy de /api para o backend (localhost:3000).
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
  return res.json() as Promise<T>
}

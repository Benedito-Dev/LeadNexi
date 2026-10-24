import { toast } from 'sonner'

type TipoToast = 'success' | 'error' | 'warning' | 'info'

/** Mesmo contrato do `addToast` do Rizar: com título e mensagem, a mensagem vira a descrição. */
export function addToast(tipo: TipoToast, titulo: string, mensagem?: string, duracao = 3000) {
  const opcoes: { duration: number; description?: string } = { duration: duracao }
  if (titulo && mensagem) opcoes.description = mensagem
  toast[tipo](titulo || mensagem || '', opcoes)
}

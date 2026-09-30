import { InstagramIcon } from '../../../brand/icons.tsx'

/**
 * Botão que abre a conversa com o lead no direct do Instagram (nova aba). Sem @, não aparece.
 * Violeta: a cor do Instagram na marca (a mesma do ícone de origem).
 */
export function InstagramLink({ name, username }: { name: string; username: string | null }) {
  if (!username) return null
  return (
    <a
      href={`https://ig.me/m/${encodeURIComponent(username)}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
      aria-label={`Conversar com ${name} no direct do Instagram`}
      title="Conversar no direct"
      className="grid size-8 shrink-0 place-items-center rounded-sm text-violet-300 transition-colors hover:bg-violet-tint"
    >
      <InstagramIcon aria-hidden size={18} />
    </a>
  )
}

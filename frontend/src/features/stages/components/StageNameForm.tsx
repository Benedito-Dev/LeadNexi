import { useRef, useState, type FormEvent } from 'react'
import { ApiError } from '../../../lib/api.ts'

const MAX_LENGTH = 60

/**
 * Campo curto para nomear uma etapa (criar ou renomear): Enter salva, Esc cancela,
 * sair do campo salva se houver mudança.
 */
export function StageNameForm({
  initialName = '',
  label,
  saving,
  error,
  onSubmit,
  onCancel,
}: {
  initialName?: string
  label: string
  saving: boolean
  error: Error | null
  onSubmit: (name: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initialName)
  const [validation, setValidation] = useState<string | null>(null)
  // Enter desativa o campo, o que pode disparar blur: evita salvar duas vezes
  const done = useRef(false)
  const message = validation ?? (error ? errorMessage(error) : null)

  function cancel() {
    done.current = true
    onCancel()
  }

  function submit(event?: FormEvent) {
    event?.preventDefault()
    if (done.current || saving) return
    const trimmed = name.trim()
    if (!trimmed) {
      setValidation('Informe o nome da etapa.')
      return
    }
    if (trimmed === initialName) return cancel()
    setValidation(null)
    onSubmit(trimmed)
  }

  return (
    <form onSubmit={submit} className="flex min-w-0 flex-1 flex-col gap-1">
      <input
        autoFocus
        value={name}
        maxLength={MAX_LENGTH}
        disabled={saving}
        aria-label={label}
        aria-invalid={message !== null}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            cancel()
          }
        }}
        // Clicar fora confirma, como em outros editores de quadro; campo vazio só cancela
        onBlur={() => (name.trim() ? submit() : cancel())}
        className="h-8 w-full min-w-0 rounded-xs border border-cyan bg-navy-800 px-2 text-ui font-bold text-white outline-none aria-[invalid=true]:border-danger"
      />
      {message && (
        <p role="alert" className="text-xs font-semibold text-danger">
          {message}
        </p>
      )}
    </form>
  )
}

function errorMessage(error: Error): string {
  if (error instanceof ApiError && error.status < 500) return error.message
  return 'Não foi possível salvar. Tente de novo.'
}

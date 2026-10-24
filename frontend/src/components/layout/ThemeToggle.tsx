import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useTheme, type ModoTema } from '@/lib/theme'

const OPCOES: { modo: ModoTema; rotulo: string; Icon: typeof Sun }[] = [
  { modo: 'light', rotulo: 'Claro', Icon: Sun },
  { modo: 'dark', rotulo: 'Escuro', Icon: Moon },
  { modo: 'auto', rotulo: 'Sistema', Icon: Monitor },
]

export function ThemeToggle() {
  const { mode, setMode, isDark } = useTheme()
  const Icon = mode === 'auto' ? Monitor : isDark ? Moon : Sun
  const atual = OPCOES.find((o) => o.modo === mode)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Tema: ${atual?.rotulo}`}>
          <Icon className="h-5 w-5" aria-hidden />
          <span className="sr-only">Alternar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {OPCOES.map(({ modo, rotulo, Icon: IconeOpcao }) => (
          <DropdownMenuItem key={modo} onSelect={() => setMode(modo)} className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <IconeOpcao className="h-4 w-4" aria-hidden />
              {rotulo}
            </span>
            {mode === modo && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

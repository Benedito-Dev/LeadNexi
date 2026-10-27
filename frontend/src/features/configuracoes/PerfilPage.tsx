import { useRef, useState, type FormEvent } from 'react'
import {
  Camera,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Lock,
  Mail,
  Monitor,
  Moon,
  Palette,
  ShieldCheck,
  Sun,
  Trash2,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/auth/contexto'
import { fotoDoUsuario } from '@/auth/foto'
import { FormField } from '@/components/form/FormField'
import { botaoPrincipalDoTopo, botaoSecundarioDoTopo } from '@/components/list-page/botoes'
import { Button } from '@/components/ui/button'
import { FotoRedonda } from '@/components/ui/foto-redonda'
import { ErroDeApi } from '@/lib/api'
import { useTheme, type ModoTema } from '@/lib/theme'
import { addToast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { MensagemDeErro } from '../instagram/components/CartaoAppDaMeta'
import { enviarFotoDePerfil, removerFotoDePerfil, salvarPerfil, trocarSenha } from './api'
import { recortarFotoDePerfil } from './fotoDePerfil'
import { CampoComIcone, SecaoDeConfiguracao } from './SecaoDeConfiguracao'

/** Erro do servidor em português quando for culpa do pedido; senão, a mensagem genérica. */
const mensagemDoErro = (e: unknown, generica: string) =>
  e instanceof ErroDeApi && e.status !== null && e.status < 500
    ? e.status === 409
      ? 'Esse e-mail já está em uso.'
      : e.message
    : generica

/**
 * Configurações › Perfil: um cartão só, com as seções separadas por uma linha. Em cada seção, o
 * que é e por que à esquerda; os campos à direita, lado a lado, e o botão logo abaixo do que salva.
 */
export function PerfilPage() {
  return (
    <div className="divide-y divide-border rounded-xl border border-border bg-card">
      <CabecalhoDoPerfil />
      <SecaoDeConfiguracao Icone={UserRound} titulo="Seus dados" texto="O nome aparece no menu. O e‑mail é o que você usa para entrar.">
        <SeusDados />
      </SecaoDeConfiguracao>
      <SecaoDeConfiguracao Icone={ShieldCheck} titulo="Senha" texto="Este aparelho continua conectado. Os outros precisam entrar de novo.">
        <TrocarSenha />
      </SecaoDeConfiguracao>
      <SecaoDeConfiguracao Icone={Palette} titulo="Tema" texto="Vale para este navegador. O botão no topo troca também.">
        <Tema />
      </SecaoDeConfiguracao>
    </div>
  )
}

/** Topo do cartão: a foto (com a câmera para trocar), o nome e o e-mail, e trocar ou remover a foto. */
function CabecalhoDoPerfil() {
  const { user, atualizarUsuario } = useAuth()
  const [ocupado, setOcupado] = useState<'enviando' | 'removendo' | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const seletor = useRef<HTMLInputElement>(null)
  const escolher = () => seletor.current?.click()

  const trocar = async (arquivo: File | undefined) => {
    if (!arquivo) return
    setOcupado('enviando')
    setErro(null)
    try {
      atualizarUsuario(await enviarFotoDePerfil(await recortarFotoDePerfil(arquivo)))
      addToast('success', 'Foto trocada')
    } catch (e) {
      setErro(e instanceof ErroDeApi ? mensagemDoErro(e, 'Não foi possível enviar a foto.') : 'Não deu para ler essa imagem. Tente outra (JPG ou PNG).')
    } finally {
      setOcupado(null)
      if (seletor.current) seletor.current.value = ''
    }
  }

  const remover = async () => {
    setOcupado('removendo')
    setErro(null)
    try {
      atualizarUsuario(await removerFotoDePerfil())
    } catch (e) {
      setErro(mensagemDoErro(e, 'Não foi possível remover a foto.'))
    } finally {
      setOcupado(null)
    }
  }

  return (
    <div className="flex flex-col gap-3 p-6">
      <div className="flex flex-wrap items-center gap-5">
        <input ref={seletor} type="file" accept="image/*" className="hidden" onChange={(e) => void trocar(e.target.files?.[0])} />
        {/* A foto inteira abre o seletor; a câmera no canto mostra que dá para trocar */}
        <button
          type="button"
          onClick={escolher}
          disabled={ocupado !== null}
          aria-label={user?.avatarId ? 'Trocar foto' : 'Colocar foto'}
          className="group relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-leadnexi-cyan"
        >
          <FotoRedonda
            src={fotoDoUsuario(user?.avatarId)}
            nome={user?.name ?? 'U'}
            className="h-20 w-20 bg-leadnexi-violet/15 text-3xl text-leadnexi-violet-texto ring-2 ring-leadnexi-violet/40 ring-offset-2 ring-offset-card transition-opacity group-hover:opacity-80"
          />
          <span className="absolute -bottom-0.5 -right-0.5 grid h-8 w-8 place-items-center rounded-full border-2 border-card bg-leadnexi-violet-600 text-leadnexi-on-accent shadow-sm transition-transform group-hover:scale-105">
            {ocupado === 'enviando' ? <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" strokeWidth={2} /> : <Camera aria-hidden className="h-4 w-4" strokeWidth={2} />}
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-xl font-extrabold tracking-[-0.01em] text-foreground">{user?.name}</p>
          <p className="m-0 mt-0.5 flex items-center gap-1.5 truncate text-sm font-medium text-muted-foreground">
            <Mail aria-hidden className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            {user?.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user?.avatarId && (
            <Button type="button" variant="ghost" className="gap-2 text-muted-foreground hover:bg-leadnexi-danger/10 hover:text-leadnexi-danger" disabled={ocupado !== null} onClick={() => void remover()}>
              {ocupado === 'removendo' ? <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" strokeWidth={1.75} /> : <Trash2 aria-hidden className="h-4 w-4" strokeWidth={1.75} />}
              Remover
            </Button>
          )}
          <Button type="button" variant="outline" className={botaoSecundarioDoTopo} disabled={ocupado !== null} onClick={escolher} title="JPG ou PNG. A foto é recortada em quadrado.">
            <Camera aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            {user?.avatarId ? 'Trocar foto' : 'Colocar foto'}
          </Button>
        </div>
      </div>
      {erro && <MensagemDeErro texto={erro} />}
    </div>
  )
}

function SeusDados() {
  const { user, atualizarUsuario } = useAuth()
  const [nome, setNome] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const mudou = nome.trim() !== user?.name || email.trim().toLowerCase() !== user?.email

  const salvar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (!nome.trim() || !email.trim()) return setErro('Preencha o nome e o e-mail.')
    setSalvando(true)
    setErro(null)
    try {
      const salvo = await salvarPerfil({ name: nome.trim(), email: email.trim() })
      atualizarUsuario(salvo)
      setNome(salvo.name)
      setEmail(salvo.email)
      addToast('success', 'Dados salvos', salvo.email !== user?.email ? 'Use o e-mail novo no próximo login.' : undefined)
    } catch (e) {
      setErro(mensagemDoErro(e, 'Não foi possível salvar. Tente de novo.'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form noValidate onSubmit={(e) => void salvar(e)} className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <FormField label="Nome" htmlFor="perfil-nome">
          <CampoComIcone Icone={UserRound} id="perfil-nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} autoComplete="name" />
        </FormField>
        <FormField label="E-mail" htmlFor="perfil-email">
          <CampoComIcone Icone={Mail} id="perfil-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} autoComplete="email" />
        </FormField>
      </div>
      {erro && <MensagemDeErro texto={erro} />}
      <div className="flex items-center gap-3">
        <Button type="submit" className={cn(botaoPrincipalDoTopo, 'h-10 px-5')} disabled={!mudou || salvando}>
          {salvando ? <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" strokeWidth={1.75} /> : <Check aria-hidden className="h-4 w-4" strokeWidth={2} />}
          Salvar
        </Button>
        {mudou && !salvando && <span className="text-[13px] font-semibold text-warn-foreground">Alterações não salvas</span>}
      </div>
    </form>
  )
}

const SENHAS_VAZIAS = { atual: '', nova: '', confirmar: '' }

/** Força da senha nova em 4 níveis: tamanho, maiúscula e minúscula, número, símbolo. */
function forcaDaSenha(senha: string): { nivel: 0 | 1 | 2 | 3 | 4; rotulo: string; cor: string; texto: string } {
  if (!senha) return { nivel: 0, rotulo: '', cor: '', texto: '' }
  if (senha.length < 8) return { nivel: 1, rotulo: 'Curta demais', cor: 'bg-leadnexi-danger', texto: 'text-leadnexi-danger' }
  const extras = [/[a-z]/.test(senha) && /[A-Z]/.test(senha), /\d/.test(senha), /[^A-Za-z0-9]/.test(senha), senha.length >= 12].filter(Boolean).length
  if (extras <= 1) return { nivel: 2, rotulo: 'Fraca', cor: 'bg-warn-foreground', texto: 'text-warn-foreground' }
  if (extras === 2) return { nivel: 3, rotulo: 'Boa', cor: 'bg-success-foreground', texto: 'text-success-foreground' }
  return { nivel: 4, rotulo: 'Forte', cor: 'bg-success-foreground', texto: 'text-success-foreground' }
}

function TrocarSenha() {
  const [senhas, setSenhas] = useState(SENHAS_VAZIAS)
  const [mostrar, setMostrar] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const forca = forcaDaSenha(senhas.nova)
  const confere = senhas.confirmar.length > 0 && senhas.confirmar === senhas.nova

  const salvar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (!senhas.atual || !senhas.nova) return setErro('Preencha a senha atual e a nova.')
    if (senhas.nova.length < 8) return setErro('A senha nova precisa ter pelo menos 8 caracteres.')
    if (senhas.nova !== senhas.confirmar) return setErro('A confirmação não é igual à senha nova.')
    setSalvando(true)
    setErro(null)
    try {
      await trocarSenha(senhas.atual, senhas.nova)
      setSenhas(SENHAS_VAZIAS)
      setMostrar(false)
      addToast('success', 'Senha trocada', 'Os outros aparelhos conectados precisam entrar de novo.')
    } catch (e) {
      setErro(mensagemDoErro(e, 'Não foi possível trocar a senha. Tente de novo.'))
    } finally {
      setSalvando(false)
    }
  }

  const olho = (
    <button
      type="button"
      onClick={() => setMostrar((m) => !m)}
      aria-label={mostrar ? 'Esconder as senhas' : 'Mostrar as senhas'}
      title={mostrar ? 'Esconder' : 'Mostrar'}
      className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {mostrar ? <EyeOff aria-hidden className="h-4 w-4" strokeWidth={1.75} /> : <Eye aria-hidden className="h-4 w-4" strokeWidth={1.75} />}
    </button>
  )

  const campo = (chave: keyof typeof SENHAS_VAZIAS) => ({
    id: `senha-${chave}`,
    type: mostrar ? 'text' : 'password',
    value: senhas[chave],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setSenhas((s) => ({ ...s, [chave]: e.target.value })),
    autoComplete: chave === 'atual' ? 'current-password' : 'new-password',
    maxLength: 200,
  })

  return (
    <form noValidate onSubmit={(e) => void salvar(e)} className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <FormField label="Senha atual" htmlFor="senha-atual">
          <CampoComIcone Icone={Lock} direita={olho} {...campo('atual')} />
        </FormField>
        <div aria-hidden className="hidden lg:block" />
        <FormField label="Senha nova" htmlFor="senha-nova">
          <CampoComIcone Icone={KeyRound} {...campo('nova')} placeholder="Pelo menos 8 caracteres" />
          {/* Barra de força: 4 traços finos (até 4 px, como o gradiente da marca pede) */}
          {forca.nivel > 0 && (
            <div className="mt-2 flex items-center gap-3" aria-live="polite">
              <div className="flex flex-1 gap-1">
                {[1, 2, 3, 4].map((n) => (
                  <span key={n} className={cn('h-1 flex-1 rounded-full', n <= forca.nivel ? forca.cor : 'bg-muted')} />
                ))}
              </div>
              <span className={cn('text-xs font-semibold', forca.texto)}>{forca.rotulo}</span>
            </div>
          )}
        </FormField>
        <FormField label="Repita a senha nova" htmlFor="senha-confirmar">
          <CampoComIcone
            Icone={KeyRound}
            {...campo('confirmar')}
            direita={confere ? <Check aria-label="Confere" className="mr-2 h-4 w-4 text-success-foreground" strokeWidth={2.25} /> : undefined}
          />
          {senhas.confirmar.length > 0 && !confere && <p className="mb-0 mt-2 text-xs font-semibold text-muted-foreground">Ainda não é igual à senha nova.</p>}
        </FormField>
      </div>
      {erro && <MensagemDeErro texto={erro} />}
      <div>
        <Button type="submit" className={cn(botaoPrincipalDoTopo, 'h-10 px-5')} disabled={salvando || !senhas.atual || !senhas.nova || !senhas.confirmar}>
          {salvando ? <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" strokeWidth={1.75} /> : <ShieldCheck aria-hidden className="h-4 w-4" strokeWidth={1.75} />}
          Trocar senha
        </Button>
      </div>
    </form>
  )
}

const TEMAS: { modo: ModoTema; rotulo: string; dica: string; Icone: LucideIcon }[] = [
  { modo: 'dark', rotulo: 'Escuro', dica: 'Azul-marinho', Icone: Moon },
  { modo: 'light', rotulo: 'Claro', dica: 'Fundo branco', Icone: Sun },
  { modo: 'auto', rotulo: 'Sistema', dica: 'Do computador', Icone: Monitor },
]

/** Três cartões de tema: o escolhido fica em violeta, com o check. */
function Tema() {
  const { mode, setMode } = useTheme()
  return (
    <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Tema">
      {TEMAS.map(({ modo, rotulo, dica, Icone }) => {
        const escolhido = mode === modo
        return (
          <button
            key={modo}
            type="button"
            role="radio"
            aria-checked={escolhido}
            onClick={() => setMode(modo)}
            className={cn(
              'relative flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leadnexi-cyan',
              escolhido ? 'border-leadnexi-violet/60 bg-leadnexi-violet/10' : 'border-border hover:border-leadnexi-violet/30 hover:bg-accent',
            )}
          >
            <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-lg', escolhido ? 'bg-leadnexi-violet/20 text-leadnexi-violet-texto' : 'bg-muted text-muted-foreground')}>
              <Icone aria-hidden className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-foreground">{rotulo}</span>
              <span className="block text-xs font-medium text-muted-foreground">{dica}</span>
            </span>
            {escolhido && (
              <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-leadnexi-violet-600 text-leadnexi-on-accent">
                <Check aria-hidden className="h-3 w-3" strokeWidth={3} />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

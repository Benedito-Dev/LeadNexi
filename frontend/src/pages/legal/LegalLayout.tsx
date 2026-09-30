import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { LeadNexiLogo } from '../../brand/LeadNexiMark.tsx'
import { COMPANY } from './company.ts'

// Páginas públicas de texto (política de privacidade, exclusão de dados): abrem sem login, porque
// a Meta e qualquer pessoa precisam ler. Coluna de leitura de até 672 px sobre o fundo navy.
export function LegalLayout({ title, updatedAt, children }: { title: string; updatedAt: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-navy">
      <title>{`${title} · LeadNexi`}</title>
      <header className="px-6 py-6 sm:px-10">
        <Link to="/" aria-label="LeadNexi, ir para o início" className="inline-flex rounded-sm">
          <LeadNexiLogo size={28} />
        </Link>
      </header>
      <main className="mx-auto max-w-2xl px-6 pb-20 sm:px-10">
        <h1 className="text-h1">{title}</h1>
        <p className="mt-3 text-small text-slate-400">Atualizada em {updatedAt}</p>
        <div className="mt-10 flex flex-col gap-8 text-body text-slate-300">{children}</div>
      </main>
    </div>
  )
}

/** Seção com título (h2) */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-h2">{title}</h2>
      {children}
    </section>
  )
}

/** Link para o perfil do Instagram de quem opera o LeadNexi (canal de contato) */
export function InstagramContact() {
  return (
    <a
      href={`https://www.instagram.com/${COMPANY.instagram}/`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-cyan underline underline-offset-2"
    >
      @{COMPANY.instagram}
    </a>
  )
}

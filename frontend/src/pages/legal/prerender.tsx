import type { ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { DataDeletionPage } from './DataDeletionPage.tsx'
import { PrivacyPage } from './PrivacyPage.tsx'

/**
 * Páginas públicas geradas em HTML no build (scripts/prerender-legal.mjs): o robô da Meta, que
 * confere os endereços do app, lê o texto sem rodar JavaScript. No navegador, o React assume.
 */
const PAGES: { path: string; file: string; title: string; element: ReactNode }[] = [
  {
    path: '/privacidade',
    file: 'privacidade.html',
    title: 'Política de privacidade · LeadNexi',
    element: <PrivacyPage />,
  },
  {
    path: '/exclusao-de-dados',
    file: 'exclusao-de-dados.html',
    title: 'Exclusão de dados · LeadNexi',
    element: <DataDeletionPage />,
  },
]

export function renderLegalPages() {
  return PAGES.map(({ path, file, title, element }) => ({
    file,
    title,
    html: renderToString(<StaticRouter location={path}>{element}</StaticRouter>),
  }))
}

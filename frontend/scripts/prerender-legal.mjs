// Gera dist/privacidade.html e dist/exclusao-de-dados.html com o texto já no HTML (o vercel.json
// aponta /privacidade e /exclusao-de-dados para eles). Roda depois do `vite build` e do build SSR.
import { readFileSync, rmSync, writeFileSync } from 'node:fs'

const template = readFileSync('dist/index.html', 'utf8')
const { renderLegalPages } = await import('../dist-ssr/prerender.js')

for (const { file, title, html } of renderLegalPages()) {
  if (!template.includes('<div id="root"></div>')) throw new Error('index.html sem <div id="root"></div>')
  const page = template
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    // O <title> que o React põe junto do conteúdo já foi para o <head>
    .replace('<div id="root"></div>', `<div id="root">${html.replace(/<title>[^<]*<\/title>/, '')}</div>`)
  writeFileSync(`dist/${file}`, page)
  console.log(`✔ dist/${file}`)
}
rmSync('dist-ssr', { recursive: true, force: true })

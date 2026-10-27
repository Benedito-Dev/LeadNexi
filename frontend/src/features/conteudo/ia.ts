import type { ImagemPreparada } from './imagens'

// TEMPORÁRIO: a IA que lê a imagem e escreve a legenda ainda não existe (etapa 5 do mapa,
// docs/produto/MAPA.md). Quando existir, esta função manda as imagens ao servidor e devolve a
// legenda dela; o botão e o carregando da tela já estão prontos para isso.
export async function escreverLegendaComIA(imagens: ImagemPreparada[]): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 1800))
  const formato = imagens.length > 1 ? `um carrossel de ${imagens.length} imagens` : 'uma foto'
  return `Legenda de exemplo: aqui a IA vai ler ${formato}, entender sobre o que é o post e escrever a legenda pronta.\n\nQuando a funcionalidade entrar, este texto vira a legenda de verdade.\n\n#AlvoDigital #Fortaleza`
}

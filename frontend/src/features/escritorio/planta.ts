/**
 * Planta da sala (public/escritorio/sala.png, 320 x 200 px, montada por
 * scripts/escritorio/montar-sala.mjs). Coordenadas em pixels da sala; a tela converte em %.
 */
export const SALA = { largura: 320, altura: 200 }

/** Personagens do Pixel Office (2dPig, CC0), em public/escritorio/personagens/, com o tamanho de cada um. */
export const PERSONAGENS: Record<string, { arquivo: string; largura: number; altura: number }> = {
  criador: { arquivo: 'ruiva', largura: 19, altura: 24 },
  estrategista: { arquivo: 'oculos', largura: 13, altura: 21 },
  prospector: { arquivo: 'moreno', largura: 15, altura: 23 },
  // Livres para os próximos agentes: 'ruivaSolta' (17 x 23) e 'morena' (17 x 23)
}

export const personagemDo = (character: string) => PERSONAGENS[character] ?? PERSONAGENS.criador

/** Os personagens do pacote têm cabeção: na sala aparecem a 80% para caber nos móveis. */
export const ESCALA_DO_PERSONAGEM = 0.8

/** Frente dos sofás (public/escritorio/sofa-*.png), desenhada por cima de quem está sentado. */
export const FRENTES_DOS_SOFAS = [
  { arquivo: 'sofa-laranja', x: 16, y: 148, largura: 33, altura: 8 },
  { arquivo: 'sofa-azul', x: 58, y: 148, largura: 33, altura: 8 },
  { arquivo: 'sofa-verde', x: 100, y: 148, largura: 33, altura: 8 },
]

/** As salas, com a plaquinha do nome em cima do tapete. */
export const SALAS = [
  { nome: 'Estúdio', x: 60, y: 68 },
  { nome: 'Estratégia', x: 166, y: 68 },
  { nome: 'Comercial', x: 272, y: 68 },
  // Embaixo do tapete: em cima ficam as plaquinhas de quem está no sofá
  { nome: 'Copa', x: 120, y: 190 },
]

/** Ponto dos pés de cada agente: na cadeira da baia (trabalhando) ou no sofá da copa (descansando). */
const MESAS = [
  { x: 26, y: 104 },
  { x: 132, y: 104 },
  { x: 238, y: 104 },
]
const SOFAS = [
  { x: 32, y: 151 },
  { x: 74, y: 151 },
  { x: 116, y: 151 },
]

/** Lugar do agente pela ordem: trabalhando ou com erro, na mesa; dormindo ou terminado, no sofá. */
export function lugarDoAgente(indice: number, naMesa: boolean) {
  const lugares = naMesa ? MESAS : SOFAS
  return lugares[indice % lugares.length]
}

/** Corredor entre as baias e a copa (altura dos pés): ninguém atravessa móvel, todo mundo passa por aqui. */
export const CORREDOR_Y = 127

/** Velocidade de quem anda, em pixels da sala por segundo. */
export const PASSOS_POR_SEGUNDO = 28

type Ponto = { x: number; y: number }

/** Caminho de um lugar a outro: sai da sala pelo corredor, anda nele e entra na sala de destino. */
export function caminhoEntre(de: Ponto, para: Ponto): Ponto[] {
  if (de.x === para.x && de.y === para.y) return []
  return [
    { x: de.x, y: CORREDOR_Y },
    { x: para.x, y: CORREDOR_Y },
    para,
  ]
}

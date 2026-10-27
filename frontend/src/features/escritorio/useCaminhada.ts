import { useEffect, useRef, useState } from 'react'
import { caminhoEntre, PASSOS_POR_SEGUNDO } from './planta'

type Ponto = { x: number; y: number }

const querMenosMovimento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Leva o personagem até `alvo` andando pelo corredor (ver `caminhoEntre`). Devolve onde ele está
 * agora, se está andando e para que lado olha. Na primeira vez (e para quem pede menos movimento),
 * aparece direto no lugar.
 */
export function useCaminhada(alvo: Ponto) {
  const [posicao, setPosicao] = useState(alvo)
  const [andando, setAndando] = useState(false)
  const [paraEsquerda, setParaEsquerda] = useState(false)
  const atual = useRef(alvo)
  const { x: alvoX, y: alvoY } = alvo

  useEffect(() => {
    const destino = { x: alvoX, y: alvoY }
    const inicio = atual.current
    if (inicio.x === destino.x && inicio.y === destino.y) return
    // Quem pede menos movimento: aparece direto no lugar novo
    const trechos = querMenosMovimento() ? [destino] : caminhoEntre(inicio, destino)
    const instantaneo = trechos.length === 1

    // Um trecho por vez, em linha reta, na mesma velocidade (tudo dentro do quadro de animação)
    let indice = 0
    let de = inicio
    let comecouEm = 0
    let comecou = false
    let quadro = 0

    const passo = (agora: number) => {
      if (instantaneo) {
        atual.current = destino
        setPosicao(destino)
        return
      }
      if (!comecou) {
        comecou = true
        comecouEm = agora
        setAndando(true)
      }
      const para = trechos[indice]
      const distancia = Math.hypot(para.x - de.x, para.y - de.y)
      const duracao = (distancia / PASSOS_POR_SEGUNDO) * 1000
      const t = duracao === 0 ? 1 : Math.min(1, (agora - comecouEm) / duracao)
      if (para.x !== de.x) setParaEsquerda(para.x < de.x)
      const aqui = { x: de.x + (para.x - de.x) * t, y: de.y + (para.y - de.y) * t }
      atual.current = aqui
      setPosicao(aqui)
      if (t < 1) {
        quadro = requestAnimationFrame(passo)
        return
      }
      indice++
      if (indice >= trechos.length) {
        setAndando(false)
        return
      }
      de = para
      comecouEm = agora
      quadro = requestAnimationFrame(passo)
    }
    quadro = requestAnimationFrame(passo)
    return () => {
      cancelAnimationFrame(quadro)
      setAndando(false)
    }
  }, [alvoX, alvoY])

  return { posicao, andando, paraEsquerda }
}

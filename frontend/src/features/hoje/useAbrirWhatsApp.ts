import { useEffect, useRef, useState } from 'react'

/**
 * Abre o WhatsApp numa aba nova e avisa quando a pessoa volta para o LeadNexi (`voltou`), para
 * perguntar o que aconteceu lá. Se o navegador bloquear a aba, pergunta na hora.
 */
export function useAbrirWhatsApp() {
  const [abrindo, setAbrindo] = useState(false)
  const [voltou, setVoltou] = useState(false)
  const abertoEm = useRef<number | null>(null)

  useEffect(() => {
    const aoVoltar = () => {
      if (abertoEm.current === null || Date.now() - abertoEm.current < 500) return
      abertoEm.current = null
      setAbrindo(false)
      setVoltou(true)
    }
    window.addEventListener('focus', aoVoltar)
    return () => window.removeEventListener('focus', aoVoltar)
  }, [])

  const abrir = (link: string) => {
    abertoEm.current = Date.now()
    setAbrindo(true)
    if (!window.open(link, '_blank', 'noopener,noreferrer')) {
      abertoEm.current = null
      setAbrindo(false)
      setVoltou(true)
    }
  }

  return { abrindo, voltou, setVoltou, abrir }
}

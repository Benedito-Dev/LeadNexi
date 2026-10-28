import { useState } from 'react'
import { ErroDeApi } from '@/lib/api'
import { gerarMensagem, type MensagemGerada } from '../ia/api'
import { useStatusDaIA } from '../ia/useStatusDaIA'
import type { OrigemDaMensagem } from './api'

/**
 * "Gerar mensagem" do lead em foco: a IA escreve 1 mensagem + 2 variações a partir dos dados e do
 * histórico do lead. Nada é enviado; o texto escolhido vai para o campo da mensagem.
 */
export function useMensagemDaIA(leadId: string) {
  const status = useStatusDaIA()
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sugestao, setSugestao] = useState<MensagemGerada | null>(null)
  const [escolhida, setEscolhida] = useState<number | null>(null)

  const escolher = (indice: number) => {
    if (!sugestao) return null
    setEscolhida(indice)
    return sugestao.options[indice].text
  }

  /** Gera e já devolve o texto da opção principal. */
  const gerar = async () => {
    setGerando(true)
    setErro(null)
    try {
      const nova = await gerarMensagem(leadId)
      setSugestao(nova)
      setEscolhida(0)
      return nova.options[0]?.text ?? null
    } catch (e) {
      setErro(e instanceof ErroDeApi ? e.message : 'A IA não respondeu. Tente de novo.')
      return null
    } finally {
      setGerando(false)
    }
  }

  const opcao = sugestao && escolhida !== null ? sugestao.options[escolhida] : null
  const origem: OrigemDaMensagem | null = opcao ? { templateId: `ia-${opcao.template}`, variation: opcao.label } : null

  return {
    ligada: status?.configured === true,
    status,
    gerando,
    erro,
    sugestao,
    escolhida,
    origem,
    gerar,
    escolher,
    /** O texto deixou de ser da IA (a pessoa trocou por um modelo da cadência). */
    desmarcar: () => setEscolhida(null),
  }
}

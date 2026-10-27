import { BotaoDaIA } from '@/components/ia/BotaoDaIA'
import { OpcoesDaIA as Opcoes } from '@/components/ia/OpcoesDaIA'
import { MensagemDeErro } from '../../instagram/components/CartaoAppDaMeta'
import { dicaDaIA } from '../../ia/useStatusDaIA'
import type { useMensagemDaIA } from '../useMensagemDaIA'

type MensagemDaIA = ReturnType<typeof useMensagemDaIA>

export function BotaoGerarMensagem({ ia, onGerada }: { ia: MensagemDaIA; onGerada: (texto: string) => void }) {
  return (
    <BotaoDaIA
      rotulo={ia.sugestao ? 'Gerar de novo' : 'Gerar mensagem'}
      ocupado={ia.gerando}
      desabilitado={!ia.ligada || ia.gerando}
      dica={dicaDaIA(ia.status, 'A IA escreve a mensagem a partir dos dados e do histórico do lead. Nada é enviado.')}
      onClick={async () => {
        const texto = await ia.gerar()
        if (texto) onGerada(texto)
      }}
    />
  )
}

/** As 3 opções da IA e os avisos da escolhida; ou o erro, se a IA falhou. */
export function OpcoesDaIA({ ia, onEscolher }: { ia: MensagemDaIA; onEscolher: (texto: string) => void }) {
  if (ia.erro) return <MensagemDeErro texto={ia.erro} />
  if (!ia.sugestao) return null
  return (
    <Opcoes
      opcoes={ia.sugestao.options}
      escolhida={ia.escolhida}
      onEscolher={(indice) => {
        const texto = ia.escolher(indice)
        if (texto) onEscolher(texto)
      }}
    />
  )
}

import { Link } from 'react-router'
import { COMPANY } from './company.ts'
import { InstagramContact, LegalLayout, LegalSection } from './LegalLayout.tsx'

// Instruções de exclusão de dados (pública): exigida pela Meta junto com a política de privacidade.
export function DataDeletionPage() {
  return (
    <LegalLayout title="Exclusão de dados" updatedAt="30 de setembro de 2026">
      <p>
        Você pode pedir a exclusão dos seus dados no LeadNexi, o sistema de atendimento da {COMPANY.name}, a qualquer
        momento. Veja o que é tratado na{' '}
        <Link to="/privacidade" className="text-cyan underline underline-offset-2">
          Política de privacidade
        </Link>
        .
      </p>

      <LegalSection title={`Se você conversou com a ${COMPANY.name}`}>
        <ol className="flex list-decimal flex-col gap-2 pl-5">
          <li>
            Mande uma mensagem para <InstagramContact /> no direct do Instagram pedindo a exclusão dos seus dados.
          </li>
          <li>Em até 30 dias apagamos o seu cadastro e o histórico das suas mensagens no LeadNexi.</li>
          <li>Confirmamos a exclusão pelo mesmo canal.</li>
        </ol>
      </LegalSection>

      <LegalSection title="Se você é dono da conta do Instagram conectada">
        <p>
          Desconectar a conta no LeadNexi apaga na hora o acesso guardado. Você também pode remover o acesso pelo
          próprio Instagram, em Configurações → Apps e sites.
        </p>
      </LegalSection>
    </LegalLayout>
  )
}

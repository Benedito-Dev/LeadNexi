import { Link } from 'react-router'
import { COMPANY } from './company.ts'
import { InstagramContact, LegalLayout, LegalSection } from './LegalLayout.tsx'

// Política de privacidade (pública): exigida pela Meta para publicar o app que conecta o Instagram.
export function PrivacyPage() {
  return (
    <LegalLayout title="Política de privacidade" updatedAt="30 de setembro de 2026">
      <p>
        O LeadNexi é o sistema de atendimento e vendas (CRM) usado pela {COMPANY.name} para organizar os contatos de
        clientes e publicar conteúdo no perfil <InstagramContact /> do Instagram. Esta página explica quais dados o
        LeadNexi trata, para quê e como pedir a exclusão.
      </p>

      <LegalSection title="Quais dados tratamos">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            <strong className="text-white">De quem manda mensagem para o @{COMPANY.instagram}:</strong> o identificador
            da conversa fornecido pelo Instagram, o nome e o nome de usuário públicos do perfil e o conteúdo das
            mensagens enviadas.
          </li>
          <li>
            <strong className="text-white">Dados informados no atendimento:</strong> telefone, e-mail e outras
            informações que a própria pessoa passa ao conversar com a {COMPANY.name}.
          </li>
          <li>
            <strong className="text-white">Da conta do Instagram da {COMPANY.name}:</strong> nome de usuário, nome, foto
            do perfil e o acesso concedido pelo login oficial do Instagram (guardado criptografado).
          </li>
          <li>
            <strong className="text-white">Dos posts:</strong> imagens e legendas publicadas pelo LeadNexi.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Para que usamos">
        <p>
          Para responder e atender quem entra em contato, acompanhar cada atendimento até a venda e publicar posts no
          perfil da {COMPANY.name}. Não vendemos dados e não os usamos para publicidade de terceiros.
        </p>
      </LegalSection>

      <LegalSection title="Com quem compartilhamos">
        <p>
          Só com os serviços que fazem o LeadNexi funcionar: Meta (Instagram), para receber mensagens e publicar posts;
          Vercel, que hospeda o sistema; Neon, o banco de dados; Telnyx, que guarda as imagens dos posts; e Upstash, que
          agenda as publicações.
        </p>
      </LegalSection>

      <LegalSection title="Por quanto tempo guardamos">
        <p>
          Enquanto houver relacionamento com a {COMPANY.name} ou até a pessoa pedir a exclusão. O acesso à conta do
          Instagram é apagado assim que a conta é desconectada do LeadNexi.
        </p>
      </LegalSection>

      <LegalSection title="Segurança">
        <p>O LeadNexi só abre com login, as conexões usam HTTPS e o acesso ao Instagram fica guardado criptografado.</p>
      </LegalSection>

      <LegalSection title="Seus direitos">
        <p>
          Pela Lei Geral de Proteção de Dados (LGPD), você pode pedir para ver, corrigir ou excluir os seus dados. Veja
          como em{' '}
          <Link to="/exclusao-de-dados" className="text-cyan underline underline-offset-2">
            Exclusão de dados
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="Contato">
        <p>
          Fale com a {COMPANY.name} pelo direct do Instagram: <InstagramContact />.
        </p>
      </LegalSection>
    </LegalLayout>
  )
}

import { createFileRoute } from "@tanstack/react-router";
import { Cookie, Database, Eye, MapPin, Scale, Share2, ShieldCheck, Target } from "lucide-react";
import { LegalContactCard, LegalPage, LegalSection } from "@/components/legal-page";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPolicy,
});

const updatedAt = "02/06/2026";

function PrivacyPolicy() {
  return (
    <LegalPage
      title="Política de Privacidade"
      updatedAt={updatedAt}
      intro="Este documento explica, de forma direta, quais dados tratamos no app ChegaAí e como você pode exercer seus direitos pela LGPD."
      crossLink={{ to: "/terms", label: "Leia também os Termos de Uso" }}
    >
      <LegalSection icon={Database} number={1} title="Dados que coletamos">
        Coletamos dados de conta, como nome, email, credenciais protegidas e tipo de conta. Também
        tratamos informações que você publica ou informa no app, como foto de perfil, avaliações,
        check-ins, eventos salvos, comentários, posts, grupos e dados de estabelecimento quando você
        gerencia um local.
      </LegalSection>

      <LegalSection icon={MapPin} number={2} title="Localização">
        A localização é usada para mostrar bares, eventos e lugares próximos. No app, a permissão de
        localização é solicitada antes do uso. Guardamos uma localização recente e a preferência de
        raio no armazenamento local do seu dispositivo para melhorar a experiência. Você pode limpar
        esses dados na tela de Perfil.
      </LegalSection>

      <LegalSection icon={Target} number={3} title="Por que usamos seus dados">
        Usamos seus dados para criar e proteger sua conta, exibir conteúdo relevante, personalizar
        recomendações, permitir interações sociais, operar perfis de estabelecimentos, prevenir
        abuso e cumprir obrigações legais.
      </LegalSection>

      <LegalSection icon={Eye} number={4} title="Dados públicos">
        Algumas informações que você decide publicar podem ficar visíveis para outros usuários, como
        nome exibido, foto, avaliações, comentários, posts, check-ins e informações de
        estabelecimentos ou eventos.
      </LegalSection>

      <LegalSection icon={Share2} number={5} title="Compartilhamento e fornecedores">
        Usamos fornecedores de infraestrutura, autenticação, banco de dados, notificações e
        hospedagem necessários para operar o produto. Não vendemos seus dados pessoais.
      </LegalSection>

      <LegalSection icon={Cookie} number={6} title="Armazenamento local, cookies e tokens">
        O app pode usar armazenamento local, cookies técnicos e tokens de sessão para manter você
        conectado, lembrar preferências e operar recursos como localização e tema visual.
      </LegalSection>

      <LegalSection icon={ShieldCheck} number={7} title="Segurança e retenção">
        Aplicamos controles técnicos proporcionais, mas nenhum sistema é totalmente imune a riscos.
        Mantemos dados enquanto sua conta estiver ativa ou enquanto forem necessários para
        segurança, auditoria, obrigações legais e operação do serviço.
      </LegalSection>

      <LegalSection icon={Scale} number={8} title="Seus direitos LGPD">
        Você pode pedir confirmação de tratamento, acesso, correção, anonimização, bloqueio,
        eliminação, portabilidade, informação sobre compartilhamento e revisão de decisões
        automatizadas quando aplicável. Também pode revogar consentimentos quando o tratamento
        depender deles.
      </LegalSection>

      <LegalContactCard title="Como falar conosco">
        Para solicitações de privacidade, use o canal de suporte informado no app ou envie sua
        solicitação ao responsável pelo ChegaAí. Enquanto o canal definitivo não estiver publicado,
        registre o pedido diretamente com a equipe do projeto.
      </LegalContactCard>
    </LegalPage>
  );
}

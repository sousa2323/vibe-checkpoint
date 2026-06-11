import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPolicy,
});

const updatedAt = "02/06/2026";

function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <article className="mx-auto max-w-3xl">
        <Link to="/auth" className="text-sm font-bold text-primary underline underline-offset-4">
          Voltar
        </Link>

        <p className="mt-8 text-xs font-black uppercase tracking-[0.24em] text-muted-foreground">
          ChegaAí
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Política de Privacidade</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Última atualização: {updatedAt}. Este documento explica, de forma direta, quais dados
          tratamos no app ChegaAí e como você pode exercer seus direitos pela LGPD.
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed">
          <Section title="1. Dados que coletamos">
            Coletamos dados de conta, como nome, email, credenciais protegidas e tipo de conta.
            Também tratamos informações que você publica ou informa no app, como foto de perfil,
            avaliações, check-ins, eventos salvos, comentários, posts, grupos e dados de
            estabelecimento quando você gerencia um local.
          </Section>

          <Section title="2. Localização">
            A localização é usada para mostrar bares, eventos e lugares próximos. No app, a
            permissão de localização é solicitada antes do uso. Guardamos uma localização recente e
            a preferência de raio no armazenamento local do seu dispositivo para melhorar a
            experiência. Você pode limpar esses dados na tela de Perfil.
          </Section>

          <Section title="3. Por que usamos seus dados">
            Usamos seus dados para criar e proteger sua conta, exibir conteúdo relevante,
            personalizar recomendações, permitir interações sociais, operar perfis de
            estabelecimentos, prevenir abuso e cumprir obrigações legais.
          </Section>

          <Section title="4. Dados públicos">
            Algumas informações que você decide publicar podem ficar visíveis para outros usuários,
            como nome exibido, foto, avaliações, comentários, posts, check-ins e informações de
            estabelecimentos ou eventos.
          </Section>

          <Section title="5. Compartilhamento e fornecedores">
            Usamos fornecedores de infraestrutura, autenticação, banco de dados, notificações e
            hospedagem necessários para operar o produto. Não vendemos seus dados pessoais.
          </Section>

          <Section title="6. Armazenamento local, cookies e tokens">
            O app pode usar armazenamento local, cookies técnicos e tokens de sessão para manter
            você conectado, lembrar preferências e operar recursos como localização e tema visual.
          </Section>

          <Section title="7. Segurança e retenção">
            Aplicamos controles técnicos proporcionais, mas nenhum sistema é totalmente imune a
            riscos. Mantemos dados enquanto sua conta estiver ativa ou enquanto forem necessários
            para segurança, auditoria, obrigações legais e operação do serviço.
          </Section>

          <Section title="8. Seus direitos LGPD">
            Você pode pedir confirmação de tratamento, acesso, correção, anonimização, bloqueio,
            eliminação, portabilidade, informação sobre compartilhamento e revisão de decisões
            automatizadas quando aplicável. Também pode revogar consentimentos quando o tratamento
            depender deles.
          </Section>

          <Section title="9. Como falar conosco">
            Para solicitações de privacidade, use o canal de suporte informado no app ou envie sua
            solicitação ao responsável pelo ChegaAí. Enquanto o canal definitivo não estiver
            publicado, registre o pedido diretamente com a equipe do projeto.
          </Section>
        </div>

      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-black tracking-tight">{title}</h2>
      <p className="mt-2 text-muted-foreground">{children}</p>
    </section>
  );
}

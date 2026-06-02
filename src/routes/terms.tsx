import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  component: Terms,
});

const updatedAt = "02/06/2026";

function Terms() {
  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <article className="mx-auto max-w-3xl">
        <Link to="/auth" className="text-sm font-bold text-primary underline underline-offset-4">
          Voltar
        </Link>

        <p className="mt-8 text-xs font-black uppercase tracking-[0.24em] text-muted-foreground">
          ChegaAí
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Termos de Uso</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Última atualização: {updatedAt}. Ao usar o ChegaAí, você concorda com estes termos e com a
          nossa Política de Privacidade.
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed">
          <Section title="1. Uso do serviço">
            O ChegaAí ajuda usuários a descobrir bares, eventos e experiências próximas. Você deve
            usar o app de forma lícita, respeitosa e compatível com a finalidade do serviço.
          </Section>

          <Section title="2. Conta e segurança">
            Você é responsável por manter seus dados de acesso protegidos e por atividades feitas na
            sua conta. Informe a equipe caso suspeite de uso indevido.
          </Section>

          <Section title="3. Conteúdo publicado">
            Você é responsável por avaliações, comentários, posts, eventos, imagens e demais
            conteúdos que publicar. Não publique conteúdo ilegal, ofensivo, enganoso, de terceiros
            sem autorização ou que viole direitos de propriedade intelectual.
          </Section>

          <Section title="4. Estabelecimentos e eventos">
            Contas de estabelecimento devem informar dados verdadeiros sobre o local, eventos,
            horários, capacidade, endereço e contatos. Informações falsas ou abusivas podem ser
            removidas.
          </Section>

          <Section title="5. Localização e disponibilidade">
            Recursos baseados em localização dependem de permissões do dispositivo, cobertura,
            internet e dados informados por usuários ou estabelecimentos. Distâncias e resultados
            podem variar.
          </Section>

          <Section title="6. Moderação">
            Podemos remover conteúdo, limitar recursos ou suspender contas quando houver violação
            destes termos, risco de segurança, fraude, abuso ou obrigação legal.
          </Section>

          <Section title="7. Privacidade">
            O tratamento de dados pessoais segue a Política de Privacidade. Ao criar uma conta, você
            confirma que leu os documentos aplicáveis.
          </Section>

          <Section title="8. Alterações">
            Podemos atualizar estes termos para refletir mudanças no produto, regras legais ou
            operação. A versão vigente ficará disponível no app.
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

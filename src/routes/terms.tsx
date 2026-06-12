import { createFileRoute } from "@tanstack/react-router";
import {
  Compass,
  FileText,
  KeyRound,
  Lock,
  MapPin,
  MessageSquare,
  ShieldAlert,
  Store,
} from "lucide-react";
import { LegalPage, LegalSection } from "@/components/legal-page";

export const Route = createFileRoute("/terms")({
  component: Terms,
});

const updatedAt = "02/06/2026";

function Terms() {
  return (
    <LegalPage
      title="Termos de Uso"
      updatedAt={updatedAt}
      intro="Ao usar o ChegaAí, você concorda com estes termos e com a nossa Política de Privacidade."
      crossLink={{ to: "/privacy", label: "Leia também a Política de Privacidade" }}
    >
      <LegalSection icon={Compass} number={1} title="Uso do serviço">
        O ChegaAí ajuda usuários a descobrir bares, eventos e experiências próximas. Você deve usar
        o app de forma lícita, respeitosa e compatível com a finalidade do serviço.
      </LegalSection>

      <LegalSection icon={KeyRound} number={2} title="Conta e segurança">
        Você é responsável por manter seus dados de acesso protegidos e por atividades feitas na sua
        conta. Informe a equipe caso suspeite de uso indevido.
      </LegalSection>

      <LegalSection icon={MessageSquare} number={3} title="Conteúdo publicado">
        Você é responsável por avaliações, comentários, posts, eventos, imagens e demais conteúdos
        que publicar. Não publique conteúdo ilegal, ofensivo, enganoso, de terceiros sem autorização
        ou que viole direitos de propriedade intelectual.
      </LegalSection>

      <LegalSection icon={Store} number={4} title="Estabelecimentos e eventos">
        Contas de estabelecimento devem informar dados verdadeiros sobre o local, eventos, horários,
        capacidade, endereço e contatos. Informações falsas ou abusivas podem ser removidas.
      </LegalSection>

      <LegalSection icon={MapPin} number={5} title="Localização e disponibilidade">
        Recursos baseados em localização dependem de permissões do dispositivo, cobertura, internet
        e dados informados por usuários ou estabelecimentos. Distâncias e resultados podem variar.
      </LegalSection>

      <LegalSection icon={ShieldAlert} number={6} title="Moderação">
        Podemos remover conteúdo, limitar recursos ou suspender contas quando houver violação destes
        termos, risco de segurança, fraude, abuso ou obrigação legal.
      </LegalSection>

      <LegalSection icon={Lock} number={7} title="Privacidade">
        O tratamento de dados pessoais segue a Política de Privacidade. Ao criar uma conta, você
        confirma que leu os documentos aplicáveis.
      </LegalSection>

      <LegalSection icon={FileText} number={8} title="Alterações">
        Podemos atualizar estes termos para refletir mudanças no produto, regras legais ou operação.
        A versão vigente ficará disponível no app.
      </LegalSection>
    </LegalPage>
  );
}

import type { AuthLocalization } from "@neondatabase/auth-ui/server";

export const ptBRAuthLocalization = {
  APP: "ChegaAí",
  ACCOUNT: "Conta",
  ACCOUNTS: "Contas",
  ADD_ACCOUNT: "Adicionar conta",
  ALREADY_HAVE_AN_ACCOUNT: "Já tem uma conta?",
  CANCEL: "Cancelar",
  CONTINUE: "Continuar",
  DELETE: "Excluir",
  DONE: "Concluído",
  DONT_HAVE_AN_ACCOUNT: "Ainda não tem uma conta?",
  EMAIL: "Email",
  EMAIL_DESCRIPTION: "Informe o email que você quer usar para entrar.",
  EMAIL_INSTRUCTIONS: "Informe um email válido.",
  EMAIL_PLACEHOLDER: "voce@email.com",
  EMAIL_REQUIRED: "O email é obrigatório",
  FORGOT_PASSWORD: "Esqueci a senha",
  FORGOT_PASSWORD_ACTION: "Enviar link de recuperação",
  FORGOT_PASSWORD_DESCRIPTION: "Informe seu email para recuperar a senha",
  FORGOT_PASSWORD_EMAIL: "Confira seu email para redefinir a senha.",
  FORGOT_PASSWORD_LINK: "Esqueceu sua senha?",
  NAME: "Nome",
  PASSWORD: "Senha",
  PASSWORD_PLACEHOLDER: "Senha",
  PASSWORD_REQUIRED: "A senha é obrigatória",
  SIGN_IN: "Entrar",
  SIGN_IN_ACTION: "Entrar",
  SIGN_IN_DESCRIPTION: "Entre com seu email para acessar sua conta.",
  SIGN_IN_USERNAME_DESCRIPTION: "Entre com seu usuário ou email para acessar sua conta.",
  SIGN_IN_WITH: "Entrar com",
  SIGN_OUT: "Sair",
  SIGN_UP: "Criar conta",
  SIGN_UP_ACTION: "Criar conta",
  SIGN_UP_DESCRIPTION: "Informe seus dados para criar sua conta.",
  SIGN_UP_EMAIL: "Confira seu email para verificar a conta.",
  USERNAME: "Usuário",
  SIGN_IN_USERNAME_PLACEHOLDER: "Usuário ou email",
  REQUEST_FAILED: "Não foi possível concluir a ação. Tente novamente.",
  USER_ALREADY_EXISTS: "Este email já está cadastrado. Tente entrar ou use outro email.",
  INVALID_EMAIL_OR_PASSWORD: "Email ou senha inválidos. Confira os dados e tente novamente.",
  INVALID_PASSWORD: "Senha inválida. Confira e tente novamente.",
  INVALID_EMAIL: "Informe um email válido.",
  PASSWORD_TOO_SHORT: "A senha precisa ter mais caracteres.",
  PASSWORD_TOO_LONG: "A senha está muito longa.",
} satisfies AuthLocalization;

const authToastMessages: Record<string, string> = {
  "User already exists": "Este email já está cadastrado. Tente entrar ou use outro email.",
  "User already exists. Use another email.":
    "Este email já está cadastrado. Tente entrar ou use outro email.",
  "Invalid email or password": "Email ou senha inválidos. Confira os dados e tente novamente.",
  "Invalid password": "Senha inválida. Confira e tente novamente.",
  "Invalid email": "Informe um email válido.",
  "Request failed": "Não foi possível concluir a ação. Tente novamente.",
  "Something went wrong": "Algo deu errado. Tente novamente em instantes.",
};

export function formatAuthToastMessage(message: unknown) {
  if (typeof message !== "string") return "Não foi possível concluir a ação. Tente novamente.";

  const normalizedMessage = message.trim();
  return authToastMessages[normalizedMessage] ?? normalizedMessage;
}

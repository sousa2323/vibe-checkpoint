# Deploy MVP

Guia direto para subir o ChegaAi em produção controlada na Cloudflare.

## 1. Banco de produção

Crie ou selecione o banco Neon de produção.

Rode as migrations nesta ordem:

```sql
-- banco novo
\i migrations/001_mvp_schema.sql

-- banco existente ou incremental
\i migrations/002_mvp_indexes.sql
\i migrations/003_add_venue_state.sql
```

Antes de aplicar em banco com dados reais, faça snapshot/backup no Neon.

## 2. Variáveis e secrets

Configure os valores reais na Cloudflare:

```bash
npx wrangler secret put DATABASE_URL
npx wrangler secret put NEON_AUTH_URL
```

Configure também `VITE_NEON_AUTH_URL` no ambiente que roda o build/deploy. Ele precisa apontar para o mesmo projeto Neon Auth usado por `NEON_AUTH_URL`.

Valores esperados:

```bash
DATABASE_URL="postgresql://..."
VITE_NEON_AUTH_URL="https://SEU-PROJETO.neonauth.REGIAO.aws.neon.tech/neondb/auth"
NEON_AUTH_URL="https://SEU-PROJETO.neonauth.REGIAO.aws.neon.tech/neondb/auth"
```

Nunca coloque valores reais em `.env.example`, `.env`, `.env.local` ou no repositório.

## 3. Cloudflare

O Worker está configurado em `wrangler.jsonc` com o nome `chegaai-mvp`.

Antes do deploy público, confirme no painel da Cloudflare:

- domínio ou route apontando para o Worker;
- `nodejs_compat` ativo;
- secrets cadastrados;
- logs disponíveis para acompanhar erros do primeiro acesso.

## 4. Validação local

Rode:

```bash
npm run check
npm run deploy:dry-run
```

Se os dois passarem, rode:

```bash
npm run deploy
```

## 5. QA pós-deploy

Depois do deploy, execute o checklist completo em `docs/mvp-producao-checklist.md`.

Fluxos que bloqueiam produção pública se falharem:

- login e cadastro;
- edição de perfil;
- cadastro de estabelecimento;
- upload de imagem;
- criação, edição e cancelamento de evento;
- feed, mapa e detalhe do evento;
- salvar evento, check-in e review;
- dashboard do estabelecimento;
- post no feed com nome/avatar correto.

Se ações autenticadas falharem com `Usuário não autenticado.`, verifique se o cookie `session_token` do Neon Auth está chegando nas server functions. Para produção pública, o auth precisa estar em domínio/proxy compatível com o domínio do app.

## 6. Beta controlado

Antes de abrir publicamente, rode com 3 a 5 estabelecimentos reais por alguns dias.

Acompanhe:

- erros no Worker;
- falhas de auth;
- imagens que não carregam;
- eventos sem localização;
- reviews/check-ins inconsistentes;
- feedback dos donos sobre criação de evento e dashboard.

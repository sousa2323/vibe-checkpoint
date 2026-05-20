
# Plano — ChegaAí MVP

App de descoberta de bares/eventos em tempo real. Entrega como **PWA responsivo mobile-first** (React + Vite + Tailwind) com layout idêntico aos mockups iPhone, podendo ser portado para React Native depois. Backend via **Lovable Cloud** (Postgres + Auth + Storage gerenciados) — equivalente ao Neon mas sem setup. Geolocalização com colunas `lat/lng` + cálculo Haversine.

## Identidade visual (tokens)

- `--primary: #F13A5A` (rosa CTA)
- `--foreground / nav: #050505`
- `--muted-foreground: #7E7E7E`
- `--muted / surface: #EFEFEF`
- `--background: #FFFFFF`
- Botões: `rounded-full` (pill) em 100% dos casos
- Cards: `rounded-3xl`, sombras suaves
- Bottom nav: barra preta flutuante com FAB rosa central
- Tipografia: Inter / SF-like, títulos com `font-bold tracking-tight`

## Telas e fluxo

```text
Splash → Onboarding (3 slides) → Auth (Sign Up / Log In / Forgot)
   ↓
Seleção de perfil no signup: Cliente | Estabelecimento
   ↓
┌─ Cliente ─────────────────┐   ┌─ Estabelecimento ──────────┐
│ Discover (feed + busca)   │   │ Dashboard do local         │
│ Map (bares próximos)      │   │ Criar post/evento          │
│ Event Details + Check-in  │   │ Toggle "Ao Vivo"           │
│ Calendar (eventos salvos) │   │ Lista de posts             │
│ Profile + Avaliações      │   │ Perfil do estabelecimento  │
└───────────────────────────┘   └────────────────────────────┘
```

Bottom nav cliente: Discover · Map · **+** (FAB check-in) · Calendar · Profile.
Bottom nav dono: Posts · Local · **+** (novo evento) · Insights · Profile.

## Banco de dados (Lovable Cloud / Postgres)

```text
profiles            (id=auth.uid, nome, avatar, tipo: 'cliente'|'dono', created_at)
user_roles          (user_id, role)  -- segurança, não em profiles
estabelecimentos    (id, owner_id→profiles, nome, descricao, endereco, lat, lng, foto_capa, categoria, ao_vivo bool, ao_vivo_updated_at)
posts_eventos      (id, estabelecimento_id, titulo, descricao, foto, data_evento, preco, ingressos_disponiveis, ao_vivo bool, created_at)
checkins           (id, user_id, estabelecimento_id, created_at)
avaliacoes         (id, user_id, estabelecimento_id, nota 1-5, comentario, created_at)  UNIQUE(user_id, estabelecimento_id)
saved_events       (user_id, post_id, created_at)
```

RLS:
- `profiles`: usuário lê/edita o próprio; leitura pública dos campos básicos.
- `estabelecimentos`/`posts_eventos`: leitura pública; escrita só pelo `owner_id` (via `has_role` ou ownership check).
- `checkins`/`avaliacoes`/`saved_events`: insert/select/delete só do próprio usuário.

Geolocalização: query `ORDER BY` distância Haversine em SQL ou function `nearby_estabelecimentos(lat, lng, radius_km)`.

Storage buckets: `event-photos`, `venue-photos`, `avatars` (públicos para leitura).

## Implementação faseada

**Fase 1 — Base visual e navegação** (sem backend)
- Setup tokens de cor em `index.css` + `tailwind.config.ts`
- Componentes: `PillButton`, `EventCard`, `BottomNav`, `PhoneFrame` (para preview)
- Telas: Splash, Onboarding (3 slides com swiper), seleção Login/Signup, Discover com dados mock
- Roteamento: React Router

**Fase 2 — Lovable Cloud + Auth**
- Ativar Lovable Cloud
- Auth email/senha + Google; tela "esqueci senha" + página `/reset-password`
- Tabela `profiles` + `user_roles` + trigger de criação automática
- Escolha de tipo de conta no signup (cliente/dono)

**Fase 3 — Cliente**
- Discover real (feed de `posts_eventos` + busca)
- Geolocalização (browser API) + ordenação por distância
- Event Details + botão "Buy Ticket" (mock) + Check-in
- Avaliações (nota + comentário)
- Calendar/saved events
- Profile

**Fase 4 — Estabelecimento**
- Dashboard: lista de posts do local
- Criar/editar post com upload de foto
- Toggle "Ao Vivo" (atualiza `ao_vivo` no estabelecimento + badge no feed)
- Perfil do estabelecimento

**Fase 5 — Polimento**
- Animações de transição, skeleton loaders
- PWA manifest + ícones (instalável no celular)
- SEO básico (title, meta, JSON-LD para eventos)

## Detalhes técnicos

- Stack: React + Vite + TypeScript + Tailwind + shadcn (customizado para pill) + React Router + TanStack Query + Lovable Cloud client
- Mapa: `react-leaflet` (free, sem API key) na fase de Map
- Mobile nativo: postergado; arquitetura de componentes mantida agnóstica para facilitar port futuro para React Native/Expo.
- Roles seguidos via tabela `user_roles` + função `has_role()` (nunca em `profiles`).

## Fora do MVP

Pagamentos reais de ingressos, push notifications, chat/mensagens, mapa com clusters avançados, app nativo compilado. Podem entrar em iterações posteriores.

Pronto para implementar a Fase 1 ao aprovar.

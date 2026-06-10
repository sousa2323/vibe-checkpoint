import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Calendar,
  CheckCircle2,
  Clock3,
  Compass,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Music2,
  Navigation,
  Plus,
  Store,
  Ticket,
  User,
  UsersRound,
} from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { authClient } from "@/auth";

declare global {
  interface Window {
    __CHEGAAI_NATIVE_SHELL?: boolean;
  }
}

export const Route = createFileRoute("/")({
  component: Entry,
});

const nativeOrigins = new Set(["https://localhost", "capacitor://localhost"]);

function isNativeShell() {
  if (typeof window !== "undefined") {
    return window.__CHEGAAI_NATIVE_SHELL === true || nativeOrigins.has(window.location.origin);
  }

  return process.env.CHEGAAI_CAPACITOR_RENDER === "1";
}

const imageUrls = {
  concert:
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80",
  bar: "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&w=1200&q=80",
  friends:
    "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80",
  phone:
    "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=1200&q=80",
  table:
    "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80",
};

function BrandLogo({ className }: { className: string }) {
  return (
    <>
      <img
        src="/img/logo_chegaai2.png"
        alt="ChegaAí"
        className={`${className} object-contain dark:hidden`}
      />
      <img
        src="/img/logo_chegaai.png"
        alt=""
        aria-hidden="true"
        className={`hidden ${className} object-contain dark:block`}
      />
    </>
  );
}

function Entry() {
  const [nativeShell, setNativeShell] = useState(isNativeShell);

  useEffect(() => {
    setNativeShell(isNativeShell());
  }, []);

  if (nativeShell) return <NativeSplash />;

  return <WebLanding />;
}

function NativeSplash() {
  const navigate = useNavigate();
  const { data, isPending } = authClient.useSession();
  const user = data?.user;

  useEffect(() => {
    if (isPending) return;

    let seen = false;
    try {
      seen = localStorage.getItem("chegaai:onboarded") === "1";
      if (user?.id) {
        localStorage.setItem("chegaai:onboarded", "1");
      }
    } catch {
      seen = false;
    }

    if (user?.id) {
      navigate({ to: "/post-auth", replace: true });
      return;
    }

    navigate({ to: seen ? "/auth" : "/onboarding", replace: true });
  }, [isPending, navigate, user?.id]);

  return (
    <main className="app-shell flex flex-col items-center justify-center overflow-hidden bg-background px-8 text-foreground">
      <div className="absolute inset-x-0 top-[-120px] mx-auto h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute inset-x-8 bottom-16 h-24 rounded-full bg-foreground/5 blur-2xl" />
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-background shadow-[0_18px_40px_rgba(241,58,90,0.24)] ring-1 ring-border">
          <BrandLogo className="h-20 w-auto max-w-[4.75rem]" />
        </div>
        <h1 className="text-3xl font-black tracking-tight">ChegaAí</h1>
        <p className="text-sm text-muted-foreground">Preparando sua experiência...</p>
        <LoaderCircle className="mt-4 h-5 w-5 animate-spin text-primary" />
      </div>
    </main>
  );
}

function WebLanding() {
  const navigate = useNavigate();
  const { data, isPending } = authClient.useSession();
  const user = data?.user;
  const primaryLabel = user?.id ? "Abrir app" : "Criar conta grátis";
  const primaryTarget = user?.id ? "/post-auth" : "/auth";

  function goToPrimary() {
    navigate({ to: primaryTarget });
  }

  function goToAuth() {
    navigate({ to: "/auth" });
  }

  return (
    <main className="landing-light min-h-screen overflow-hidden bg-background text-foreground">
      <section className="landing-canvas relative mx-auto min-h-screen w-full max-w-[92rem] px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        <div className="landing-page-glow landing-page-glow-left" />
        <div className="landing-page-glow landing-page-glow-right" />

        <header className="landing-nav-reveal relative z-40 mx-auto flex w-full max-w-3xl items-center justify-between rounded-full bg-white/90 p-2 shadow-[0_16px_54px_rgba(5,5,5,0.08)] ring-1 ring-ink/[0.06] backdrop-blur-xl">
          <a href="/" className="flex items-center gap-2 pl-1" aria-label="ChegaAí">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white ring-1 ring-ink/[0.08]">
              <img
                src="/img/logo_chegaai2.png"
                alt=""
                aria-hidden="true"
                className="h-8 w-auto max-w-[1.6rem] object-contain"
              />
            </span>
            <span className="text-sm font-black tracking-tight text-primary">ChegaAí</span>
          </a>
          <nav className="hidden items-center gap-1 rounded-full bg-muted/80 p-1 text-xs font-black text-foreground/62 md:flex">
            <a
              href="#como-funciona"
              className="rounded-full px-3 py-2 hover:bg-white hover:text-foreground"
            >
              Como funciona
            </a>
            <a
              href="#lugares"
              className="rounded-full px-3 py-2 hover:bg-white hover:text-foreground"
            >
              Lugares
            </a>
            <a
              href="#reviews"
              className="rounded-full px-3 py-2 hover:bg-white hover:text-foreground"
            >
              Reviews
            </a>
            <a
              href="#comece"
              className="rounded-full px-3 py-2 hover:bg-white hover:text-foreground"
            >
              Começar
            </a>
          </nav>
          <button
            type="button"
            onClick={goToAuth}
            className="landing-action inline-flex h-9 items-center justify-center rounded-full bg-ink px-4 text-xs font-black text-white shadow-[0_8px_20px_rgba(5,5,5,0.14)] active:scale-[0.98]"
          >
            Entrar
          </button>
        </header>

        <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center pt-14 text-center sm:pt-16 lg:pt-20">
          <div className="landing-badge inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-black text-foreground shadow-[0_12px_36px_rgba(5,5,5,0.07)] ring-1 ring-ink/[0.06]">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-45" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
            Cidade ao vivo no bolso
          </div>

          <h1 className="landing-hero-title mt-6 max-w-5xl text-[clamp(3rem,7.2vw,6rem)] font-black leading-[0.9] tracking-[-0.04em] text-wrap-balance">
            Descubra o rolê certo antes de sair de casa.
          </h1>
          <p className="landing-hero-copy mt-6 max-w-2xl text-base font-semibold leading-8 text-foreground/68 text-wrap-pretty sm:text-xl">
            Bares, eventos, check-ins e movimento real perto de você. O ChegaAí mostra onde a cidade
            está acontecendo agora, antes do grupo decidir para onde ir.
          </p>

          <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={goToPrimary}
              disabled={isPending}
              className="landing-action inline-flex h-13 items-center justify-center gap-2 rounded-full bg-primary px-7 text-sm font-black text-white shadow-[0_18px_40px_rgba(241,58,90,0.24)] disabled:opacity-60 sm:h-14 sm:text-base"
            >
              {isPending ? "Carregando" : primaryLabel}
              <ArrowRight className="h-5 w-5" />
            </button>
            <a
              href="#como-funciona"
              className="landing-action inline-flex h-13 items-center justify-center rounded-full bg-white px-7 text-sm font-black text-foreground shadow-[inset_0_0_0_1px_rgba(5,5,5,0.08)] sm:h-14 sm:text-base"
            >
              Ver como funciona
            </a>
          </div>
        </div>

        <div className="landing-hero-visual relative z-20 mx-auto mt-10 h-[720px] max-w-6xl sm:mt-8 lg:h-[760px]">
          <svg className="landing-network" viewBox="0 0 980 720" aria-hidden="true">
            <path d="M80 270 C245 105 365 170 490 310 S720 520 900 210" />
            <path d="M110 495 C300 335 350 570 492 410 S650 225 865 430" />
            <path d="M210 145 C370 250 595 110 770 265" />
            <path d="M220 630 C370 540 565 600 760 520" />
          </svg>

          <OrbitAvatar
            className="left-[4%] top-[19%]"
            image="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=220&q=80"
            label="Lia confirmou"
          />
          <OrbitAvatar
            className="right-[7%] top-[17%]"
            image="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=220&q=80"
            label="Rafa chegou"
          />
          <OrbitAvatar
            className="left-[12%] bottom-[22%]"
            image="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=220&q=80"
            label="Bia salvou"
          />
          <OrbitAvatar
            className="right-[13%] bottom-[24%]"
            image="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=220&q=80"
            label="Nico marcou"
          />

          <div className="landing-orbit-card landing-orbit-card-left">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white">
              <UsersRound className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-black">32 check-ins</p>
              <p className="text-xs font-bold text-foreground/52">agora em Pinheiros</p>
            </div>
          </div>

          <div className="landing-orbit-card landing-orbit-card-right">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink text-white">
              <MessageCircle className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-black">Grupo chegando</p>
              <p className="text-xs font-bold text-foreground/52">3 amigos a caminho</p>
            </div>
          </div>

          <div className="landing-photo-polaroid landing-photo-polaroid-left">
            <img src={imageUrls.concert} alt="Show com público perto do palco" />
            <span>Jazz 21h</span>
          </div>
          <div className="landing-photo-polaroid landing-photo-polaroid-right">
            <img src={imageUrls.friends} alt="Amigos reunidos em uma noite fora" />
            <span>grupo formado</span>
          </div>

          <div className="landing-phone-wrap">
            <div className="landing-hand-shadow" />
            <PhoneMockup />
          </div>
        </div>
      </section>

      <section id="lugares" className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-10">
        <div className="mb-9 grid items-end gap-5 lg:grid-cols-[0.95fr_1fr]">
          <div>
            <h2 className="max-w-2xl text-4xl font-black leading-[0.96] tracking-[-0.035em] text-wrap-balance sm:text-5xl">
              Uma cidade inteira vira escolha rápida.
            </h2>
          </div>
          <p className="max-w-xl text-base font-semibold leading-7 text-foreground/66 lg:justify-self-end">
            Em vez de abrir mapa, agenda, chat e Instagram, o ChegaAí reúne os sinais que importam
            quando alguém quer sair hoje.
          </p>
        </div>

        <div className="landing-image-grid">
          {[
            {
              title: "Eventos perto",
              desc: "Shows, festas e bares com distância, horário e preço antes do clique.",
              image: imageUrls.concert,
              alt: "Público em show com luzes vermelhas",
              icon: Ticket,
            },
            {
              title: "Check-ins ao vivo",
              desc: "Veja onde tem movimento real e evite chegar em lugar parado.",
              image: imageUrls.bar,
              alt: "Bar com iluminação baixa e mesas ocupadas",
              icon: CheckCircle2,
            },
            {
              title: "Planos com amigos",
              desc: "Salve rolês, combine no grupo e acompanhe quem já está a caminho.",
              image: imageUrls.friends,
              alt: "Amigos conversando durante uma saída à noite",
              icon: UsersRound,
            },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="landing-feature-card landing-reveal"
                style={{ "--i": String(index) } as CSSProperties}
              >
                <img src={item.image} alt={item.alt} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/12 to-transparent" />
                <div className="absolute left-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
                  <h3 className="text-2xl font-black tracking-tight">{item.title}</h3>
                  <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-white/76">
                    {item.desc}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section id="como-funciona" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[0.78fr_1fr] lg:items-center">
          <div className="landing-reveal">
            <p className="text-sm font-black text-primary">Simples sem ficar genérico</p>
            <h2 className="mt-4 max-w-xl text-4xl font-black leading-[0.96] tracking-[-0.035em] text-wrap-balance sm:text-5xl">
              Do “onde vamos?” ao check-in em poucos toques.
            </h2>
            <p className="mt-5 max-w-lg text-base font-semibold leading-7 text-foreground/66">
              O fluxo foi pensado para a hora em que o grupo ainda está decidindo. Pouca tela,
              informação direta e sinais de presença no lugar certo.
            </p>
          </div>

          <div className="landing-steps-panel landing-reveal">
            {[
              {
                title: "Veja o movimento",
                desc: "Abra o mapa e encontre bares, eventos e casas com atividade agora.",
                icon: MapPin,
              },
              {
                title: "Combine com o grupo",
                desc: "Compartilhe o plano, veja quem topou e salve o que ainda pode render.",
                icon: MessageCircle,
              },
              {
                title: "Faça check-in",
                desc: "Chegou no local? Registre presença e desbloqueie recompensas do estabelecimento.",
                icon: BadgeCheck,
              },
            ].map((step, index) => {
              const Icon = step.icon;
              return (
                <article key={step.title} className="landing-step-row">
                  <span className="landing-step-index">{index + 1}</span>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ink text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-xl font-black tracking-tight">{step.title}</h3>
                    <p className="mt-1 text-sm font-semibold leading-6 text-foreground/62">
                      {step.desc}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="reviews" className="bg-muted/70 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1fr] lg:items-start">
            <div className="landing-reveal">
              <h2 className="max-w-lg text-4xl font-black leading-[0.98] tracking-[-0.035em] text-wrap-balance sm:text-5xl">
                Reviews de quem sai com menos dúvida.
              </h2>
              <p className="mt-5 max-w-md text-base font-semibold leading-7 text-foreground/66">
                A promessa é prática: escolher melhor, encontrar gente e chegar enquanto ainda está
                acontecendo.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  name: "Marina F.",
                  text: "Usei para decidir entre dois bares. O check-in ao vivo salvou a noite, fomos direto onde já tinha movimento.",
                },
                {
                  name: "João P.",
                  text: "Antes o grupo ficava meia hora no chat. Agora mando o rolê salvo e todo mundo vê distância, preço e horário.",
                },
              ].map((review) => (
                <article key={review.name} className="landing-review-card landing-reveal">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-black text-white">
                      {review.name.charAt(0)}
                    </span>
                    <div>
                      <p className="font-black">{review.name}</p>
                      <p className="text-xs font-bold text-foreground/50">usuário beta</p>
                    </div>
                  </div>
                  <p className="mt-5 text-sm font-semibold leading-6 text-foreground/68">
                    “{review.text}”
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="comece" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
        <div className="landing-final-cta landing-reveal">
          <div className="relative z-10 max-w-xl">
            <p className="text-sm font-black text-white/66">ChegaAí na web</p>
            <h2 className="mt-4 text-4xl font-black leading-[0.96] tracking-[-0.035em] text-white text-wrap-balance sm:text-5xl">
              Abra o ChegaAí antes de sair.
            </h2>
            <p className="mt-5 max-w-lg text-base font-semibold leading-7 text-white/70">
              Encontre o rolê, entenda o clima, chame o grupo e chegue junto.
            </p>
            <button
              type="button"
              onClick={goToPrimary}
              className="landing-action mt-8 inline-flex h-14 items-center justify-center gap-2 rounded-full bg-white px-7 text-base font-black text-ink"
            >
              {user?.id ? "Abrir app" : "Começar agora"}
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
          <div className="landing-cta-phone" aria-hidden="true">
            <PhoneMockup compact />
          </div>
        </div>

        <footer className="flex flex-col gap-4 px-1 py-8 text-sm font-semibold text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 ChegaAí. Eventos e bares ao vivo, agora.</p>
          <div className="flex gap-5">
            <a href="#como-funciona" className="hover:text-foreground">
              Como funciona
            </a>
            <a href="#lugares" className="hover:text-foreground">
              Lugares
            </a>
            <button type="button" onClick={goToAuth} className="hover:text-foreground">
              Entrar
            </button>
          </div>
        </footer>
      </section>
    </main>
  );
}

function OrbitAvatar({
  className,
  image,
  label,
}: {
  className: string;
  image: string;
  label: string;
}) {
  return (
    <div className={`landing-avatar-orbit ${className}`}>
      <img src={image} alt={label} />
      <span>{label}</span>
    </div>
  );
}

function PhoneMockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "landing-phone landing-phone-compact" : "landing-phone"}>
      <span className="landing-hardware-btn landing-hardware-btn-left" />
      <span className="landing-hardware-btn landing-hardware-btn-right" />
      <div className="absolute left-1/2 top-3 z-20 flex h-6 w-28 -translate-x-1/2 items-center justify-center rounded-full bg-ink">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      </div>
      <div className="landing-screen relative h-full overflow-hidden rounded-[2.55rem] bg-background text-foreground ring-1 ring-white/10">
        <img
          src={imageUrls.bar}
          alt="Bar com luz baixa e mesas ocupadas"
          className="absolute inset-x-0 top-0 h-60 w-full object-cover"
        />
        <div className="absolute inset-x-0 top-0 h-60 bg-gradient-to-b from-black/10 via-black/10 to-black/82" />
        <div className="absolute left-4 right-4 top-12 flex items-center justify-between text-white">
          <div>
            <p className="text-xs font-bold text-white/70">Perto de você</p>
            <p className="text-lg font-black tracking-tight">Hoje em Pinheiros</p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/16 backdrop-blur-md">
            <Navigation className="h-4 w-4" />
          </span>
        </div>
        <div className="landing-live-chip absolute left-4 top-34 rounded-full bg-primary px-3 py-1.5 text-[11px] font-black text-white shadow-lg shadow-primary/25">
          Ao vivo agora
        </div>
        <div className="landing-phone-card absolute inset-x-3 top-[190px] rounded-[1.7rem] bg-white p-3 text-ink shadow-[0_20px_42px_rgba(5,5,5,0.14)] ring-1 ring-white/75">
          <div className="flex gap-3">
            <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-ink text-white">
              <span className="text-[10px] font-bold uppercase text-white/60">Hoje</span>
              <span className="text-lg font-black leading-none">22h</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-base font-black tracking-tight">Samba no terraço</p>
              <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-ink/52">
                <MapPin className="h-3 w-3" /> Vila Madalena, 1.8 km
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="rounded-full bg-surface px-3 py-1 text-xs font-black">R$ 20</span>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
                  18 check-ins
                </span>
              </div>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white">
              <CheckCircle2 className="h-5 w-5" />
            </span>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 rounded-t-[2rem] bg-background px-4 pb-4 pt-8">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-black">Rolês andando</p>
            <p className="text-xs font-bold text-primary">ver mapa</p>
          </div>
          {[
            [Store, "Bar Aurora", "música ao vivo", "2.4 km"],
            [Music2, "Casa Norte", "grupo formando", "3.1 km"],
            [Clock3, "Terraço 22", "entrada liberada", "4.0 km"],
          ].map(([Icon, name, desc, distance], index) => {
            const TypedIcon = Icon as typeof Store;
            return (
              <div
                key={name as string}
                className="landing-list-item mb-2 flex items-center gap-3 rounded-2xl bg-muted p-3"
                style={{ "--i": String(index) } as CSSProperties}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary">
                  <TypedIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-black">{name as string}</p>
                  <p className="truncate text-xs font-semibold text-muted-foreground">
                    {desc as string}
                  </p>
                </div>
                <span className="text-xs font-black text-foreground/65">{distance as string}</span>
              </div>
            );
          })}
          <div className="landing-mock-bottom-nav mt-3">
            {[
              [Compass, "Explorar", true],
              [MapPin, "Mapa", false],
            ].map(([Icon, label, active]) => {
              const TypedIcon = Icon as typeof Compass;
              return (
                <span
                  key={label as string}
                  className={active ? "landing-mock-nav-item text-white" : "landing-mock-nav-item"}
                >
                  <TypedIcon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                  <span>{label as string}</span>
                </span>
              );
            })}
            <span className="w-12" aria-hidden />
            {[
              [Calendar, "Agenda", false],
              [User, "Perfil", false],
            ].map(([Icon, label, active]) => {
              const TypedIcon = Icon as typeof Calendar;
              return (
                <span
                  key={label as string}
                  className={active ? "landing-mock-nav-item text-white" : "landing-mock-nav-item"}
                >
                  <TypedIcon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                  <span>{label as string}</span>
                </span>
              );
            })}
            <span className="landing-mock-nav-fab" aria-label="Criar postagem">
              <Plus className="h-6 w-6" strokeWidth={2.5} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

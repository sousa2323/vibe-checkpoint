import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Music2,
  Navigation,
  Sparkles,
  Store,
  UsersRound,
} from "lucide-react";
import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { authClient } from "@/auth";

export const Route = createFileRoute("/")({
  component: Entry,
});

const nativeOrigins = new Set(["https://localhost", "capacitor://localhost"]);
const LandingThreeScene = lazy(() => import("@/components/landing-three-scene"));

function Entry() {
  const [isNativeShell, setIsNativeShell] = useState(() =>
    typeof window === "undefined" ? false : nativeOrigins.has(window.location.origin),
  );

  useEffect(() => {
    setIsNativeShell(nativeOrigins.has(window.location.origin));
  }, []);

  if (isNativeShell) return <NativeSplash />;

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

    const t = setTimeout(() => {
      if (user?.id) {
        navigate({ to: "/post-auth", replace: true });
        return;
      }

      navigate({ to: seen ? "/auth" : "/onboarding", replace: true });
    }, 250);
    return () => clearTimeout(t);
  }, [isPending, navigate, user?.id]);

  return (
    <main className="app-shell flex flex-col items-center justify-center overflow-hidden bg-background px-8 text-foreground">
      <div className="absolute inset-x-0 top-[-120px] mx-auto h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute inset-x-8 bottom-16 h-24 rounded-full bg-foreground/5 blur-2xl" />
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-primary text-3xl font-black text-white shadow-[0_18px_40px_rgba(241,58,90,0.28)]">
          C
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
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <section className="landing-hero relative mx-auto flex min-h-screen w-full max-w-[90rem] flex-col px-4 py-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="landing-glow landing-glow-primary pointer-events-none absolute left-[18%] top-[-22rem] h-[42rem] w-[42rem] rounded-full bg-primary/[0.09] blur-3xl dark:bg-primary/[0.16]" />
        <div className="landing-glow landing-glow-ink pointer-events-none absolute bottom-[-10rem] right-[-8rem] h-[34rem] w-[34rem] rounded-full bg-ink/[0.05] blur-3xl dark:bg-white/[0.06]" />

        <header className="landing-nav-reveal relative z-30 mx-auto flex w-full max-w-2xl items-center justify-between rounded-full bg-white/92 px-2 py-2 shadow-[0_12px_36px_rgba(5,5,5,0.055)] ring-1 ring-ink/[0.05] backdrop-blur-xl dark:bg-white/[0.08] dark:shadow-[0_18px_54px_rgba(0,0,0,0.32)] dark:ring-white/[0.12]">
          <a href="/" className="flex items-center gap-2 pl-1" aria-label="ChegaAí">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-sm font-black text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] dark:bg-white dark:text-ink">
              C
            </span>
            <span className="text-sm font-black tracking-tight">ChegaAí</span>
          </a>
          <nav className="hidden items-center gap-1 rounded-full bg-muted/70 p-1 text-xs font-bold text-foreground/62 md:flex dark:bg-white/[0.08] dark:text-white/68">
            <a
              href="#como-funciona"
              className="rounded-full px-3 py-2 transition-colors hover:bg-white hover:text-foreground dark:hover:bg-white/14 dark:hover:text-white"
            >
              Como funciona
            </a>
            <a
              href="#lugares"
              className="rounded-full px-3 py-2 transition-colors hover:bg-white hover:text-foreground dark:hover:bg-white/14 dark:hover:text-white"
            >
              Lugares
            </a>
            <a
              href="#estabelecimentos"
              className="rounded-full px-3 py-2 transition-colors hover:bg-white hover:text-foreground dark:hover:bg-white/14 dark:hover:text-white"
            >
              Estabelecimentos
            </a>
            <a
              href="#comece"
              className="rounded-full px-3 py-2 transition-colors hover:bg-white hover:text-foreground dark:hover:bg-white/14 dark:hover:text-white"
            >
              Começar
            </a>
          </nav>
          <button
            type="button"
            onClick={goToAuth}
            className="landing-action inline-flex h-9 items-center justify-center rounded-full bg-ink px-4 text-xs font-black text-white shadow-[0_8px_20px_rgba(5,5,5,0.13)] transition-transform active:scale-[0.98] dark:bg-white dark:text-ink dark:shadow-[0_12px_28px_rgba(0,0,0,0.34)]"
          >
            Entrar
          </button>
        </header>

        <div className="relative z-10 grid flex-1 items-center gap-10 pb-12 pt-10 sm:pt-12 lg:grid-cols-[minmax(25rem,0.82fr)_minmax(30rem,1fr)] lg:gap-10 lg:pb-14 lg:pt-14 xl:gap-16">
          <div className="landing-hero-copy max-w-[43rem] lg:pl-2 xl:pl-4">
            <div className="landing-badge inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-black text-foreground shadow-[0_10px_30px_rgba(5,5,5,0.055)] ring-1 ring-ink/[0.05] dark:bg-white/[0.09] dark:text-white dark:shadow-[0_16px_44px_rgba(0,0,0,0.32)] dark:ring-white/[0.12]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-45" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
              </span>
              Cidade ao vivo no bolso
            </div>

            <h1 className="mt-7 max-w-3xl text-[clamp(2.75rem,6.8vw,5.75rem)] font-black leading-[0.92] tracking-[-0.04em] text-wrap-balance">
              Descubra o rolê antes da cidade lotar.
            </h1>
            <p className="mt-6 max-w-[34rem] text-lg leading-8 text-foreground/70 text-wrap-pretty dark:text-white/76 sm:text-xl">
              Eventos, bares, movimento e check-ins perto de você. O ChegaAí mostra o clima real
              antes do grupo decidir para onde ir.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={goToPrimary}
                disabled={isPending}
                className="landing-action inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary px-7 text-base font-black text-white shadow-[0_18px_38px_rgba(241,58,90,0.26)] transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-60"
              >
                {isPending ? "Carregando" : primaryLabel}
                <ArrowRight className="h-5 w-5" />
              </button>
              <a
                href="#lugares"
                className="landing-action inline-flex h-14 items-center justify-center rounded-full bg-white px-7 text-base font-black text-foreground shadow-[inset_0_0_0_1px_rgba(5,5,5,0.07)] transition-colors hover:bg-muted dark:bg-white/[0.09] dark:text-white dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.13)] dark:hover:bg-white/[0.14]"
              >
                Ver a cidade viva
              </a>
            </div>

            <dl className="mt-10 grid max-w-[34rem] grid-cols-3 gap-3">
              {[
                ["12min", "para escolher"],
                ["ao vivo", "check-ins e fluxo"],
                ["perto", "bairro e distância"],
              ].map(([value, label], index) => (
                <div
                  key={value}
                  className="landing-stat rounded-[1.35rem] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(5,5,5,0.055)] [--i:0] dark:bg-white/[0.08] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.11)]"
                  style={{ "--i": String(index) } as CSSProperties}
                >
                  <dt className="text-xl font-black tracking-tight sm:text-2xl">{value}</dt>
                  <dd className="mt-1 text-xs font-semibold leading-snug text-foreground/58 dark:text-white/58">
                    {label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="landing-scene relative min-h-[560px] overflow-hidden rounded-[2.5rem] bg-ink p-4 text-white shadow-[0_36px_110px_rgba(5,5,5,0.22)] ring-1 ring-ink/10 dark:shadow-[0_40px_130px_rgba(0,0,0,0.5)] dark:ring-white/10 sm:min-h-[640px] sm:rounded-[3rem] sm:p-5 lg:min-h-[680px]">
            <div className="landing-scene-grid absolute inset-0 opacity-80" />
            <div className="absolute left-5 top-5 z-10 flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-black text-white/78 ring-1 ring-white/10">
              <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_0_5px_rgba(241,58,90,0.15)]" />
              pulso da cidade
            </div>
            <div className="absolute right-5 top-5 z-10 rounded-full bg-white px-3 py-2 text-xs font-black text-ink dark:bg-white/[0.12] dark:text-white dark:ring-1 dark:ring-white/[0.14]">
              Pinheiros agora
            </div>

            <svg
              className="landing-routes pointer-events-none absolute inset-0 h-full w-full"
              viewBox="0 0 760 720"
              aria-hidden="true"
            >
              <path d="M80 520 C210 410 250 230 390 265 S560 420 690 225" />
              <path d="M105 180 C250 260 350 145 475 220 S585 360 660 335" />
              <path d="M180 620 C265 515 340 500 415 560 S560 615 660 520" />
            </svg>

            {[
              ["left-[13%] top-[25%]", "Bar Aurora", "2.4 km"],
              ["left-[64%] top-[28%]", "Jazz 21h", "ao vivo"],
              ["left-[76%] top-[68%]", "Terraço 22", "4.0 km"],
              ["left-[22%] top-[76%]", "Casa Norte", "grupo"],
            ].map(([position, title, meta], index) => (
              <div
                key={title}
                className={`landing-pin absolute z-10 ${position}`}
                style={{ "--i": String(index) } as CSSProperties}
              >
                <span className="block h-3.5 w-3.5 rounded-full bg-primary shadow-[0_0_0_8px_rgba(241,58,90,0.16),0_0_34px_rgba(241,58,90,0.5)]" />
                <span className="mt-3 hidden min-w-28 rounded-2xl bg-white px-3 py-2 text-xs font-black text-ink shadow-[0_18px_46px_rgba(0,0,0,0.22)] dark:bg-white/[0.12] dark:text-white dark:ring-1 dark:ring-white/[0.14] sm:block">
                  {title}
                  <span className="block text-[10px] font-bold text-foreground/50 dark:text-white/56">
                    {meta}
                  </span>
                </span>
              </div>
            ))}

            <div className="landing-photo-tile absolute left-6 top-28 hidden w-40 overflow-hidden rounded-[2rem] bg-white/8 p-2 shadow-[0_26px_70px_rgba(0,0,0,0.28)] ring-1 ring-white/10 sm:block xl:left-8 xl:w-44">
              <img
                src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=700&auto=format&fit=crop&q=75"
                alt="Show com público em frente ao palco"
                className="h-52 w-full rounded-[1.45rem] object-cover"
              />
            </div>

            <div className="landing-signal-card absolute bottom-6 left-4 z-20 max-w-[16rem] rounded-[2rem] bg-white p-4 text-ink shadow-[0_26px_80px_rgba(0,0,0,0.3)] dark:bg-[#151515] dark:text-white dark:ring-1 dark:ring-white/[0.12] sm:bottom-8 sm:left-6 sm:max-w-[17rem]">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white">
                  <Music2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-black">Jazz no Centro</p>
                  <p className="text-xs font-bold text-foreground/52 dark:text-white/56">
                    começa às 21h
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] font-black">
                <span className="rounded-full bg-muted px-2 py-1.5 dark:bg-white/[0.1] dark:text-white/86">
                  R$ 20
                </span>
                <span className="rounded-full bg-primary/10 px-2 py-1.5 text-primary dark:bg-primary/18 dark:text-white">
                  18 check-ins
                </span>
                <span className="rounded-full bg-muted px-2 py-1.5 dark:bg-white/[0.1] dark:text-white/86">
                  2.4 km
                </span>
              </div>
            </div>

            <div className="landing-phone-stage absolute bottom-6 right-4 z-20 w-[276px] max-w-[58vw] sm:bottom-8 sm:right-8 sm:w-[304px] xl:right-12 xl:w-[318px]">
              <div className="landing-phone relative h-[600px] w-full rounded-[3rem] bg-white/12 p-[7px] shadow-[0_32px_90px_rgba(0,0,0,0.38)] ring-1 ring-white/16">
                <div className="absolute left-1/2 top-3 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-ink" />
                <div className="landing-screen relative h-full overflow-hidden rounded-[2.45rem] bg-background text-foreground ring-1 ring-white/10 dark:bg-[#070707] dark:text-white">
                  <img
                    src="https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=900&auto=format&fit=crop&q=75"
                    alt="Bar com luz baixa e mesas ocupadas"
                    className="absolute inset-x-0 top-0 h-64 w-full object-cover"
                  />
                  <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-black/15 via-black/5 to-black/78" />
                  <div className="absolute left-4 right-4 top-12 flex items-center justify-between text-white">
                    <div>
                      <p className="text-xs font-bold text-white/70">Perto de você</p>
                      <p className="text-lg font-black tracking-tight">Hoje em Pinheiros</p>
                    </div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/16 backdrop-blur-md">
                      <Navigation className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="landing-live-chip absolute left-4 top-36 rounded-full bg-primary px-3 py-1.5 text-[11px] font-black text-white shadow-lg shadow-primary/25">
                    Ao vivo agora
                  </div>
                  <div className="landing-phone-card absolute inset-x-3 top-[205px] rounded-[1.7rem] bg-white p-3 text-ink shadow-[0_20px_42px_rgba(5,5,5,0.14)] ring-1 ring-white/75">
                    <div className="flex gap-3">
                      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-ink text-white">
                        <span className="text-[10px] font-bold uppercase text-white/60">Jun</span>
                        <span className="text-lg font-black leading-none">01</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-base font-black tracking-tight">
                          Samba no terraço
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-ink/52">
                          <MapPin className="h-3 w-3" /> Vila Madalena, 1.8 km
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <span className="rounded-full bg-surface px-3 py-1 text-xs font-black">
                            R$ 20
                          </span>
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

                  <div className="absolute inset-x-0 bottom-0 rounded-t-[2rem] bg-background px-4 pb-5 pt-9 dark:bg-[#070707]">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm font-black">Rolês que estão andando</p>
                      <p className="text-xs font-bold text-primary">ver mapa</p>
                    </div>
                    {[
                      ["Bar Aurora", "música ao vivo", "2.4 km"],
                      ["Casa Norte", "grupo formando", "3.1 km"],
                      ["Terraço 22", "entrada liberada", "4.0 km"],
                    ].map(([name, desc, distance], index) => (
                      <div
                        key={name}
                        className="landing-list-item mb-2 flex items-center gap-3 rounded-2xl bg-muted p-3 dark:bg-white/[0.08]"
                        style={{ "--i": String(index) } as CSSProperties}
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary">
                          <Store className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black">{name}</p>
                          <p className="truncate text-xs font-semibold text-muted-foreground dark:text-white/55">
                            {desc}
                          </p>
                        </div>
                        <span className="text-xs font-black text-foreground/65 dark:text-white/68">
                          {distance}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <ThreeHeroObject />
          </div>
        </div>
      </section>

      <section
        id="como-funciona"
        className="mx-auto grid max-w-7xl gap-4 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-4 lg:px-10"
      >
        <div className="landing-reveal rounded-[2rem] bg-foreground p-7 text-white shadow-[0_24px_60px_rgba(5,5,5,0.13)] dark:bg-white/[0.09] dark:shadow-[0_24px_70px_rgba(0,0,0,0.3)] dark:ring-1 dark:ring-white/[0.12] sm:p-8 lg:col-span-2 lg:min-h-[24rem] lg:p-9">
          <p className="text-sm font-black text-white/58 dark:text-white/62">Fluxo simples</p>
          <h2 className="mt-4 max-w-xl text-4xl font-black leading-none tracking-[-0.035em] text-wrap-balance sm:text-5xl">
            Do mapa ao check-in em poucos toques.
          </h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-white/68 dark:text-white/72">
            A landing apresenta o produto. Dentro do app, a prioridade continua sendo decidir rápido
            e chegar no lugar certo.
          </p>
        </div>

        {[
          {
            title: "Veja o que está perto",
            desc: "Distância, bairro, horário e categoria aparecem antes de qualquer detalhe secundário.",
            icon: MapPin,
          },
          {
            title: "Entenda o clima",
            desc: "Check-ins, pessoas confirmadas e sinais ao vivo ajudam a decidir sem abrir cinco abas.",
            icon: UsersRound,
          },
          {
            title: "Salve ou chegue",
            desc: "Guarde eventos, compartilhe planos e faça check-in quando estiver no local.",
            icon: BadgeCheck,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.title}
              className="landing-reveal rounded-[2rem] bg-white p-6 shadow-[inset_0_0_0_1px_rgba(5,5,5,0.06)] dark:bg-card dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] sm:p-7"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-7 text-2xl font-black tracking-tight">{item.title}</h3>
              <p className="mt-3 text-base leading-7 text-foreground/66 dark:text-white/68">
                {item.desc}
              </p>
            </article>
          );
        })}
      </section>

      <section id="lugares" className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12 lg:px-10">
        <div className="landing-reveal grid overflow-hidden rounded-[2.5rem] bg-muted dark:bg-card dark:ring-1 dark:ring-white/[0.1] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="p-7 sm:p-10 lg:p-12 xl:p-14">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-black dark:bg-white/[0.09] dark:text-white dark:ring-1 dark:ring-white/[0.1]">
              <Sparkles className="h-4 w-4 text-primary" />
              Guia de bolso da cidade
            </div>
            <h2 className="mt-7 max-w-xl text-4xl font-black leading-[0.98] tracking-[-0.035em] text-wrap-balance sm:text-5xl">
              Informação prática, com energia de rua.
            </h2>
            <p className="mt-6 max-w-lg text-base leading-7 text-foreground/68 dark:text-white/68">
              Bares, pubs, casas de show e eventos entram no mesmo feed. A pessoa vê o que importa:
              quando começa, onde fica, quem marcou presença e se ainda vale ir.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {[
                [Clock3, "Status em tempo real"],
                [CalendarDays, "Agenda salva"],
                [MessageCircle, "Planos com amigos"],
                [Music2, "Música e eventos"],
              ].map(([Icon, label]) => {
                const TypedIcon = Icon as typeof Clock3;
                return (
                  <div
                    key={label as string}
                    className="flex min-w-[13rem] flex-1 items-center gap-3 rounded-2xl bg-white p-4 dark:bg-white/[0.08] dark:ring-1 dark:ring-white/[0.08]"
                  >
                    <TypedIcon className="h-5 w-5 text-primary" />
                    <span className="text-sm font-black">{label as string}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="relative min-h-[380px] overflow-hidden bg-ink sm:min-h-[420px]">
            <img
              src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1300&auto=format&fit=crop&q=75"
              alt="Show com público em frente ao palco"
              className="h-full min-h-[420px] w-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-transparent to-primary/18" />
            <div className="landing-float-card absolute bottom-5 left-5 right-5 rounded-[1.8rem] bg-white p-5 text-ink shadow-[0_26px_70px_rgba(5,5,5,0.28)] sm:bottom-6 sm:left-auto sm:right-6 sm:w-80">
              <p className="text-sm font-black text-primary">Alta procura na região</p>
              <h3 className="mt-2 text-2xl font-black tracking-tight">
                Eventos que ainda dá tempo de pegar
              </h3>
              <p className="mt-3 text-sm leading-6 text-ink/62">
                O feed favorece o que está ativo agora, sem esconder distância e horário.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="estabelecimentos"
        className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10"
      >
        <div className="landing-reveal grid gap-8 rounded-[2.5rem] bg-white p-7 shadow-[inset_0_0_0_1px_rgba(5,5,5,0.06),0_20px_70px_rgba(5,5,5,0.05)] dark:bg-card dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1),0_28px_84px_rgba(0,0,0,0.28)] sm:p-10 lg:grid-cols-[1fr_0.9fr] lg:p-12">
          <div>
            <h2 className="max-w-2xl text-4xl font-black leading-[1] tracking-[-0.035em] text-wrap-balance sm:text-5xl">
              Para estabelecimentos, presença vira movimento mensurável.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-foreground/68 dark:text-white/68">
              Donos publicam eventos, atualizações e recompensas. O público descobre, salva e faz
              check-in. A vitrine mostra atividade real, não só uma página parada.
            </p>
            <button
              type="button"
              onClick={goToAuth}
              className="mt-8 inline-flex h-13 items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-black text-white transition-transform active:scale-[0.98] dark:bg-white dark:text-ink"
            >
              Cadastrar estabelecimento
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid content-center gap-3">
            {[
              ["Publicar evento", "Nome, data, capa, preço e categoria."],
              ["Acompanhar check-ins", "Sinais de presença e eventos mais salvos."],
              ["Criar recompensa", "Benefícios por check-in, salvar ou compartilhar."],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-[1.6rem] bg-muted p-5 dark:bg-white/[0.08]">
                <p className="text-lg font-black tracking-tight">{title}</p>
                <p className="mt-2 text-sm leading-6 text-foreground/64 dark:text-white/64">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="comece" className="mx-auto max-w-7xl px-5 pb-8 sm:px-8 lg:px-10">
        <div className="landing-reveal overflow-hidden rounded-[2.5rem] bg-primary p-7 text-white shadow-[0_24px_80px_rgba(241,58,90,0.2)] dark:shadow-[0_24px_90px_rgba(241,58,90,0.24)] sm:p-10 lg:p-12">
          <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-black text-white/68">ChegaAí na web</p>
              <h2 className="mt-4 max-w-2xl text-4xl font-black leading-[0.98] tracking-[-0.035em] text-wrap-balance sm:text-5xl">
                Abra, escolha o rolê e chegue junto.
              </h2>
            </div>
            <button
              type="button"
              onClick={goToPrimary}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-white px-7 text-base font-black text-ink transition-transform active:scale-[0.98]"
            >
              {user?.id ? "Abrir app" : "Começar agora"}
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <footer className="flex flex-col gap-4 px-1 py-8 text-sm font-semibold text-muted-foreground dark:text-white/54 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 ChegaAí. Eventos e bares ao vivo, agora.</p>
          <div className="flex gap-5">
            <a href="#como-funciona" className="hover:text-foreground dark:hover:text-white">
              Como funciona
            </a>
            <button
              type="button"
              onClick={goToAuth}
              className="hover:text-foreground dark:hover:text-white"
            >
              Entrar
            </button>
          </div>
        </footer>
      </section>
    </main>
  );
}

function ThreeHeroObject() {
  const [mounted, setMounted] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [canUseWebGL, setCanUseWebGL] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCanUseWebGL(hasWebGLSupport());

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(media.matches);

    function handleChange() {
      setReduceMotion(media.matches);
    }

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  return (
    <div className="landing-three-slot absolute right-8 top-24 z-10 hidden h-40 w-40 overflow-hidden rounded-[2.2rem] bg-primary text-white shadow-[0_30px_90px_rgba(241,58,90,0.28)] ring-1 ring-white/15 sm:block lg:h-48 lg:w-48">
      {mounted && canUseWebGL ? (
        <LandingThreeBoundary fallback={<ThreeFallback />}>
          <Suspense fallback={<ThreeFallback />}>
            <LandingThreeScene reduceMotion={reduceMotion} />
          </Suspense>
        </LandingThreeBoundary>
      ) : (
        <ThreeFallback />
      )}
    </div>
  );
}

function hasWebGLSupport() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

class LandingThreeBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

function ThreeFallback() {
  return (
    <div className="landing-three-fallback relative flex h-full w-full items-center justify-center overflow-hidden bg-primary">
      <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-[1.6rem] bg-white/18 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)]" />
      <div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-[20%] -translate-y-[62%] rounded-full bg-white/24 blur-[1px]" />
      <div className="absolute bottom-6 left-6 h-6 w-6 rounded-full bg-white/70" />
      <div className="relative text-center text-[11px] font-black uppercase leading-tight tracking-[0.14em] text-white">
        Cidade
        <br />
        3D
      </div>
    </div>
  );
}

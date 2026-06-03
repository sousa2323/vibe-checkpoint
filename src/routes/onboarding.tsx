import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight, MapPin, Music2, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { authClient } from "@/auth";
import { PillButton } from "@/components/pill-button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

const slides = [
  {
    title: "Encontre o rolê certo agora",
    desc: "Eventos, bares e pubs acontecendo perto de você, sem ficar procurando em vários lugares.",
    image:
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&auto=format&fit=crop&q=70",
    eyebrow: "Descoberta ao vivo",
    icon: MapPin,
  },
  {
    title: "Sinta o clima antes de sair",
    desc: "Veja música ao vivo, movimento e destaques para decidir rápido onde vale chegar.",
    image:
      "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=1200&auto=format&fit=crop&q=70",
    eyebrow: "Clima em tempo real",
    icon: Music2,
  },
  {
    title: "Salve, combine e chegue junto",
    desc: "Guarde seus lugares favoritos, acompanhe eventos e compartilhe os planos com os amigos.",
    image:
      "https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=1200&auto=format&fit=crop&q=70",
    eyebrow: "Sua noite organizada",
    icon: UsersRound,
  },
];

function Onboarding() {
  const navigate = useNavigate();
  const { data, isPending } = authClient.useSession();
  const user = data?.user;
  const [i, setI] = useState(0);
  const slide = slides[i];
  const last = i === slides.length - 1;
  const Icon = slide.icon;

  useEffect(() => {
    if (isPending || !user?.id) return;

    try {
      localStorage.setItem("chegaai:onboarded", "1");
    } catch {
      // Browsers can block storage in stricter privacy modes.
    }

    navigate({ to: "/post-auth", replace: true });
  }, [isPending, navigate, user?.id]);

  function goToAuth() {
    try {
      localStorage.setItem("chegaai:onboarded", "1");
    } catch {
      // Browsers can block storage in stricter privacy modes.
    }
    navigate({ to: "/auth" });
  }

  function next() {
    if (last) {
      goToAuth();
    } else setI((current) => current + 1);
  }

  return (
    <main className="app-shell flex flex-col overflow-hidden bg-ink text-white">
      <div className="relative min-h-[58dvh] flex-1">
        <img
          src={slide.image}
          alt={slide.title}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/5 to-black/70" />
        <button
          type="button"
          onClick={goToAuth}
          className="absolute right-5 top-[calc(env(safe-area-inset-top)+1.25rem)] rounded-full border border-white/20 bg-black/35 px-4 py-2 text-sm font-bold text-white shadow-sm backdrop-blur-md transition-colors active:bg-black/45"
        >
          Pular
        </button>
        <div className="absolute bottom-7 left-6 right-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-2 text-xs font-bold backdrop-blur-md">
            <Icon className="h-4 w-4" />
            {slide.eyebrow}
          </div>
        </div>
      </div>

      <div className="relative z-10 -mt-6 rounded-t-[2rem] bg-background px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-8 text-foreground shadow-[0_-20px_50px_rgba(0,0,0,0.18)]">
        <h2 className="text-[30px] font-black leading-[1.04] tracking-tight">{slide.title}</h2>
        <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
          {slide.desc}
        </p>

        <div className="mt-7 flex items-center gap-2">
          {slides.map((_, slideIndex) => (
            <span
              key={slideIndex}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                slideIndex === i ? "w-8 bg-primary" : "w-2 bg-muted",
              )}
            />
          ))}
        </div>

        <PillButton
          variant="primary"
          size="lg"
          onClick={next}
          className="mt-8 w-full shadow-[0_18px_30px_rgba(241,58,90,0.25)]"
        >
          {last ? "Criar ou entrar na conta" : "Continuar"}
          <ChevronRight className="h-5 w-5" />
        </PillButton>

        <p className="mx-auto mt-4 max-w-xs text-center text-xs leading-relaxed text-muted-foreground">
          O onboarding aparece só no primeiro acesso. Depois disso, você volta direto para sua
          conta.
        </p>
      </div>
    </main>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PillButton } from "@/components/pill-button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

const slides = [
  {
    title: "Entre no Mundo dos Eventos ao Vivo",
    desc: "Descubra eventos incríveis perto de você e participe da ação — tudo a um toque.",
    image:
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&auto=format&fit=crop&q=70",
  },
  {
    title: "Bares e Pubs em Tempo Real",
    desc: "Veja onde está rolando música ao vivo agora e o movimento de cada lugar.",
    image:
      "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=1200&auto=format&fit=crop&q=70",
  },
  {
    title: "Divida Despesas com os Amigos",
    desc: "Nosso app facilita rachar a conta. Divida tudo sem dor de cabeça.",
    image:
      "https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=1200&auto=format&fit=crop&q=70",
  },
];

function Onboarding() {
  const [i, setI] = useState(0);
  const navigate = useNavigate();
  const slide = slides[i];
  const last = i === slides.length - 1;

  function next() {
    if (last) {
      localStorage.setItem("chegaai:onboarded", "1");
      navigate({ to: "/auth" });
    } else setI(i + 1);
  }

  return (
    <main className="app-shell flex flex-col bg-background">
      <div className="relative flex-1">
        <img
          src={slide.image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>

      <div className="-mt-10 rounded-t-[2.5rem] bg-background px-8 pb-8 pt-10">
        <h2 className="text-center text-[26px] font-bold leading-tight tracking-tight">
          {slide.title}
        </h2>
        <p className="mx-auto mt-3 max-w-xs text-center text-sm leading-relaxed text-muted-foreground">
          {slide.desc}
        </p>

        <div className="mt-6 flex items-center justify-center gap-1.5">
          {slides.map((_, n) => (
            <span
              key={n}
              className={cn(
                "h-1.5 rounded-full transition-all",
                n === i ? "w-6 bg-foreground" : "w-1.5 bg-muted",
              )}
            />
          ))}
        </div>

        <PillButton
          variant="dark"
          size="lg"
          onClick={next}
          className="mt-6 w-full"
        >
          {last ? "Vamos começar" : "Continuar"}
        </PillButton>

        {!last && (
          <button
            onClick={() => {
              localStorage.setItem("chegaai:onboarded", "1");
              navigate({ to: "/auth" });
            }}
            className="mx-auto mt-3 block text-sm font-medium text-muted-foreground"
          >
            Pular
          </button>
        )}
      </div>
    </main>
  );
}

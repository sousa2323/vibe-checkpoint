import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Clock, Mail } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function LegalPage({
  title,
  intro,
  updatedAt,
  crossLink,
  children,
}: {
  title: string;
  intro: React.ReactNode;
  updatedAt: string;
  crossLink: { to: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <article className="mx-auto max-w-2xl">
        <BackButton />

        <header className="mt-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-muted-foreground">
            ChegaAí
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">{title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{intro}</p>
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Atualizado em {updatedAt}
          </p>
        </header>

        <div className="mt-8 space-y-3">{children}</div>

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
          <BackButton />
          <Link
            to={crossLink.to}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-foreground underline underline-offset-4"
          >
            {crossLink.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </footer>
      </article>
    </main>
  );
}

function BackButton() {
  return (
    <Link
      to="/auth"
      className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-bold transition-colors hover:bg-muted"
    >
      <ArrowLeft className="h-4 w-4" />
      Voltar
    </Link>
  );
}

export function LegalSection({
  icon: Icon,
  number,
  title,
  children,
}: {
  icon: LucideIcon;
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-xs font-semibold text-muted-foreground">
            {String(number).padStart(2, "0")}
          </p>
          <h2 className="text-base font-extrabold tracking-tight">{title}</h2>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{children}</p>
    </section>
  );
}

export function LegalContactCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-ink p-5 text-white dark:border dark:border-border">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
          <Mail className="h-4 w-4" />
        </span>
        <h2 className="text-base font-extrabold tracking-tight">{title}</h2>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-white/70">{children}</p>
    </section>
  );
}

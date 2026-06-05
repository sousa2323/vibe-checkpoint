import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Check, Share2, UsersRound } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { authClient } from "@/auth";
import { BottomNav } from "@/components/bottom-nav";
import { NativeFeedback } from "@/components/native-feedback";
import { PillButton } from "@/components/pill-button";
import { createGroupPlan, getEvents, type EventSummary } from "@/lib/data";
import { canEventAppearInGroupVoting } from "@/lib/event-time";
import { requireAuthenticatedRoute } from "@/lib/route-guards";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/groups/new")({
  beforeLoad: requireAuthenticatedRoute,
  loader: () => getEvents(),
  component: NewGroupPlanPage,
});

function NewGroupPlanPage() {
  const events = Route.useLoaderData();
  const navigate = useNavigate();
  const { data } = authClient.useSession();
  const user = data?.user;
  const createPlan = useServerFn(createGroupPlan);
  const [title, setTitle] = useState("Qual vai ser o rolê?");
  const [description, setDescription] = useState("Vota aí para decidir com o grupo.");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const options = useMemo(
    () => events.filter((event) => canEventAppearInGroupVoting(event.startsAt)).slice(0, 20),
    [events],
  );
  const canSubmit = selectedIds.length >= 2 && selectedIds.length <= 4 && title.trim().length > 0;

  function toggleEvent(eventId: string) {
    setSelectedIds((current) => {
      if (current.includes(eventId)) return current.filter((id) => id !== eventId);
      if (current.length >= 4) {
        setStatus("Escolha no máximo 4 opções.");
        return current;
      }
      return [...current, eventId];
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      setStatus("Escolha de 2 a 4 eventos para o grupo votar.");
      return;
    }
    if (!user?.id) {
      setStatus("Entre na sua conta para criar um rolê em grupo.");
      navigate({ to: "/auth" });
      return;
    }

    setSaving(true);
    setStatus("Criando rolê...");
    try {
      const plan = await createPlan({
        data: {
          userId: user.id,
          title,
          description,
          eventIds: selectedIds,
        },
      });
      setStatus("Rolê criado. Compartilhe com o grupo.");
      navigate({ to: "/groups/$groupId", params: { groupId: plan.id } });
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "Não foi possível criar o rolê.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="app-shell bg-background px-6 pb-32 pt-8">
      <NativeFeedback message={status} onClose={() => setStatus(null)} />

      <button
        type="button"
        onClick={() => navigate({ to: "/discover" })}
        className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-muted"
        aria-label="Voltar"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <section className="rounded-[2rem] bg-ink p-5 text-white shadow-[0_20px_50px_-30px_rgba(0,0,0,0.8)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
          <UsersRound className="h-6 w-6" />
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-white/55">
          Rolê em grupo
        </p>
        <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight">
          Monte uma votação e mande o link para decidir com a galera.
        </h1>
      </section>

      <form onSubmit={submit} className="mt-6 space-y-5">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Nome
          </span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={90}
            className="mt-2 h-12 w-full rounded-2xl bg-muted px-4 text-sm font-bold outline-none"
          />
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Mensagem
          </span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={180}
            rows={3}
            className="mt-2 w-full resize-none rounded-2xl bg-muted px-4 py-3 text-sm outline-none"
          />
        </label>

        <div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Opções
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Selecione de 2 a 4 eventos.</p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-black">
              {selectedIds.length}/4
            </span>
          </div>

          <div className="mt-3 space-y-3">
            {options.length === 0 ? (
              <div className="rounded-3xl border border-border p-5 text-sm font-semibold text-muted-foreground">
                Nenhum evento disponível para votação agora.
              </div>
            ) : null}
            {options.map((event) => (
              <SelectableEvent
                key={event.id}
                event={event}
                selected={selectedIds.includes(event.id)}
                onToggle={() => toggleEvent(event.id)}
              />
            ))}
          </div>
        </div>

        <PillButton type="submit" className="w-full" disabled={!canSubmit || saving}>
          <Share2 className="h-4 w-4" />
          {saving ? "Criando..." : "Criar link do rolê"}
        </PillButton>
      </form>

      <BottomNav />
    </main>
  );
}

function SelectableEvent({
  event,
  selected,
  onToggle,
}: {
  event: EventSummary;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-3 rounded-3xl border p-3 text-left transition",
        selected ? "border-primary bg-primary/10" : "border-border bg-card",
      )}
    >
      <img src={event.image} alt={event.title} className="h-20 w-20 rounded-2xl object-cover" />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-black leading-tight">{event.title}</p>
        <p className="mt-1 line-clamp-1 text-xs font-semibold text-muted-foreground">
          {event.venueName}, {event.venueNeighborhood}
        </p>
        <p className="mt-2 text-xs font-bold text-primary">{event.date}</p>
      </div>
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
          selected ? "border-primary bg-primary text-white" : "border-border bg-background",
        )}
      >
        {selected ? <Check className="h-4 w-4" /> : null}
      </span>
    </button>
  );
}

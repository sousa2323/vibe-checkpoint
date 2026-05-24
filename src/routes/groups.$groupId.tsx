import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Copy, Share2, Trophy, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { authClient } from "@/auth";
import { BottomNav } from "@/components/bottom-nav";
import { NativeFeedback } from "@/components/native-feedback";
import { PillButton } from "@/components/pill-button";
import {
  getGroupPlan,
  type GroupPlanOptionSummary,
  type GroupPlanSummary,
  voteGroupPlan,
} from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/groups/$groupId")({
  loader: ({ params }) => getGroupPlan({ data: { groupId: params.groupId } }),
  component: GroupPlanPage,
});

function GroupPlanPage() {
  const initialPlan = Route.useLoaderData();
  const { groupId } = Route.useParams();
  const { data } = authClient.useSession();
  const user = data?.user;
  const loadPlan = useServerFn(getGroupPlan);
  const votePlan = useServerFn(voteGroupPlan);
  const [plan, setPlan] = useState<GroupPlanSummary | null>(initialPlan);
  const [voterKey, setVoterKey] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [votingOptionId, setVotingOptionId] = useState<string | null>(null);

  useEffect(() => {
    const key = user?.id ? `user:${user.id}` : getAnonymousVoterKey();
    setVoterKey(key);
    loadPlan({ data: { groupId, voterKey: key } })
      .then(setPlan)
      .catch(() => undefined);
  }, [groupId, loadPlan, user?.id]);

  async function vote(optionId: string) {
    const key = voterKey ?? getAnonymousVoterKey();
    setVoterKey(key);
    setVotingOptionId(optionId);
    try {
      const nextPlan = await votePlan({
        data: {
          groupId,
          optionId,
          voterKey: key,
          voterName: user?.name ?? undefined,
        },
      });
      setPlan(nextPlan);
      setStatus("Voto registrado. Você pode trocar enquanto o link estiver aberto.");
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "Não foi possível votar agora.");
    } finally {
      setVotingOptionId(null);
    }
  }

  async function sharePlan() {
    if (typeof window === "undefined" || !plan) return;
    const url = window.location.href;
    const text = `${plan.title} - vote no rolê do grupo: ${url}`;

    if (navigator.share) {
      await navigator.share({ title: plan.title, text, url });
      return;
    }

    await navigator.clipboard.writeText(text);
    setStatus("Link do rolê copiado.");
  }

  if (!plan) {
    return (
      <main className="app-shell bg-background px-6 pb-32 pt-8">
        <h1 className="text-2xl font-black">Rolê não encontrado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O link pode ter expirado ou sido removido.
        </p>
        <Link to="/discover" className="mt-6 inline-flex text-sm font-bold text-primary">
          Voltar para Explorar
        </Link>
        <BottomNav />
      </main>
    );
  }

  const rankedOptions = [...plan.options].sort((a, b) => b.votes - a.votes);
  const winnerId = rankedOptions[0]?.votes ? rankedOptions[0].id : undefined;

  return (
    <main className="app-shell bg-background px-6 pb-32 pt-8">
      <NativeFeedback message={status} onClose={() => setStatus(null)} />

      <section className="rounded-[2rem] bg-ink p-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <UsersRound className="h-6 w-6" />
          </div>
          <button
            type="button"
            onClick={() => void sharePlan()}
            className="flex h-10 items-center gap-2 rounded-full bg-white px-4 text-xs font-black text-ink"
          >
            <Share2 className="h-4 w-4" />
            Enviar
          </button>
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-white/55">
          Votação aberta
        </p>
        <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight">{plan.title}</h1>
        {plan.description ? (
          <p className="mt-3 text-sm leading-relaxed text-white/70">{plan.description}</p>
        ) : null}
        <div className="mt-5 flex items-center gap-2 text-xs font-bold text-white/60">
          <Copy className="h-4 w-4" />
          {plan.totalVotes} voto{plan.totalVotes === 1 ? "" : "s"} até agora
        </div>
      </section>

      <section className="mt-6 space-y-3">
        {rankedOptions.map((option) => (
          <GroupPlanOption
            key={option.id}
            option={option}
            totalVotes={plan.totalVotes}
            leading={option.id === winnerId}
            voting={votingOptionId === option.id}
            onVote={() => void vote(option.id)}
          />
        ))}
      </section>

      <PillButton className="mt-6 w-full" onClick={() => void sharePlan()}>
        <Share2 className="h-4 w-4" />
        Compartilhar votação
      </PillButton>

      <Link
        to="/groups/new"
        className="mt-4 flex h-12 items-center justify-center rounded-full bg-muted text-sm font-black"
      >
        Criar outro rolê
      </Link>

      <BottomNav />
    </main>
  );
}

function GroupPlanOption({
  option,
  totalVotes,
  leading,
  voting,
  onVote,
}: {
  option: GroupPlanOptionSummary;
  totalVotes: number;
  leading: boolean;
  voting: boolean;
  onVote: () => void;
}) {
  const percent = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;

  return (
    <article
      className={cn(
        "overflow-hidden rounded-[1.75rem] border bg-card",
        option.voted ? "border-primary ring-2 ring-primary/15" : "border-border",
      )}
    >
      <img src={option.image} alt={option.title} className="h-44 w-full object-cover" />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="line-clamp-2 text-lg font-black leading-tight">{option.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{option.subtitle}</p>
          </div>
          {leading ? (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-800">
              <Trophy className="h-3.5 w-3.5" />
              Top
            </span>
          ) : null}
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs font-bold text-muted-foreground">
          <span>
            {option.votes} voto{option.votes === 1 ? "" : "s"}
          </span>
          <span>{percent}%</span>
        </div>

        <button
          type="button"
          onClick={onVote}
          disabled={voting}
          className={cn(
            "mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-black transition disabled:opacity-60",
            option.voted ? "bg-primary text-white" : "bg-muted text-foreground",
          )}
        >
          {option.voted ? <CheckCircle2 className="h-4 w-4" /> : null}
          {voting ? "Votando..." : option.voted ? "Seu voto" : "Votar nessa opção"}
        </button>
      </div>
    </article>
  );
}

function getAnonymousVoterKey() {
  if (typeof window === "undefined") return "anonymous:ssr";

  const storageKey = "chagaai-group-voter-key";
  const current = window.localStorage.getItem(storageKey);
  if (current) return current;

  const next = `anonymous:${window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(storageKey, next);
  return next;
}

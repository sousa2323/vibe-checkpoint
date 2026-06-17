import { useServerFn } from "@tanstack/react-start";
import { LoaderCircle, UsersRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { UserAvatar } from "@/components/user-avatar";
import type { UserMentionSummary } from "@/lib/data";
import { searchUserMentions } from "@/lib/data";
import { cn } from "@/lib/utils";

type UserMentionPickerProps = {
  currentUserId?: string;
  label: string;
  value: string;
  selectedUser: UserMentionSummary | null;
  onValueChange: (value: string) => void;
  onSelectedUserChange: (user: UserMentionSummary | null) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
};

type UserMentionMultiPickerProps = {
  currentUserId?: string;
  label: string;
  selectedUsers: UserMentionSummary[];
  onSelectedUsersChange: (users: UserMentionSummary[]) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  maxUsers?: number;
};

export function UserMentionMultiPicker({
  currentUserId,
  label,
  selectedUsers,
  onSelectedUsersChange,
  placeholder = "@amigo",
  className,
  inputClassName,
  maxUsers = 10,
}: UserMentionMultiPickerProps) {
  const searchUsers = useServerFn(searchUserMentions);
  const [queryValue, setQueryValue] = useState("");
  const [results, setResults] = useState<UserMentionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const query = normalizeMentionQuery(queryValue);
  const selectedUserIds = selectedUsers.map((user) => user.userId);
  const selectedKey = selectedUserIds.join("|");
  const canAddMore = selectedUsers.length < maxUsers;

  useEffect(() => {
    if (!canAddMore || !currentUserId || query.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      setLoading(true);
      searchUsers({ data: { userId: currentUserId, query } })
        .then((users) => {
          if (cancelled) return;
          const selectedIds = new Set(selectedKey ? selectedKey.split("|") : []);
          setResults(users.filter((user) => !selectedIds.has(user.userId)));
          setOpen(true);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [canAddMore, currentUserId, query, searchUsers, selectedKey]);

  function selectUser(user: UserMentionSummary) {
    if (selectedUsers.some((selectedUser) => selectedUser.userId === user.userId) || !canAddMore)
      return;
    onSelectedUsersChange([...selectedUsers, user]);
    setQueryValue("");
    setResults([]);
    setOpen(false);
  }

  function removeUser(userId: string) {
    onSelectedUsersChange(selectedUsers.filter((user) => user.userId !== userId));
  }

  return (
    <label className={cn("relative block", className)}>
      <span className="text-xs font-black uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div
        className={cn(
          "mt-2 flex min-h-12 flex-wrap items-center gap-2 rounded-3xl bg-muted px-3 py-2",
          inputClassName,
        )}
      >
        <UsersRound className="h-4 w-4 shrink-0 text-muted-foreground" />
        {selectedUsers.map((user) => (
          <span
            key={user.userId}
            className="inline-flex max-w-full items-center gap-1 rounded-full bg-background px-2.5 py-1 text-xs font-black shadow-sm"
          >
            <span className="max-w-32 truncate">{mentionLabel(user)}</span>
            <button
              type="button"
              onClick={() => removeUser(user.userId)}
              aria-label={`Remover ${mentionLabel(user)}`}
              className="rounded-full text-muted-foreground transition hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        {canAddMore ? (
          <input
            value={queryValue}
            onChange={(event) => {
              setQueryValue(event.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              if (query.length >= 2) setOpen(true);
            }}
            onBlur={() => window.setTimeout(() => setOpen(false), 120)}
            placeholder={selectedUsers.length > 0 ? "Adicionar pessoa" : placeholder}
            className="min-w-28 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground"
          />
        ) : null}
        {loading ? <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
      </div>

      {open && query.length >= 2 && canAddMore ? (
        <MentionResults results={results} loading={loading} onSelect={selectUser} />
      ) : null}
    </label>
  );
}

export function UserMentionPicker({
  currentUserId,
  label,
  value,
  selectedUser,
  onValueChange,
  onSelectedUserChange,
  placeholder = "@amigo",
  className,
  inputClassName,
}: UserMentionPickerProps) {
  const searchUsers = useServerFn(searchUserMentions);
  const [results, setResults] = useState<UserMentionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const query = normalizeMentionQuery(value);
  const selectedUserLabel = selectedUser ? mentionLabel(selectedUser) : "";
  const hasSelectedUserValue = Boolean(selectedUser && value === selectedUserLabel);

  useEffect(() => {
    if (hasSelectedUserValue || !currentUserId || query.length < 2) {
      setResults([]);
      setLoading(false);
      if (hasSelectedUserValue) setOpen(false);
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      setLoading(true);
      searchUsers({ data: { userId: currentUserId, query } })
        .then((users) => {
          if (cancelled) return;
          setResults(users);
          setOpen(true);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [currentUserId, hasSelectedUserValue, query, searchUsers]);

  function handleValueChange(nextValue: string) {
    onValueChange(nextValue);
    if (selectedUser && nextValue !== selectedUserLabel) onSelectedUserChange(null);
    setOpen(true);
  }

  function selectUser(user: UserMentionSummary) {
    onSelectedUserChange(user);
    onValueChange(mentionLabel(user));
    setOpen(false);
  }

  return (
    <label className={cn("relative block", className)}>
      <span className="text-xs font-black uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div
        className={cn(
          "mt-2 flex h-12 items-center gap-2 rounded-full bg-muted px-4",
          inputClassName,
        )}
      >
        <UsersRound className="h-4 w-4 text-muted-foreground" />
        <input
          value={value}
          onChange={(event) => handleValueChange(event.target.value)}
          onFocus={() => {
            if (!hasSelectedUserValue) setOpen(true);
          }}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground"
        />
        {loading ? <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
      </div>

      {open && !hasSelectedUserValue && query.length >= 2 ? (
        <MentionResults results={results} loading={loading} onSelect={selectUser} />
      ) : null}
    </label>
  );
}

function MentionResults({
  results,
  loading,
  onSelect,
}: {
  results: UserMentionSummary[];
  loading: boolean;
  onSelect: (user: UserMentionSummary) => void;
}) {
  return (
    <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-3xl border border-border bg-background shadow-2xl">
      {results.length > 0 ? (
        <div className="max-h-72 overflow-y-auto py-2">
          {results.map((user) => (
            <button
              key={user.userId}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(user)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-muted"
            >
              <UserAvatar
                name={user.displayName ?? user.username ?? "Usuário"}
                imageUrl={user.avatarUrl}
                className="h-10 w-10"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black">{mentionLabel(user)}</span>
                {user.displayName ? (
                  <span className="mt-0.5 block truncate text-xs font-semibold text-muted-foreground">
                    {user.displayName}
                  </span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="px-4 py-3 text-sm font-semibold text-muted-foreground">
          {loading ? "Buscando..." : "Nenhum usuário encontrado."}
        </p>
      )}
    </div>
  );
}

function mentionLabel(user: UserMentionSummary) {
  return user.username ? `@${user.username}` : (user.displayName ?? "");
}

function normalizeMentionQuery(value: string) {
  return value.trim().replace(/^@+/, "").toLowerCase();
}

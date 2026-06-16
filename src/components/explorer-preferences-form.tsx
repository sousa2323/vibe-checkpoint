import { type ReactNode, useEffect, useState } from "react";
import {
  DEFAULT_EXPLORER_PREFERENCES,
  type ExplorerPreferenceMood,
  type ExplorerPreferenceOptions,
  type ExplorerPreferences,
} from "@/lib/profile-actions";
import { cn } from "@/lib/utils";

const MOOD_OPTIONS: Array<{ value: ExplorerPreferenceMood; label: string }> = [
  { value: "live", label: "Ao vivo" },
  { value: "crowded", label: "Bombando" },
  { value: "calm", label: "Mais tranquilo" },
  { value: "date", label: "Encontro" },
  { value: "group", label: "Grupo" },
];

type ExplorerPreferencesFormProps = {
  value?: ExplorerPreferences;
  options?: ExplorerPreferenceOptions;
  optionsContext?: string;
  onSubmit: (preferences: ExplorerPreferences) => void | Promise<void>;
  submitLabel?: string;
  submitting?: boolean;
  compact?: boolean;
};

export function ExplorerPreferencesForm({
  value = DEFAULT_EXPLORER_PREFERENCES,
  options,
  optionsContext = "locais cadastrados no app",
  onSubmit,
  submitLabel = "Salvar preferências",
  submitting = false,
  compact = false,
}: ExplorerPreferencesFormProps) {
  const [draft, setDraft] = useState<ExplorerPreferences>(value);
  const neighborhoodOptions = mergeSelectedOptions(options?.neighborhoods, draft.neighborhoods);
  const categoryOptions = mergeSelectedOptions(options?.categories, draft.categories);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function toggleListValue(field: "neighborhoods" | "categories", option: string) {
    setDraft((current) => ({
      ...current,
      [field]: current[field].includes(option)
        ? current[field].filter((item) => item !== option)
        : [...current[field], option].slice(0, 6),
    }));
  }

  function toggleMood(option: ExplorerPreferenceMood) {
    setDraft((current) => ({
      ...current,
      moods: current.moods.includes(option)
        ? current.moods.filter((item) => item !== option)
        : [...current.moods, option].slice(0, 5),
    }));
  }

  return (
    <form
      className={cn("space-y-5", compact && "space-y-4")}
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(draft);
      }}
    >
      <PreferenceGroup
        title="Bairros preferidos"
        helper={`Baseado nos bairros disponíveis em ${optionsContext}.`}
      >
        {neighborhoodOptions.length ? (
          <ChipGrid>
            {neighborhoodOptions.map((option) => (
              <PreferenceChip
                key={option}
                selected={draft.neighborhoods.includes(option)}
                onClick={() => toggleListValue("neighborhoods", option)}
              >
                {option}
              </PreferenceChip>
            ))}
          </ChipGrid>
        ) : (
          <EmptyOptions>Nenhum bairro disponível para a região atual.</EmptyOptions>
        )}
      </PreferenceGroup>

      <PreferenceGroup
        title="Estilo de rolê"
        helper={`Categorias dos estabelecimentos em ${optionsContext}.`}
      >
        {categoryOptions.length ? (
          <ChipGrid>
            {categoryOptions.map((option) => (
              <PreferenceChip
                key={option}
                selected={draft.categories.includes(option)}
                onClick={() => toggleListValue("categories", option)}
              >
                {option}
              </PreferenceChip>
            ))}
          </ChipGrid>
        ) : (
          <EmptyOptions>Nenhuma categoria disponível para a região atual.</EmptyOptions>
        )}
      </PreferenceGroup>

      <PreferenceGroup title="Clima ideal" helper="O app usa isso para ordenar sugestões.">
        <ChipGrid>
          {MOOD_OPTIONS.map((option) => (
            <PreferenceChip
              key={option.value}
              selected={draft.moods.includes(option.value)}
              onClick={() => toggleMood(option.value)}
            >
              {option.label}
            </PreferenceChip>
          ))}
        </ChipGrid>
      </PreferenceGroup>

      <PreferenceGroup title="Distância máxima" helper="Também pode aplicar o raio do mapa.">
        <div className="rounded-2xl bg-muted p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-foreground">Até onde topar ir</span>
            <span className="rounded-full bg-background px-3 py-1 text-sm font-black">
              {draft.maxDistanceKm} km
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={25}
            step={1}
            value={draft.maxDistanceKm}
            onChange={(event) =>
              setDraft((current) => ({ ...current, maxDistanceKm: event.target.valueAsNumber }))
            }
            className="mt-3 w-full accent-primary"
            aria-label="Distância máxima preferida"
          />
        </div>
      </PreferenceGroup>

      <button
        type="submit"
        disabled={submitting}
        className="h-12 w-full rounded-full bg-primary px-4 text-sm font-black text-white shadow-[0_18px_40px_rgba(241,58,90,0.24)] transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Salvando..." : submitLabel}
      </button>
    </form>
  );
}

function mergeSelectedOptions(options: string[] | undefined, selected: string[]) {
  return [...selected, ...(options ?? [])]
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index)
    .slice(0, 40);
}

function PreferenceGroup({
  title,
  helper,
  children,
}: {
  title: string;
  helper: string;
  children: ReactNode;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-black">{title}</legend>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{helper}</p>
      <div className="mt-3">{children}</div>
    </fieldset>
  );
}

function ChipGrid({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function EmptyOptions({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-muted px-3 py-2 text-xs text-muted-foreground">{children}</p>;
}

function PreferenceChip({
  selected,
  onClick,
  className,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-9 rounded-full px-3 py-2 text-xs font-black transition active:scale-[0.98]",
        selected ? "bg-primary text-white" : "bg-muted text-muted-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

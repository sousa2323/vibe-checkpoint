import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import type { PointerEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PillButton } from "@/components/pill-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrencyInput, parseCurrencyToCents } from "@/lib/currency";
import { cn } from "@/lib/utils";

export type AppSelectOption = {
  value: string;
  label: string;
};

export function AppCurrencyField({
  label,
  name,
  defaultCents,
  placeholder = "R$ 0,00",
  className,
  labelClassName,
  inputClassName,
}: {
  label: string;
  name: string;
  defaultCents?: number;
  placeholder?: string;
  className?: string;
  labelClassName?: string;
  inputClassName?: string;
}) {
  const [cents, setCents] = useState<number | undefined>(defaultCents);

  useEffect(() => {
    setCents(defaultCents);
  }, [defaultCents]);

  return (
    <label className={cn("block", className)}>
      <span className={cn("text-sm font-semibold", labelClassName)}>{label}</span>
      <input type="hidden" name={name} value={cents ?? ""} />
      <input
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={formatCurrencyInput(cents)}
        onChange={(event) => setCents(parseCurrencyToCents(event.currentTarget.value))}
        className={cn(
          "mt-1.5 h-12 w-full rounded-2xl border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground",
          inputClassName,
        )}
      />
    </label>
  );
}

export function AppSelect({
  label,
  name,
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder = "Selecione",
  className,
  labelClassName,
  triggerClassName,
}: {
  label: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: AppSelectOption[];
  placeholder?: string;
  className?: string;
  labelClassName?: string;
  triggerClassName?: string;
}) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? value ?? "");
  const selectedValue = value ?? internalValue;

  useEffect(() => {
    if (value !== undefined) setInternalValue(value);
  }, [value]);

  useEffect(() => {
    if (value === undefined) setInternalValue(defaultValue ?? "");
  }, [defaultValue, value]);

  function handleChange(nextValue: string) {
    setInternalValue(nextValue);
    onValueChange?.(nextValue);
  }

  return (
    <label className={cn("block", className)}>
      <span className={cn("text-sm font-semibold", labelClassName)}>{label}</span>
      {name ? <input type="hidden" name={name} value={selectedValue} /> : null}
      <Select value={selectedValue} onValueChange={handleChange}>
        <SelectTrigger
          className={cn(
            "mt-1.5 h-12 rounded-2xl border-border bg-background px-3 text-sm shadow-none focus:ring-0 focus:ring-offset-0",
            triggerClassName,
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="z-[70] rounded-3xl border-border p-2 shadow-2xl">
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="rounded-2xl px-3 py-3 text-sm font-semibold focus:bg-muted"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

export function AppDateTimeField({
  label,
  name,
  defaultValue,
  required,
  className,
  labelClassName,
  triggerClassName,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  className?: string;
  labelClassName?: string;
  triggerClassName?: string;
}) {
  const initialDate = parseLocalDateTime(defaultValue);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue ?? "");
  const [month, setMonth] = useState(() => startOfMonth(initialDate ?? new Date()));
  const [draft, setDraft] = useState<Date>(() => initialDate ?? withDefaultTime(new Date()));
  const swipeStartY = useRef<number | null>(null);

  useEffect(() => {
    const nextDate = parseLocalDateTime(defaultValue);
    setValue(defaultValue ?? "");
    setDraft(nextDate ?? withDefaultTime(new Date()));
    setMonth(startOfMonth(nextDate ?? new Date()));
  }, [defaultValue]);

  const days = useMemo(() => getCalendarDays(month), [month]);
  const displayValue = value
    ? formatDisplayDateTime(parseLocalDateTime(value))
    : "dd/mm/aaaa --:--";

  function selectDay(day: Date) {
    const next = new Date(draft);
    next.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
    setDraft(next);
  }

  function selectHour(hour: number) {
    const next = new Date(draft);
    next.setHours(hour);
    setDraft(next);
  }

  function selectMinute(minute: number) {
    const next = new Date(draft);
    next.setMinutes(minute);
    setDraft(next);
  }

  function confirmDateTime() {
    setValue(formatInputDateTime(draft));
    setOpen(false);
  }

  function handleSwipeStart(event: PointerEvent<HTMLDivElement>) {
    swipeStartY.current = event.clientY;
  }

  function handleSwipeEnd(event: PointerEvent<HTMLDivElement>) {
    if (swipeStartY.current === null) return;

    const deltaY = event.clientY - swipeStartY.current;
    swipeStartY.current = null;

    if (deltaY > 70) setOpen(false);
  }

  return (
    <label className={cn("block", className)}>
      <span className={cn("text-sm font-semibold", labelClassName)}>{label}</span>
      <input name={name} value={value} readOnly className="sr-only" tabIndex={-1} />
      <button
        type="button"
        aria-required={required}
        onClick={() => setOpen(true)}
        className={cn(
          "mt-1.5 flex h-12 w-full items-center justify-between rounded-2xl border border-border bg-background px-3 text-left text-sm outline-none transition-colors hover:bg-muted placeholder:text-muted-foreground",
          value ? "text-foreground" : "text-muted-foreground",
          triggerClassName,
        )}
      >
        <span>{displayValue}</span>
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bottom-0 top-auto flex max-h-[92dvh] max-w-[420px] translate-y-0 flex-col overflow-hidden rounded-t-[2rem] border-0 p-0 sm:top-[50%] sm:max-h-[88vh] sm:translate-y-[-50%] sm:rounded-[2rem]">
          <div
            className="touch-none bg-primary/10 px-5 pt-3"
            onPointerDown={handleSwipeStart}
            onPointerUp={handleSwipeEnd}
            onPointerCancel={() => {
              swipeStartY.current = null;
            }}
          >
            <div className="mx-auto h-1.5 w-12 rounded-full bg-foreground/20" />
          </div>
          <DialogHeader
            className="border-b border-primary/10 bg-primary/10 p-5 pt-4 pr-12 text-left text-foreground"
            onPointerDown={handleSwipeStart}
            onPointerUp={handleSwipeEnd}
            onPointerCancel={() => {
              swipeStartY.current = null;
            }}
          >
            <DialogTitle className="text-2xl font-black">Escolher data e hora</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Selecione como em um app, sem abrir o calendário do navegador.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5 pt-4 overscroll-contain sm:space-y-4">
            <div className="flex items-center justify-between rounded-3xl bg-muted p-1.5 sm:p-2">
              <button
                type="button"
                onClick={() => setMonth(addMonths(month, -1))}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-background"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-sm font-black capitalize">{formatMonthLabel(month)}</p>
              <button
                type="button"
                onClick={() => setMonth(addMonths(month, 1))}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-background"
                aria-label="Próximo mês"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-black text-muted-foreground">
              {WEEKDAYS.map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const selected = isSameDay(day, draft);
                const currentMonth = day.getMonth() === month.getMonth();
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => selectDay(day)}
                    className={cn(
                      "flex h-9 items-center justify-center rounded-2xl text-sm font-bold transition-colors sm:h-10",
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-foreground hover:bg-muted",
                      !currentMonth && !selected ? "text-muted-foreground/60" : "",
                    )}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3 pb-1">
              <TimeColumn
                icon={<Clock className="h-4 w-4" />}
                label="Hora"
                values={HOURS}
                selected={draft.getHours()}
                onSelect={selectHour}
              />
              <TimeColumn
                label="Minuto"
                values={MINUTES}
                selected={draft.getMinutes()}
                onSelect={selectMinute}
              />
            </div>

            <PillButton type="button" size="lg" className="w-full" onClick={confirmDateTime}>
              Confirmar {formatDisplayDateTime(draft)}
            </PillButton>
          </div>
        </DialogContent>
      </Dialog>
    </label>
  );
}

function TimeColumn({
  icon,
  label,
  values,
  selected,
  onSelect,
}: {
  icon?: ReactNode;
  label: string;
  values: number[];
  selected: number;
  onSelect: (value: number) => void;
}) {
  return (
    <div className="rounded-3xl bg-muted p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase text-muted-foreground">
        {icon}
        {label}
      </p>
      <div className="grid max-h-36 grid-cols-2 gap-1 overflow-y-auto pr-1">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            className={cn(
              "flex h-10 items-center justify-center gap-1 rounded-2xl text-sm font-black transition-colors",
              selected === value
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:bg-background/80",
            )}
          >
            {selected === value ? <Check className="h-3.5 w-3.5" /> : null}
            {pad(value)}
          </button>
        ))}
      </div>
    </div>
  );
}

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const HOURS = Array.from({ length: 24 }, (_, index) => index);
const MINUTES = Array.from({ length: 12 }, (_, index) => index * 5);

function parseLocalDateTime(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function withDefaultTime(date: Date) {
  const next = new Date(date);
  next.setSeconds(0, 0);
  if (next.getHours() === 0 && next.getMinutes() === 0) next.setHours(20, 0);
  return next;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function getCalendarDays(month: Date) {
  const start = startOfMonth(month);
  const firstDay = start.getDay();
  const firstVisible = new Date(start);
  firstVisible.setDate(start.getDate() - firstDay);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(firstVisible);
    day.setDate(firstVisible.getDate() + index);
    return day;
  });
}

function isSameDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function formatInputDateTime(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function formatDisplayDateTime(value: Date | null) {
  if (!value) return "dd/mm/aaaa --:--";
  return `${pad(value.getDate())}/${pad(value.getMonth() + 1)}/${value.getFullYear()} ${pad(
    value.getHours(),
  )}:${pad(value.getMinutes())}`;
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

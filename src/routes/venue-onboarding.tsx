import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AtSign,
  Building2,
  CheckCircle2,
  ChevronDown,
  FileText,
  ImagePlus,
  MapPin,
  Phone,
  Store,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent, HTMLAttributes, ReactNode } from "react";
import { authClient, getAuthUserName } from "@/auth";
import { PillButton } from "@/components/pill-button";
import { RealMap } from "@/components/real-map";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fileToBase64, validateImageFile } from "@/lib/file";
import { uploadMedia } from "@/lib/media";
import type { Coordinates } from "@/lib/location";
import { searchLocation, type LocationLookupResult } from "@/lib/data";
import { createOrUpdateVenueForOwner, getOwnerVenueForOnboarding } from "@/lib/profile-actions";
import { requireAuthenticatedRoute } from "@/lib/route-guards";
import { timeoutMessage, withTimeout } from "@/lib/timeout";

export const Route = createFileRoute("/venue-onboarding")({
  beforeLoad: requireAuthenticatedRoute,
  component: VenueOnboarding,
});

const roleOptions = ["Dono", "Sócio", "Gerente", "Produtor", "Marketing", "Operações"];

const categoryOptions = [
  "Bar",
  "Restaurante",
  "Casa de shows",
  "Balada",
  "Espaço de eventos",
  "Café",
  "Pub",
  "Outro",
];

const stateOptions = [
  "AC",
  "AL",
  "AM",
  "AP",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MG",
  "MS",
  "MT",
  "PA",
  "PB",
  "PE",
  "PI",
  "PR",
  "RJ",
  "RN",
  "RO",
  "RR",
  "RS",
  "SC",
  "SE",
  "SP",
  "TO",
];

type VenueFormValues = {
  venueName: string;
  businessRole: string;
  whatsapp: string;
  category: string;
  state: string;
  city: string;
  neighborhood: string;
  address: string;
  instagram: string;
  capacity: string;
  description: string;
};

const emptyFormValues: VenueFormValues = {
  venueName: "",
  businessRole: "",
  whatsapp: "",
  category: "",
  state: "SP",
  city: "",
  neighborhood: "",
  address: "",
  instagram: "",
  capacity: "",
  description: "",
};

function onlyDigits(value: string, maxLength: number) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

function formatPhone(value: string) {
  const digits = onlyDigits(value, 11);
  const area = digits.slice(0, 2);
  const first = digits.length > 10 ? digits.slice(2, 7) : digits.slice(2, 6);
  const second = digits.length > 10 ? digits.slice(7, 11) : digits.slice(6, 10);

  if (digits.length <= 2) return area ? `(${area}` : "";
  if (!second) return `(${area}) ${first}`;
  return `(${area}) ${first}-${second}`;
}

function formatInstagram(value: string) {
  const username = value
    .replace(/^@+/, "")
    .replace(/[^a-zA-Z0-9._]/g, "")
    .slice(0, 30);
  return username ? `@${username}` : "";
}

function normalizeInstagram(value: string) {
  return value.trim().replace(/^@+/, "");
}

function isAuthError(cause: unknown) {
  return (
    cause instanceof Error &&
    (cause.message.includes("Usuário não autenticado") ||
      cause.message.includes("Sessão não corresponde"))
  );
}

function VenueOnboarding() {
  const navigate = useNavigate();
  const session = authClient.useSession();
  const { data, isPending } = session;
  const user = data?.user;
  const upload = useServerFn(uploadMedia);
  const saveVenue = useServerFn(createOrUpdateVenueForOwner);
  const findLocation = useServerFn(searchLocation);
  const getOwnerVenue = useServerFn(getOwnerVenueForOnboarding);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [savingMessage, setSavingMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<VenueFormValues>(emptyFormValues);
  const [existingCoverImageUrl, setExistingCoverImageUrl] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [addressResult, setAddressResult] = useState<LocationLookupResult | null>(null);
  const [addressStatus, setAddressStatus] = useState<string | null>(null);
  const [checkingAddress, setCheckingAddress] = useState(false);

  useEffect(() => {
    if (isPending || user?.id) return;
    navigate({ to: "/auth", replace: true });
  }, [isPending, navigate, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;

    async function loadVenue() {
      try {
        const venue = await getOwnerVenue({ data: { userId: user?.id } });
        if (!active || !venue) return;

        setFormValues({
          venueName: venue.venueName,
          businessRole: venue.businessRole ?? "",
          whatsapp: venue.whatsapp ?? "",
          category: venue.category ?? "",
          state: venue.state ?? "SP",
          city: venue.city ?? "",
          neighborhood: venue.neighborhood ?? "",
          address: venue.address ?? "",
          instagram: venue.instagram ? formatInstagram(venue.instagram) : "",
          capacity: venue.capacity ? String(venue.capacity) : "",
          description: venue.description ?? "",
        });
        setExistingCoverImageUrl(venue.coverImageUrl ?? null);
        setPreview(venue.coverImageUrl ?? null);

        if (venue.latitude != null && venue.longitude != null) {
          const nextCoordinates = { latitude: venue.latitude, longitude: venue.longitude };
          setCoordinates(nextCoordinates);
          setAddressResult({
            label: [venue.address, venue.neighborhood, venue.city, venue.state]
              .filter(Boolean)
              .join(", "),
            ...nextCoordinates,
          });
          setAddressStatus("Endereço já confirmado para este estabelecimento.");
        }
      } catch (cause) {
        if (!active) return;
        if (isAuthError(cause)) {
          setError("Sua sessão expirou. Entre novamente para continuar o cadastro.");
          navigate({ to: "/auth", replace: true });
          return;
        }
        setError("Não foi possível carregar seu estabelecimento agora.");
      }
    }

    void loadVenue();

    return () => {
      active = false;
    };
  }, [getOwnerVenue, navigate, user?.id]);

  function updateField(name: keyof VenueFormValues, value: string) {
    setFormValues((current) => ({ ...current, [name]: value }));
    if (name === "state" || name === "city" || name === "neighborhood" || name === "address") {
      setCoordinates(null);
      setAddressResult(null);
      setAddressStatus("Confirme o endereço para fixar o local no mapa.");
    }
  }

  async function verifyAddress() {
    const query = [
      formValues.address,
      formValues.neighborhood,
      formValues.city,
      formValues.state,
      "Brasil",
    ]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(", ");

    if (!formValues.state || !formValues.city || !formValues.neighborhood || !formValues.address) {
      setAddressStatus("Preencha estado, cidade, bairro e endereço antes de verificar.");
      return;
    }

    setCheckingAddress(true);
    setAddressStatus("Buscando endereço no mapa...");
    try {
      const result = await findLocation({ data: { query } });
      if (!result) {
        setAddressStatus("Não encontrei esse endereço. Confira rua, número, bairro e cidade.");
        setCoordinates(null);
        setAddressResult(null);
        return;
      }

      const nextCoordinates = { latitude: result.latitude, longitude: result.longitude };
      setCoordinates(nextCoordinates);
      setAddressResult(result);
      setAddressStatus(
        "Endereço encontrado. Confira se o pin está no lugar certo antes de salvar.",
      );
    } catch {
      setAddressStatus("Não foi possível verificar o endereço agora.");
    } finally {
      setCheckingAddress(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setSavingMessage(null);
    setError(null);

    if (isPending) {
      setStatus("idle");
      setSavingMessage(null);
      setError("Aguarde a sessão carregar antes de salvar.");
      return;
    }

    const currentUser: typeof user | null = user ?? null;

    if (!currentUser?.id) {
      setStatus("idle");
      setSavingMessage(null);
      setError("Sua sessão expirou. Entre novamente para continuar o cadastro.");
      navigate({ to: "/auth" });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const venueName = formValues.venueName.trim();
    const businessRole = formValues.businessRole.trim();
    const whatsapp = formValues.whatsapp.trim();
    const category = formValues.category.trim();
    const state = formValues.state.trim();
    const city = formValues.city.trim();
    const neighborhood = formValues.neighborhood.trim();
    const address = formValues.address.trim();
    const instagram = normalizeInstagram(formValues.instagram);
    const capacity = Number(onlyDigits(formValues.capacity, 6));
    const description = formValues.description.trim();
    const imageField = formData.get("image");
    const image = imageField instanceof File && imageField.size > 0 ? imageField : null;
    const imageError = image ? validateImageFile(image) : null;

    if (!venueName || !businessRole || !category || !state || !city || !neighborhood || !address) {
      setStatus("idle");
      setError("Preencha nome, função, categoria, estado, cidade, bairro e endereço.");
      return;
    }

    if (onlyDigits(whatsapp, 11).length < 10) {
      setStatus("idle");
      setError("Informe um WhatsApp válido com DDD.");
      return;
    }

    if (imageError || (!image && !existingCoverImageUrl)) {
      setStatus("idle");
      setError(imageError ?? "Envie uma imagem real do local.");
      return;
    }

    try {
      let coverImageUrl = existingCoverImageUrl;
      if (image) {
        setSavingMessage("Enviando imagem...");
        const base64 = await fileToBase64(image);
        const media = await withTimeout(
          upload({
            data: {
              userId: currentUser.id,
              mimeType: image.type,
              base64,
            },
          }),
          30000,
          timeoutMessage("enviar a imagem"),
        );
        coverImageUrl = media.mediaUrl;
      }

      if (!coverImageUrl) throw new Error("Envie uma imagem real do local.");

      setSavingMessage("Salvando estabelecimento...");
      await withTimeout(
        saveVenue({
          data: {
            userId: currentUser.id,
            accountType: "owner",
            displayName: getAuthUserName(currentUser),
            venueName,
            businessRole,
            category,
            state,
            city,
            neighborhood,
            address,
            instagram: instagram || undefined,
            whatsapp,
            capacity: capacity || undefined,
            description: description || undefined,
            latitude: coordinates?.latitude,
            longitude: coordinates?.longitude,
            coverImageUrl,
            onboardingCompleted: true,
          },
        }),
        30000,
        timeoutMessage("salvar o estabelecimento"),
      );

      setStatus("saved");
      setSavingMessage(null);
      setTimeout(() => navigate({ to: "/venue-dashboard" }), 700);
    } catch (cause) {
      setStatus("idle");
      setSavingMessage(null);
      if (isAuthError(cause)) {
        setError("Sua sessão expirou. Entre novamente para salvar o estabelecimento.");
        navigate({ to: "/auth" });
        return;
      }
      setError(
        cause instanceof Error ? cause.message : "Não foi possível salvar o estabelecimento.",
      );
    }
  }

  return (
    <main className="app-shell bg-background px-6 py-8">
      <div className="mx-auto flex max-w-md flex-col">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate({ to: "/auth" })}
            className="text-sm font-semibold text-muted-foreground"
          >
            Voltar
          </button>
          <div className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
            Dono
          </div>
        </div>

        <div className="mt-7">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-white">
            <Building2 className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-3xl font-black leading-tight tracking-tight">
            Cadastre seu estabelecimento
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Seu local será criado para aparecer no app, receber eventos e contatos.
          </p>
        </div>

        <form onSubmit={submit} className="mt-7 space-y-3 rounded-3xl border border-border p-4">
          <label className="block">
            <span className="text-sm font-semibold">Imagem real do local</span>
            <span className="mt-1.5 flex min-h-36 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-center">
              {preview ? (
                <img src={preview} alt="" className="h-40 w-full rounded-2xl object-cover" />
              ) : (
                <>
                  <ImagePlus className="h-7 w-7 text-muted-foreground" />
                  <span className="mt-2 text-sm font-semibold">Enviar imagem</span>
                  <span className="mt-1 text-xs text-muted-foreground">
                    JPG, PNG ou WebP até 2MB
                  </span>
                </>
              )}
              <input
                type="file"
                name="image"
                accept="image/jpeg,image/png,image/webp"
                required={!existingCoverImageUrl}
                className="sr-only"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0] ?? null;
                  setError(file ? validateImageFile(file) : null);
                  setPreview(file ? URL.createObjectURL(file) : existingCoverImageUrl);
                }}
              />
            </span>
          </label>

          <Field
            icon={<Building2 className="h-4 w-4" />}
            label="Nome do estabelecimento"
            name="venueName"
            placeholder="Nome real do local"
            value={formValues.venueName}
            onValueChange={(value) => updateField("venueName", value)}
            required
          />
          <SelectField
            icon={<UserRound className="h-4 w-4" />}
            label="Sua função"
            name="businessRole"
            placeholder="Selecione sua função"
            options={roleOptions}
            value={formValues.businessRole}
            onValueChange={(value) => updateField("businessRole", value)}
            required
          />
          <SelectField
            icon={<Store className="h-4 w-4" />}
            label="Categoria do local"
            name="category"
            placeholder="Selecione uma categoria"
            options={categoryOptions}
            value={formValues.category}
            onValueChange={(value) => updateField("category", value)}
            required
          />
          <Field
            icon={<Phone className="h-4 w-4" />}
            label="WhatsApp para contato"
            name="whatsapp"
            placeholder="(11) 99999-9999"
            inputMode="tel"
            maxLength={15}
            onFormat={formatPhone}
            value={formValues.whatsapp}
            onValueChange={(value) => updateField("whatsapp", value)}
            required
          />
          <Field
            icon={<AtSign className="h-4 w-4" />}
            label="Instagram"
            name="instagram"
            placeholder="@seulocal"
            maxLength={31}
            onFormat={formatInstagram}
            value={formValues.instagram}
            onValueChange={(value) => updateField("instagram", value)}
          />
          <Field
            icon={<UsersRound className="h-4 w-4" />}
            label="Capacidade aproximada"
            name="capacity"
            placeholder="Ex: 250"
            inputMode="numeric"
            maxLength={6}
            onFormat={(value) => onlyDigits(value, 6)}
            value={formValues.capacity}
            onValueChange={(value) => updateField("capacity", value)}
          />
          <SelectField
            icon={<MapPin className="h-4 w-4" />}
            label="Estado"
            name="state"
            placeholder="UF"
            options={stateOptions}
            value={formValues.state}
            onValueChange={(value) => updateField("state", value)}
            required
          />
          <Field
            icon={<MapPin className="h-4 w-4" />}
            label="Cidade"
            name="city"
            placeholder="São Paulo"
            value={formValues.city}
            onValueChange={(value) => updateField("city", value)}
            required
          />
          <Field
            icon={<MapPin className="h-4 w-4" />}
            label="Bairro"
            name="neighborhood"
            placeholder="Bairro"
            value={formValues.neighborhood}
            onValueChange={(value) => updateField("neighborhood", value)}
            required
          />
          <Field
            icon={<MapPin className="h-4 w-4" />}
            label="Endereço"
            name="address"
            placeholder="Rua, número"
            value={formValues.address}
            onValueChange={(value) => updateField("address", value)}
            required
          />
          <div className="rounded-3xl bg-muted p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-black">Prévia do endereço</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Confirme o endereço para fixar o estabelecimento no ponto certo do mapa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void verifyAddress()}
                disabled={checkingAddress}
                className="shrink-0 rounded-full bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60"
              >
                {checkingAddress ? "Buscando..." : "Verificar"}
              </button>
            </div>
            {coordinates ? (
              <div className="mt-3 overflow-hidden rounded-2xl border border-border">
                <RealMap
                  center={coordinates}
                  markers={[
                    {
                      id: "venue-address-preview",
                      label: formValues.venueName || "Seu local",
                      latitude: coordinates.latitude,
                      longitude: coordinates.longitude,
                      tone: "hot",
                    },
                  ]}
                  zoom={16}
                  className="h-44 w-full"
                />
              </div>
            ) : null}
            {addressResult ? (
              <p className="mt-3 text-xs font-semibold text-foreground">
                Encontrado: {addressResult.label}
              </p>
            ) : null}
            {addressStatus ? (
              <p className="mt-2 text-xs font-semibold text-muted-foreground">{addressStatus}</p>
            ) : null}
          </div>
          <TextAreaField
            icon={<FileText className="h-4 w-4" />}
            label="Descrição curta"
            name="description"
            placeholder="Ex: Bar com música ao vivo, drinks autorais e pista para eventos."
            maxLength={180}
            value={formValues.description}
            onValueChange={(value) => updateField("description", value)}
          />

          {error ? <p className="text-sm font-medium text-primary">{error}</p> : null}
          {status === "saved" ? (
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Estabelecimento salvo. Abrindo painel...
            </p>
          ) : null}

          <PillButton
            type="submit"
            size="lg"
            className="w-full"
            disabled={status === "saving" || isPending}
          >
            {status === "saving" ? savingMessage || "Salvando..." : "Finalizar cadastro"}
          </PillButton>
        </form>
      </div>
    </main>
  );
}

function Field({
  icon,
  label,
  name,
  placeholder,
  inputMode,
  maxLength,
  onFormat,
  value,
  onValueChange,
  required,
}: {
  icon: ReactNode;
  label: string;
  name: string;
  placeholder: string;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  onFormat?: (value: string) => string;
  value: string;
  onValueChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <span className="mt-1.5 flex h-12 items-center gap-2 rounded-2xl border border-border px-3">
        <span className="text-muted-foreground">{icon}</span>
        <input
          name={name}
          placeholder={placeholder}
          inputMode={inputMode}
          maxLength={maxLength}
          value={value}
          required={required}
          onChange={(event) => {
            const nextValue = onFormat
              ? onFormat(event.currentTarget.value)
              : event.currentTarget.value;
            onValueChange(nextValue);
          }}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </span>
    </label>
  );
}

function SelectField({
  icon,
  label,
  name,
  placeholder,
  options,
  value,
  onValueChange,
  required,
}: {
  icon: ReactNode;
  label: string;
  name: string;
  placeholder: string;
  options: string[];
  value: string;
  onValueChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <span className="mt-1.5 flex h-12 items-center gap-2 rounded-2xl border border-border px-3">
        <span className="text-muted-foreground">{icon}</span>
        <Select name={name} value={value} onValueChange={onValueChange} required={required}>
          <SelectTrigger className="h-auto min-w-0 flex-1 border-0 bg-transparent p-0 text-sm shadow-none ring-offset-transparent focus:ring-0 [&>svg]:hidden">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent
            position="popper"
            align="start"
            sideOffset={12}
            className="w-[min(19rem,calc(100vw-3rem))] rounded-3xl border-border bg-background p-2 shadow-2xl"
          >
            {options.map((option) => (
              <SelectItem
                key={option}
                value={option}
                className="min-h-11 cursor-pointer rounded-2xl px-4 py-3 text-sm font-medium focus:bg-muted data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground [&>span:first-child]:right-4"
              >
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </span>
    </label>
  );
}

function TextAreaField({
  icon,
  label,
  name,
  placeholder,
  maxLength,
  value,
  onValueChange,
}: {
  icon: ReactNode;
  label: string;
  name: string;
  placeholder: string;
  maxLength?: number;
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <span className="mt-1.5 flex min-h-24 items-start gap-2 rounded-2xl border border-border px-3 py-3">
        <span className="pt-0.5 text-muted-foreground">{icon}</span>
        <textarea
          name={name}
          placeholder={placeholder}
          maxLength={maxLength}
          value={value}
          onChange={(event) => onValueChange(event.currentTarget.value)}
          className="min-h-16 min-w-0 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </span>
    </label>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ChevronDown,
  Flame,
  LocateFixed,
  Navigation,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { authClient } from "@/auth";
import { ExplorerPreferencesForm } from "@/components/explorer-preferences-form";
import { FeedActionNav } from "@/components/feed-action-nav";
import { RealMap, type RealMapMarker } from "@/components/real-map";
import { reverseLocationLabel, searchLocation, type VenueSummary } from "@/lib/data";
import { venuesQuery } from "@/lib/queries";
import { Skeleton } from "@/components/ui/skeleton";
import {
  canRestoreLocation,
  clampRadiusKm,
  type Coordinates,
  distanceKm,
  formatDistance,
  MAX_RADIUS_KM,
  MIN_RADIUS_KM,
  readSavedLocation,
  readSavedRadiusKm,
  requestCurrentLocation,
  saveCurrentLocation,
  saveLocationConsent,
  saveRadiusKm,
} from "@/lib/location";
import {
  DEFAULT_EXPLORER_PREFERENCES,
  type ExplorerPreferences,
  type ExplorerPreferenceOptions,
  getExplorerPreferences,
  summarizeExplorerPreferences,
  updateExplorerPreferences,
} from "@/lib/profile-actions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/map")({
  loader: ({ context }) => context.queryClient.ensureQueryData(venuesQuery()),
  pendingComponent: MapPending,
  component: MapView,
});

const RADIUS_PRESETS = [1, 3, 5, 10, 25];

function MapPending() {
  return (
    <main className="app-shell flex flex-col bg-background">
      <div className="space-y-4 px-5 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <Skeleton className="h-11 w-full rounded-full" />
        <Skeleton className="h-[60dvh] w-full rounded-2xl" />
      </div>
    </main>
  );
}

function MapView() {
  const venues = Route.useLoaderData();
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;
  const findLocation = useServerFn(searchLocation);
  const reverseLocation = useServerFn(reverseLocationLabel);
  const loadExplorerPreferences = useServerFn(getExplorerPreferences);
  const saveExplorerPreferences = useServerFn(updateExplorerPreferences);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [locationLabel, setLocationLabel] = useState("São Paulo, Brasil");
  const [locationInput, setLocationInput] = useState("");
  const [activeVenueSearch, setActiveVenueSearch] = useState("");
  const [radiusKm, setRadiusKm] = useState(() => readSavedRadiusKm());
  const [savedRadiusKm, setSavedRadiusKm] = useState(() => readSavedRadiusKm());
  const [locating, setLocating] = useState(false);
  const [routingVenueId, setRoutingVenueId] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<RoutePath | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [preferences, setPreferences] = useState<ExplorerPreferences>(DEFAULT_EXPLORER_PREFERENCES);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [preferencesSaving, setPreferencesSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function restoreAllowedLocation() {
      const savedLocation = readSavedLocation();
      if (savedLocation) {
        setLocation({ latitude: savedLocation.latitude, longitude: savedLocation.longitude });
        setLocationLabel(savedLocation.label ?? "Perto de você");
      }

      const canRequestLocation = await canRestoreLocation();
      if (!canRequestLocation || cancelled) return;

      setLocating(true);
      try {
        const current = await requestCurrentLocation();
        if (cancelled) return;

        const label = await reverseLocation({ data: current });
        if (cancelled) return;

        setLocation(current);
        setLocationLabel(label ?? savedLocation?.label ?? "Perto de você");
        saveLocationConsent();
        saveCurrentLocation(current, label ?? savedLocation?.label);
        setMessage("Sua localização foi carregada automaticamente.");
      } catch {
        if (!cancelled) setMessage(null);
      } finally {
        if (!cancelled) setLocating(false);
      }
    }

    void restoreAllowedLocation();

    return () => {
      cancelled = true;
    };
  }, [reverseLocation]);

  useEffect(() => {
    let cancelled = false;

    async function loadPreferences() {
      if (!userId) {
        setPreferences(DEFAULT_EXPLORER_PREFERENCES);
        return;
      }

      try {
        const nextPreferences = await loadExplorerPreferences({ data: { userId } });
        if (!cancelled) setPreferences(nextPreferences);
      } catch {
        if (!cancelled) setPreferences(DEFAULT_EXPLORER_PREFERENCES);
      }
    }

    void loadPreferences();

    return () => {
      cancelled = true;
    };
  }, [loadExplorerPreferences, userId]);

  const rankedVenues = useMemo(() => {
    const term = normalizeMapSearch(activeVenueSearch);
    return venues
      .map((venue) => enrichVenueDistance(venue, location))
      .filter((venue) => !location || venue.distanceKm == null || venue.distanceKm <= radiusKm)
      .filter((venue) => !term || venueMatchesSearch(venue, term))
      .sort((a, b) => {
        const byPreference = preferenceScore(b, preferences) - preferenceScore(a, preferences);
        if (byPreference !== 0) return byPreference;
        if (!location) return movementScore(b) - movementScore(a);
        const byDistance =
          (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY);
        if (Math.abs(byDistance) > 0.2) return byDistance;
        return movementScore(b) - movementScore(a);
      });
  }, [activeVenueSearch, location, preferences, radiusKm, venues]);
  const preferenceOptions = useMemo(() => buildPreferenceOptions(rankedVenues), [rankedVenues]);
  const preferenceOptionsContext = location
    ? `${radiusKm} km de ${locationLabel}`
    : activeVenueSearch
      ? `locais filtrados por “${activeVenueSearch}”`
      : "os locais cadastrados no mapa";
  const hotVenues = rankedVenues.filter((venue) => movementLevel(venue) !== "calm");
  const mapCenter = mapCenterCoordinates(location, rankedVenues);
  const mapMarkers = useMemo(
    () => buildMapMarkers(location, rankedVenues.slice(0, 20)),
    [location, rankedVenues],
  );

  async function handleCurrentLocation() {
    setLocating(true);
    try {
      const current = await requestCurrentLocation();
      saveLocationConsent();
      setLocation(current);
      setSelectedRoute(null);
      const label = await reverseLocation({ data: current });
      setLocationLabel(label ?? "Perto de você");
      saveCurrentLocation(current, label ?? "Perto de você");
      setMessage("Mapa ordenado por locais próximos.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Não foi possível localizar você.");
    } finally {
      setLocating(false);
    }
  }

  async function handleMapSearch() {
    const query = locationInput.trim();
    if (!query) {
      setActiveVenueSearch("");
      return;
    }

    const term = normalizeMapSearch(query);
    const hasVenueMatch = venues.some((venue) => venueMatchesSearch(venue, term));
    if (hasVenueMatch) {
      setActiveVenueSearch(query);
      setSelectedRoute(null);
      setMessage("Locais filtrados no mapa.");
      return;
    }

    setLocating(true);
    try {
      const result = await findLocation({ data: { query } });
      if (!result) {
        setMessage("Não encontrei essa região. Tente bairro, cidade ou endereço.");
        return;
      }

      setLocation({ latitude: result.latitude, longitude: result.longitude });
      setSelectedRoute(null);
      setActiveVenueSearch("");
      setLocationLabel(result.label);
      saveCurrentLocation({ latitude: result.latitude, longitude: result.longitude }, result.label);
      setMessage("Região definida no mapa.");
    } catch {
      setMessage("Não foi possível buscar essa região agora.");
    } finally {
      setLocating(false);
    }
  }

  async function handleVenueRoute(venue: VenueWithDistance) {
    if (venue.latitude == null || venue.longitude == null) return;

    if (selectedRoute?.venueId === venue.id) {
      setSelectedRoute(null);
      setMessage("Rota removida do mapa.");
      return;
    }

    setRoutingVenueId(venue.id);
    try {
      let origin = location;
      if (!origin) {
        origin = await requestCurrentLocation();
        saveLocationConsent();
        setLocation(origin);
        const label = await reverseLocation({ data: origin });
        setLocationLabel(label ?? "Perto de você");
        saveCurrentLocation(origin, label ?? "Perto de você");
      }

      const destination = { latitude: venue.latitude, longitude: venue.longitude };
      const points = await fetchRoutePath(origin, destination);
      setSelectedRoute({ venueId: venue.id, points });
      setMessage(`Rota até ${venue.name} criada no mapa.`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Não foi possível criar a rota agora.");
    } finally {
      setRoutingVenueId(null);
    }
  }

  function handleSaveRadius() {
    const nextRadius = clampRadiusKm(radiusKm);
    saveRadiusKm(nextRadius);
    setRadiusKm(nextRadius);
    setSavedRadiusKm(nextRadius);
    setMessage(`Filtro salvo: ${nextRadius} km. O Explorar vai usar esse raio.`);
  }

  async function handleSavePreferences(nextPreferences: ExplorerPreferences) {
    if (!userId) {
      setPreferences(nextPreferences);
      setRadiusKm(clampRadius(nextPreferences.maxDistanceKm));
      setMessage("Entre na sua conta para salvar seu rolê ideal.");
      return;
    }

    setPreferencesSaving(true);
    try {
      const savedPreferences = await saveExplorerPreferences({
        data: { userId, preferences: nextPreferences },
      });
      const nextRadius = clampRadius(savedPreferences.maxDistanceKm);
      setPreferences(savedPreferences);
      setRadiusKm(nextRadius);
      saveRadiusKm(nextRadius);
      setSavedRadiusKm(nextRadius);
      setPreferencesOpen(false);
      setMessage("Preferências aplicadas no mapa.");
    } catch (cause) {
      setMessage(
        cause instanceof Error ? cause.message : "Não foi possível salvar seu rolê ideal.",
      );
    } finally {
      setPreferencesSaving(false);
    }
  }

  return (
    <main className="app-shell bg-background pb-32">
      <header className="px-6 pt-8">
        <p className="text-xs font-semibold uppercase text-primary">Ao vivo agora</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight">Mapa de movimento</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Veja onde tem evento, check-ins e locais próximos de {locationLabel}.
        </p>
      </header>

      <section className="mt-5 px-6">
        <div className="rounded-3xl border border-border p-3">
          <div className="flex gap-2">
            <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full bg-muted px-4">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                value={locationInput}
                onChange={(event) => {
                  setLocationInput(event.target.value);
                  if (!event.target.value.trim()) setActiveVenueSearch("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleMapSearch();
                }}
                placeholder="Buscar endereço, categoria ou local"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleMapSearch()}
              disabled={locating}
              className="rounded-full bg-muted px-4 text-xs font-bold text-foreground disabled:opacity-60"
            >
              Buscar
            </button>
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((current) => !current)}
            className="mt-3 flex w-full items-center justify-between gap-3 rounded-2xl bg-muted px-3 py-2 text-left"
            aria-expanded={filtersOpen}
          >
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                Filtros
              </p>
              <p className="truncate text-xs font-semibold text-foreground">
                {radiusKm} km · {location ? locationLabel : "Escolha sua localização"}
              </p>
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                filtersOpen ? "rotate-180" : "rotate-0",
              )}
            />
          </button>

          <div
            className={cn(
              "grid transition-all duration-300 ease-out",
              filtersOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
            )}
          >
            <div className="overflow-hidden">
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleCurrentLocation()}
                  disabled={locating}
                  className="flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-3 text-xs font-bold text-white disabled:opacity-60"
                >
                  <LocateFixed className="h-3.5 w-3.5" />
                  {locating ? "Localizando..." : "Usar minha localização"}
                </button>
              </div>
              <div className="mt-3 rounded-2xl bg-muted p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                      Raio de distância
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {location
                        ? "Locais até o limite escolhido"
                        : "Ative ou busque uma localização"}
                    </p>
                  </div>
                  <div className="flex h-10 items-center rounded-full bg-background px-3 text-sm font-black">
                    {radiusKm} km
                  </div>
                </div>

                <input
                  type="range"
                  min={MIN_RADIUS_KM}
                  max={MAX_RADIUS_KM}
                  step={1}
                  value={radiusKm}
                  onChange={(event) => setRadiusKm(clampRadius(event.target.valueAsNumber))}
                  className="mt-3 w-full accent-primary"
                  aria-label="Escolher raio em quilômetros"
                />

                <div className="mt-2 flex flex-wrap gap-2">
                  {RADIUS_PRESETS.map((radius) => (
                    <button
                      key={radius}
                      type="button"
                      onClick={() => setRadiusKm(radius)}
                      className={cn(
                        "h-8 rounded-full px-3 text-xs font-bold transition",
                        radiusKm === radius
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground",
                      )}
                    >
                      {radius} km
                    </button>
                  ))}
                  <label className="flex h-8 items-center gap-1 rounded-full bg-background px-3 text-xs font-bold text-muted-foreground">
                    Livre
                    <input
                      type="number"
                      min={MIN_RADIUS_KM}
                      max={MAX_RADIUS_KM}
                      value={radiusKm}
                      onChange={(event) => setRadiusKm(clampRadius(event.target.valueAsNumber))}
                      className="w-12 bg-transparent text-center text-foreground outline-none"
                      aria-label="Raio livre em quilômetros"
                    />
                    km
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleSaveRadius}
                  disabled={savedRadiusKm === radiusKm}
                  className="mt-3 h-9 w-full rounded-full bg-foreground px-4 text-xs font-black text-background disabled:bg-background disabled:text-muted-foreground"
                >
                  {savedRadiusKm === radiusKm ? "Filtro salvo" : "Salvar filtro para Explorar"}
                </button>
              </div>

              <div className="mt-3 rounded-2xl border border-border bg-background p-3">
                <button
                  type="button"
                  onClick={() => setPreferencesOpen((current) => !current)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                  aria-expanded={preferencesOpen}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <SlidersHorizontal className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-black">Meu rolê ideal</span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {summarizeExplorerPreferences(preferences)}
                      </span>
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                      preferencesOpen ? "rotate-180" : "rotate-0",
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "grid transition-all duration-300 ease-out",
                    preferencesOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="mt-4 max-h-[55vh] touch-pan-y overflow-y-auto overscroll-contain border-t border-border pt-4">
                      <ExplorerPreferencesForm
                        value={preferences}
                        options={preferenceOptions}
                        optionsContext={preferenceOptionsContext}
                        onSubmit={handleSavePreferences}
                        submitting={preferencesSaving}
                        submitLabel="Aplicar no mapa"
                        compact
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {message ? (
            <p className="mt-3 text-xs font-semibold text-muted-foreground">{message}</p>
          ) : null}
        </div>
      </section>

      <section className="mt-6 px-6">
        <div className="relative isolate h-80 overflow-hidden rounded-[2rem] bg-muted text-white shadow-[0_18px_45px_-30px_rgba(0,0,0,0.8)]">
          <RealMap
            center={mapCenter}
            markers={mapMarkers}
            route={selectedRoute?.points}
            zoom={radiusKm <= 1 ? 15 : radiusKm <= 3 ? 14 : 13}
            className="h-full w-full"
            onMarkerClick={(venueId) => navigate({ to: "/venues/$venueId", params: { venueId } })}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/35" />
          <div className="absolute left-5 top-5 rounded-full bg-black/55 px-3 py-2 text-xs font-bold backdrop-blur">
            {hotVenues.length} pontos quentes
          </div>
          {rankedVenues.length === 0 ? (
            <div className="relative z-10 flex h-full items-center justify-center text-center">
              <div className="max-w-56">
                <Navigation className="mx-auto h-8 w-8 text-primary" />
                <p className="mt-3 text-sm font-semibold">
                  Nenhum local com coordenadas dentro do raio selecionado.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-3 rounded-3xl bg-muted p-4">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-primary" />
            <p className="text-sm font-black">Rolê agora</p>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            No mapa, verde indica tranquilo, amarelo indica bom movimento e rosa indica bombando. A
            intensidade combina distância real, eventos agora, check-ins e favoritos.
          </p>
        </div>
      </section>

      <section className="mt-6 space-y-3 px-6">
        {rankedVenues.length === 0 ? (
          <div className="rounded-3xl border border-border p-6 text-center">
            <p className="font-bold">Nenhum estabelecimento próximo</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Aumente o raio ou busque outra região para encontrar mais locais.
            </p>
          </div>
        ) : (
          rankedVenues.map((venue) => (
            <div
              key={venue.id}
              className="flex w-full items-center gap-3 rounded-2xl bg-muted p-3 text-left"
            >
              <img
                src={venue.image}
                alt={venue.name}
                className="h-16 w-16 rounded-2xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{venue.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {venue.address ?? venue.neighborhood}
                </p>
                <p className={cn("mt-1 text-xs font-black", movementTextClass(venue))}>
                  {venueStatusText(venue)}
                </p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  {formatDistance(venue.distanceKm) ?? "Distância indisponível"}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                <button
                  type="button"
                  onClick={() =>
                    navigate({ to: "/venues/$venueId", params: { venueId: venue.id } })
                  }
                  className="rounded-full bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                >
                  Abrir
                </button>
                {venue.latitude != null && venue.longitude != null ? (
                  <button
                    type="button"
                    onClick={() => void handleVenueRoute(venue)}
                    disabled={routingVenueId === venue.id}
                    className={cn(
                      "flex items-center justify-center gap-1 rounded-full px-3 py-2 text-xs font-bold disabled:opacity-60",
                      selectedRoute?.venueId === venue.id
                        ? "bg-primary text-white"
                        : "bg-background text-foreground",
                    )}
                  >
                    <Navigation className="h-3 w-3" />
                    {routingVenueId === venue.id ? "..." : "Rota"}
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </section>

      <FeedActionNav />
    </main>
  );
}

type VenueWithDistance = VenueSummary & { distanceKm?: number };

type RoutePath = {
  venueId: string;
  points: Coordinates[];
};

function enrichVenueDistance(venue: VenueSummary, location: Coordinates | null): VenueWithDistance {
  if (!location || venue.latitude == null || venue.longitude == null) return venue;

  return {
    ...venue,
    distanceKm: distanceKm(location, {
      latitude: venue.latitude,
      longitude: venue.longitude,
    }),
  };
}

function mapCenterCoordinates(
  location: Coordinates | null,
  venues: VenueWithDistance[],
): Coordinates {
  if (location) return location;

  const firstVenueWithCoordinates = venues.find(
    (venue) => venue.latitude != null && venue.longitude != null,
  );
  if (firstVenueWithCoordinates?.latitude != null && firstVenueWithCoordinates.longitude != null) {
    return {
      latitude: firstVenueWithCoordinates.latitude,
      longitude: firstVenueWithCoordinates.longitude,
    };
  }

  return { latitude: -23.55052, longitude: -46.63331 };
}

function buildMapMarkers(
  location: Coordinates | null,
  venues: VenueWithDistance[],
): RealMapMarker[] {
  const venueMarkers = venues
    .filter((venue) => venue.latitude != null && venue.longitude != null)
    .map((venue) => ({
      id: venue.id,
      label: venue.name,
      sublabel: formatDistance(venue.distanceKm),
      latitude: Number(venue.latitude),
      longitude: Number(venue.longitude),
      tone: movementLevel(venue),
    }));

  if (!location) return venueMarkers;

  return [
    {
      id: "current-location",
      label: "Você",
      latitude: location.latitude,
      longitude: location.longitude,
      tone: "user",
    },
    ...venueMarkers,
  ];
}

function clampRadius(value: number) {
  return clampRadiusKm(value);
}

function normalizeMapSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function venueMatchesSearch(venue: VenueSummary, term: string) {
  if (!term) return true;
  return [
    venue.name,
    venue.category,
    venue.neighborhood,
    venue.city,
    venue.address,
    venue.description,
  ].some((value) => normalizeMapSearch(value ?? "").includes(term));
}

function buildPreferenceOptions(venues: VenueSummary[]): ExplorerPreferenceOptions {
  return {
    neighborhoods: uniqueVenueValues(venues.map((venue) => venue.neighborhood)).slice(0, 24),
    categories: uniqueVenueValues(venues.map((venue) => venue.category)).slice(0, 24),
  };
}

function uniqueVenueValues(values: Array<string | undefined>) {
  return values
    .map((value) => value?.trim() ?? "")
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function preferenceScore(venue: VenueSummary, preferences: ExplorerPreferences) {
  let score = 0;
  const neighborhood = normalizeMapSearch(venue.neighborhood ?? "");
  const category = normalizeMapSearch(venue.category ?? "");
  const haystack = normalizeMapSearch(
    [venue.name, venue.category, venue.neighborhood, venue.description].filter(Boolean).join(" "),
  );

  if (preferences.neighborhoods.some((item) => neighborhood.includes(normalizeMapSearch(item)))) {
    score += 5;
  }

  if (preferences.categories.some((item) => category.includes(normalizeMapSearch(item)))) {
    score += 4;
  }

  for (const mood of preferences.moods) {
    if (mood === "live" && venue.liveEvents > 0) score += 4;
    if (mood === "crowded" && movementLevel(venue) !== "calm") score += 3;
    if (mood === "calm" && movementLevel(venue) === "calm") score += 2;
    if (mood === "date" && /gastronomia|bar|wine|jantar|drink|happy/.test(haystack)) score += 2;
    if (mood === "group" && (venue.checkins >= 2 || venue.liveEvents > 0)) score += 2;
  }

  return score;
}

async function fetchRoutePath(origin: Coordinates, destination: Coordinates) {
  const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
  const response = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`,
  );

  if (!response.ok) throw new Error("Não foi possível calcular a rota agora.");

  const data = (await response.json()) as OsrmRouteResponse;
  const routeCoordinates = data.routes?.[0]?.geometry?.coordinates;
  if (!routeCoordinates?.length) throw new Error("Não encontrei uma rota para esse local.");

  return routeCoordinates.map(([longitude, latitude]) => ({ latitude, longitude }));
}

type OsrmRouteResponse = {
  routes?: Array<{
    geometry?: {
      coordinates?: Array<[number, number]>;
    };
  }>;
};

function movementScore(venue: VenueSummary) {
  return venue.liveEvents * 3 + venue.checkins * 2 + (venue.favoriteCount ?? 0);
}

function movementLevel(venue: VenueSummary): "calm" | "warm" | "hot" {
  const score = movementScore(venue);
  if (score >= 8) return "hot";
  if (score >= 3) return "warm";
  return "calm";
}

function movementLabel(venue: VenueSummary) {
  const level = movementLevel(venue);
  if (level === "hot") return "Bombando agora";
  if (level === "warm") return "Movimento bom";
  return "Movimento leve";
}

function venueStatusText(venue: VenueSummary) {
  return [
    movementLabel(venue),
    venue.liveEvents > 0 ? "Ao vivo agora" : null,
    `${venue.checkins} check-ins`,
  ]
    .filter(Boolean)
    .join(" · ");
}

function movementBgClass(venue: VenueSummary) {
  const level = movementLevel(venue);
  if (level === "hot") return "bg-primary";
  if (level === "warm") return "bg-amber-400";
  return "bg-emerald-500";
}

function movementTextClass(venue: VenueSummary) {
  const level = movementLevel(venue);
  if (level === "hot") return "text-primary";
  if (level === "warm") return "text-amber-600";
  return "text-emerald-600";
}

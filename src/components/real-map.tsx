import { useEffect, useRef } from "react";
import type { Coordinates } from "@/lib/location";

export type RealMapMarker = {
  id: string;
  label: string;
  sublabel?: string;
  latitude: number;
  longitude: number;
  tone?: "user" | "calm" | "warm" | "hot";
};

type RealMapProps = {
  center: Coordinates;
  markers: RealMapMarker[];
  route?: Coordinates[];
  zoom?: number;
  className?: string;
  onMarkerClick?: (id: string) => void;
};

export function RealMap({
  center,
  markers,
  route = [],
  zoom = 14,
  className,
  onMarkerClick,
}: RealMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const routeLayerRef = useRef<import("leaflet").LayerGroup | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function setupMap() {
      if (!containerRef.current || mapRef.current) return;

      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView([center.latitude, center.longitude], zoom);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      markerLayerRef.current = L.layerGroup().addTo(map);
      routeLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
    }

    void setupMap();

    return () => {
      cancelled = true;
    };
  }, [center.latitude, center.longitude, zoom]);

  useEffect(() => {
    let cancelled = false;

    async function renderMarkers() {
      const map = mapRef.current;
      const markerLayer = markerLayerRef.current;
      const routeLayer = routeLayerRef.current;
      if (!map || !markerLayer || !routeLayer) return;

      const L = await import("leaflet");
      if (cancelled) return;

      markerLayer.clearLayers();
      routeLayer.clearLayers();

      const bounds: import("leaflet").LatLngExpression[] = [];

      if (route.length > 1) {
        const routePositions = route.map(
          (point) => [point.latitude, point.longitude] as [number, number],
        );
        bounds.push(...routePositions);
        L.polyline(routePositions, {
          color: "#ff4d00",
          opacity: 0.92,
          weight: 5,
        }).addTo(routeLayer);
      }

      markers.forEach((marker) => {
        const position: import("leaflet").LatLngExpression = [marker.latitude, marker.longitude];
        bounds.push(position);

        const leafletMarker = L.marker(position, {
          icon: L.divIcon({
            className: "chegaai-map-marker",
            html: markerHtml(marker),
            iconAnchor: [18, 18],
          }),
        });

        if (onMarkerClick && marker.tone !== "user") {
          leafletMarker.on("click", () => onMarkerClick(marker.id));
        }

        leafletMarker.addTo(markerLayer);
      });

      if (bounds.length > 1) {
        map.fitBounds(L.latLngBounds(bounds), { padding: [34, 34], maxZoom: zoom });
        return;
      }

      map.setView([center.latitude, center.longitude], zoom);
    }

    void renderMarkers();

    return () => {
      cancelled = true;
    };
  }, [center.latitude, center.longitude, markers, onMarkerClick, route, zoom]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      routeLayerRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className={className} />;
}

function markerHtml(marker: RealMapMarker) {
  const sublabel = marker.sublabel
    ? `<span class="chegaai-map-sublabel">${escapeHtml(marker.sublabel)}</span>`
    : "";

  return `<span class="chegaai-map-pin chegaai-map-pin-${marker.tone ?? "calm"}"></span><span class="chegaai-map-label"><span class="chegaai-map-title">${escapeHtml(marker.label)}</span>${sublabel}</span>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

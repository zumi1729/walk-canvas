import L from "leaflet";
import type { PhotoNote, WalkSession } from "../db/types";
import { getRoutePoints } from "../history/history";
import { getSessionMode, getTravelModeConfig } from "../travelMode";

const DEFAULT_CENTER: L.LatLngExpression = [34.1785, 131.4737];

let historyMap: L.Map | undefined;
let historyLayers: L.LayerGroup | undefined;
let photoUrls: string[] = [];

export function renderHistoryMap(elementId: string, session: WalkSession, notes: PhotoNote[]): void {
  if (!historyMap) {
    historyMap = L.map(elementId, {
      zoomControl: false,
      preferCanvas: true,
      attributionControl: true,
    }).setView(DEFAULT_CENTER, 15);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(historyMap);
    L.control.zoom({ position: "topright" }).addTo(historyMap);
  }

  clearHistoryMap();
  historyLayers = L.layerGroup().addTo(historyMap);
  const routePoints = getRoutePoints(session);
  const routeLatLngs = routePoints.map((point) => L.latLng(point.lat, point.lng));
  const boundsPoints: L.LatLng[] = [...routeLatLngs];

  if (routeLatLngs.length > 1) {
    const modeColor = getTravelModeConfig(getSessionMode(session.mode)).color;
    L.polyline(routeLatLngs, {
      color: modeColor,
      weight: 6,
      opacity: 0.9,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(historyLayers);
  }

  const firstPoint = routeLatLngs.at(0);
  const lastPoint = routeLatLngs.at(-1);
  if (firstPoint) addEndpoint(firstPoint, "start", "出発", historyLayers);
  if (lastPoint && routeLatLngs.length > 1) addEndpoint(lastPoint, "end", "到着", historyLayers);

  for (const note of notes) {
    const thumbnailUrl = URL.createObjectURL(note.thumbnailBlob);
    photoUrls.push(thumbnailUrl);
    const icon = L.divIcon({
      className: "history-photo-marker",
      html: `<img src="${thumbnailUrl}" alt="" />`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
    L.marker([note.lat, note.lng], { icon, interactive: false }).addTo(historyLayers);
    boundsPoints.push(L.latLng(note.lat, note.lng));
  }

  window.setTimeout(() => {
    historyMap?.invalidateSize();
    if (boundsPoints.length === 0) {
      historyMap?.setView(DEFAULT_CENTER, 15);
    } else if (boundsPoints.length === 1) {
      historyMap?.setView(boundsPoints[0], 17);
    } else {
      historyMap?.fitBounds(L.latLngBounds(boundsPoints), { padding: [28, 28], maxZoom: 17 });
    }
  }, 0);
}

export function clearHistoryMap(): void {
  historyLayers?.clearLayers();
  historyLayers?.remove();
  historyLayers = undefined;
  for (const url of photoUrls) URL.revokeObjectURL(url);
  photoUrls = [];
}

function addEndpoint(
  latLng: L.LatLng,
  kind: "start" | "end",
  label: string,
  layer: L.LayerGroup,
): void {
  const icon = L.divIcon({
    className: `history-endpoint history-endpoint-${kind}`,
    html: `<span>${kind === "start" ? "S" : "G"}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
  L.marker(latLng, { icon, title: label, interactive: false }).addTo(layer);
}

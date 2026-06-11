import L from "leaflet";
import type { WalkPoint } from "../db/types";

const DEFAULT_CENTER: L.LatLngExpression = [34.1785, 131.4737];

let currentPositionMarker: L.CircleMarker | undefined;
let accuracyCircle: L.Circle | undefined;

export function initMap(elementId: string): L.Map {
  const map = L.map(elementId, {
    zoomControl: false,
    preferCanvas: true,
  }).setView(DEFAULT_CENTER, 15);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  L.control.zoom({ position: "topright" }).addTo(map);
  return map;
}

export function updateCurrentPosition(map: L.Map, point: WalkPoint): void {
  const latLng = L.latLng(point.lat, point.lng);

  if (currentPositionMarker) {
    currentPositionMarker.setLatLng(latLng);
  } else {
    currentPositionMarker = L.circleMarker(latLng, {
      radius: 8,
      color: "#ffffff",
      weight: 3,
      fillColor: "#2563eb",
      fillOpacity: 1,
      pane: "markerPane",
    }).addTo(map);
  }

  if (accuracyCircle) {
    accuracyCircle.setLatLng(latLng).setRadius(point.accuracy);
  } else {
    accuracyCircle = L.circle(latLng, {
      radius: point.accuracy,
      color: "#2563eb",
      weight: 1,
      opacity: 0.45,
      fillColor: "#60a5fa",
      fillOpacity: 0.12,
      interactive: false,
    }).addTo(map);
  }

  currentPositionMarker.bringToFront();
}

export function moveToPoint(map: L.Map, point: WalkPoint, zoom = 17): void {
  map.flyTo([point.lat, point.lng], Math.max(map.getZoom(), zoom), {
    duration: 0.7,
  });
}

import L from "leaflet";
import type { PhotoNote } from "../db/types";

type PhotoMarkerEntry = {
  marker: L.Marker;
  thumbnailUrl: string;
};

const photoMarkers = new Map<string, PhotoMarkerEntry>();

export function renderPhotoMarkers(
  map: L.Map,
  notes: PhotoNote[],
  onClick: (note: PhotoNote) => void,
): void {
  clearPhotoMarkers();
  for (const note of notes) {
    addPhotoMarker(map, note, onClick);
  }
}

export function addPhotoMarker(
  map: L.Map,
  note: PhotoNote,
  onClick: (note: PhotoNote) => void,
): void {
  removePhotoMarker(note.id);

  const thumbnailUrl = URL.createObjectURL(note.thumbnailBlob);
  const icon = L.divIcon({
    className: "photo-marker",
    html: `<img src="${thumbnailUrl}" alt="写真メモ" />`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
  const marker = L.marker([note.lat, note.lng], {
    icon,
    keyboard: true,
    title: note.comment || "写真メモ",
    alt: note.comment || "写真メモ",
    riseOnHover: true,
  })
    .addTo(map)
    .on("click", () => onClick(note));

  photoMarkers.set(note.id, { marker, thumbnailUrl });
}

export function removePhotoMarker(id: string): void {
  const entry = photoMarkers.get(id);
  if (!entry) return;

  entry.marker.remove();
  URL.revokeObjectURL(entry.thumbnailUrl);
  photoMarkers.delete(id);
}

export function clearPhotoMarkers(): void {
  for (const id of [...photoMarkers.keys()]) {
    removePhotoMarker(id);
  }
}

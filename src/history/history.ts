import type { PhotoNote, WalkPoint, WalkSession } from "../db/types";

const MAX_ROUTE_ACCURACY_METERS = 35;
const MAX_ROUTE_SPEED_METERS_PER_SECOND = 5;

export function getPhotosForSession(session: WalkSession, notes: PhotoNote[]): PhotoNote[] {
  const start = Date.parse(session.startedAt);
  const end = Date.parse(session.endedAt ?? new Date().toISOString());

  return notes
    .filter((note) => {
      if (note.sessionId) return note.sessionId === session.id;
      const createdAt = Date.parse(note.createdAt);
      return createdAt >= start && createdAt <= end;
    })
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

export function getRoutePoints(session: WalkSession): WalkPoint[] {
  const accepted: WalkPoint[] = [];

  for (const point of session.recordedPoints) {
    if (point.accuracy > MAX_ROUTE_ACCURACY_METERS) continue;
    const previous = accepted.at(-1);
    if (previous && getSpeed(previous, point) > MAX_ROUTE_SPEED_METERS_PER_SECOND) continue;
    accepted.push(point);
  }

  return accepted;
}

export function getSessionDurationMilliseconds(session: WalkSession): number {
  const start = Date.parse(session.startedAt);
  const end = Date.parse(session.endedAt ?? new Date().toISOString());
  return Math.max(0, end - start);
}

export function formatDuration(durationMilliseconds: number): string {
  const totalMinutes = Math.floor(durationMilliseconds / 60_000);
  if (totalMinutes < 1) return "1分未満";
  if (totalMinutes < 60) return `${totalMinutes}分`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}時間` : `${hours}時間${minutes}分`;
}

export function getRouteDistanceMeters(session: WalkSession): number {
  const points = getRoutePoints(session);
  let distance = 0;
  for (let index = 1; index < points.length; index += 1) {
    distance += getDistance(points[index - 1], points[index]);
  }
  return distance;
}

export function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)}m`;
  return `${(distanceMeters / 1000).toFixed(distanceMeters < 10_000 ? 1 : 0)}km`;
}

export function formatSessionDate(session: WalkSession): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(session.startedAt));
}

export function formatSessionTimeRange(session: WalkSession): string {
  const formatter = new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const start = formatter.format(new Date(session.startedAt));
  if (!session.endedAt) return `${start}〜 散歩中`;
  return `${start}〜${formatter.format(new Date(session.endedAt))}`;
}

function getSpeed(from: WalkPoint, to: WalkPoint): number {
  const seconds = (Date.parse(to.timestamp) - Date.parse(from.timestamp)) / 1000;
  if (seconds <= 0) return 0;
  return getDistance(from, to) / seconds;
}

function getDistance(from: WalkPoint, to: WalkPoint): number {
  const earthRadius = 6_371_000;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const deltaLat = ((to.lat - from.lat) * Math.PI) / 180;
  const deltaLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a =
    Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

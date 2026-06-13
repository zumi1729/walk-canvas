import type { TravelMode } from "./db/types";

export const TRAVEL_MODES: TravelMode[] = ["walk", "bicycle", "car"];

type TravelModeConfig = {
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  maxAccuracyMeters: number;
  maxSpeedMetersPerSecond: number;
};

const CONFIG: Record<TravelMode, TravelModeConfig> = {
  walk: {
    label: "散歩",
    shortLabel: "徒歩",
    icon: "🚶",
    color: "#2563eb",
    maxAccuracyMeters: 35,
    maxSpeedMetersPerSecond: 5,
  },
  bicycle: {
    label: "サイクリング",
    shortLabel: "自転車",
    icon: "🚲",
    color: "#16a34a",
    maxAccuracyMeters: 35,
    maxSpeedMetersPerSecond: 20,
  },
  car: {
    label: "ドライブ",
    shortLabel: "車",
    icon: "🚗",
    color: "#ea580c",
    maxAccuracyMeters: 50,
    maxSpeedMetersPerSecond: 60,
  },
};

export function getTravelModeConfig(mode: TravelMode): TravelModeConfig {
  return CONFIG[mode];
}

export function getSessionMode(mode?: TravelMode): TravelMode {
  return mode ?? "walk";
}

export function getCellMode(cell: { mode?: TravelMode; cellId: string }): TravelMode {
  if (cell.mode) return cell.mode;
  if (cell.cellId.startsWith("bicycle:")) return "bicycle";
  if (cell.cellId.startsWith("car:")) return "car";
  return "walk";
}

export function getModeCellId(mode: TravelMode, baseCellId: string): string {
  return mode === "walk" ? baseCellId : `${mode}:${baseCellId}`;
}

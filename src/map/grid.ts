export const DEFAULT_CELL_SIZE_METERS = 25;

const METERS_PER_DEGREE_LAT = 111_320;
const GRID_REFERENCE_LATITUDE = 35;

export type CellCoordinate = {
  cellId: string;
  x: number;
  y: number;
};

export function latLngToCell(
  lat: number,
  lng: number,
  cellSizeMeters = DEFAULT_CELL_SIZE_METERS,
): CellCoordinate {
  // A fixed standard parallel keeps cell IDs stable while moving north/south.
  const metersPerDegreeLng = metersPerDegreeLongitude(GRID_REFERENCE_LATITUDE);
  const x = Math.floor((lng * metersPerDegreeLng) / cellSizeMeters);
  const y = Math.floor((lat * METERS_PER_DEGREE_LAT) / cellSizeMeters);

  return {
    cellId: `${x}_${y}`,
    x,
    y,
  };
}

export function cellToBounds(
  cell: Pick<CellCoordinate, "x" | "y">,
  _referenceLat: number,
  cellSizeMeters = DEFAULT_CELL_SIZE_METERS,
): [[number, number], [number, number]] {
  const metersPerDegreeLng = metersPerDegreeLongitude(GRID_REFERENCE_LATITUDE);
  const lng1 = (cell.x * cellSizeMeters) / metersPerDegreeLng;
  const lat1 = (cell.y * cellSizeMeters) / METERS_PER_DEGREE_LAT;
  const lng2 = ((cell.x + 1) * cellSizeMeters) / metersPerDegreeLng;
  const lat2 = ((cell.y + 1) * cellSizeMeters) / METERS_PER_DEGREE_LAT;

  return [
    [lat1, lng1],
    [lat2, lng2],
  ];
}

export function getCellReferenceLatitude(y: number, cellSizeMeters = DEFAULT_CELL_SIZE_METERS): number {
  return ((y + 0.5) * cellSizeMeters) / METERS_PER_DEGREE_LAT;
}

function metersPerDegreeLongitude(lat: number): number {
  return METERS_PER_DEGREE_LAT * Math.max(Math.cos((lat * Math.PI) / 180), 0.00001);
}

export function getWalkLevel(visitCount: number): 0 | 1 | 2 | 3 | 4 | 5 {
  if (visitCount >= 20) return 5;
  if (visitCount >= 10) return 4;
  if (visitCount >= 5) return 3;
  if (visitCount >= 2) return 2;
  if (visitCount >= 1) return 1;
  return 0;
}

export function getCellStyle(visitCount: number, mode: TravelMode = "walk") {
  const level = getWalkLevel(visitCount);
  const fillColor = getTravelModeConfig(mode).color;
  const fillOpacity = [0, 0.28, 0.38, 0.48, 0.58, 0.7][level];

  return {
    color: fillColor,
    fillColor,
    fillOpacity,
    weight: 0,
  };
}
import type { TravelMode } from "../db/types";
import { getTravelModeConfig } from "../travelMode";

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

export function getCellStyle(visitCount: number) {
  const level = getWalkLevel(visitCount);
  const styles = {
    0: { fillColor: "#000000", fillOpacity: 0 },
    1: { fillColor: "#7dd3fc", fillOpacity: 0.45 },
    2: { fillColor: "#2563eb", fillOpacity: 0.5 },
    3: { fillColor: "#22c55e", fillOpacity: 0.52 },
    4: { fillColor: "#facc15", fillOpacity: 0.55 },
    5: { fillColor: "#f97316", fillOpacity: 0.6 },
  } as const;

  return {
    color: styles[level].fillColor,
    fillColor: styles[level].fillColor,
    fillOpacity: styles[level].fillOpacity,
    weight: 0,
  };
}

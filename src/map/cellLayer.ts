import L from "leaflet";
import type { VisitedCell } from "../db/types";
import { getCellMode } from "../travelMode";
import { cellToBounds, getCellReferenceLatitude, getCellStyle } from "./grid";

const cellRectangles = new Map<string, L.Rectangle>();

export function renderVisitedCells(map: L.Map, cells: VisitedCell[]): void {
  clearVisitedCells(map);
  for (const cell of cells) {
    updateVisitedCell(map, cell);
  }
}

export function updateVisitedCell(map: L.Map, cell: VisitedCell): void {
  const existing = cellRectangles.get(cell.cellId);
  if (existing) {
    existing.setStyle(getCellStyle(cell.visitCount, getCellMode(cell)));
    return;
  }

  const referenceLat = getCellReferenceLatitude(cell.y);
  const rectangle = L.rectangle(cellToBounds(cell, referenceLat), {
    ...getCellStyle(cell.visitCount, getCellMode(cell)),
    interactive: false,
  }).addTo(map);
  cellRectangles.set(cell.cellId, rectangle);
}

export function clearVisitedCells(map?: L.Map): void {
  for (const rectangle of cellRectangles.values()) {
    if (map) {
      rectangle.removeFrom(map);
    } else {
      rectangle.remove();
    }
  }
  cellRectangles.clear();
}

import type { TravelMode } from "../db/types";
import { getTravelModeConfig } from "../travelMode";

export type Controls = {
  trackingButton: HTMLButtonElement;
  cameraButton: HTMLButtonElement;
  locateButton: HTMLButtonElement;
  historyButton: HTMLButtonElement;
  photoLibraryButton: HTMLButtonElement;
  cameraInput: HTMLInputElement;
  status: HTMLElement;
  todayCells: HTMLElement;
  todayPhotos: HTMLElement;
};

export function getControls(): Controls {
  return {
    trackingButton: requireElement("#trackingButton"),
    cameraButton: requireElement("#cameraButton"),
    locateButton: requireElement("#locateButton"),
    historyButton: requireElement("#historyButton"),
    photoLibraryButton: requireElement("#photoLibraryButton"),
    cameraInput: requireElement("#cameraInput"),
    status: requireElement("#trackingStatus"),
    todayCells: requireElement("#todayCells"),
    todayPhotos: requireElement("#todayPhotos"),
  };
}

export function setTrackingUi(controls: Controls, isTracking: boolean, mode: TravelMode = "walk"): void {
  const config = getTravelModeConfig(mode);
  controls.status.textContent = isTracking ? `${config.icon} ${config.shortLabel}中` : "停止中";
  controls.status.classList.toggle("is-active", isTracking);
  controls.trackingButton.classList.toggle("is-stop", isTracking);
  controls.trackingButton.setAttribute("aria-pressed", String(isTracking));
  controls.trackingButton.innerHTML = isTracking
    ? `${stopIcon()}<span>記録停止</span>`
    : `${walkIcon()}<span>記録開始</span>`;
}

export function setControlsBusy(controls: Controls, busy: boolean): void {
  controls.trackingButton.disabled = busy;
  controls.cameraButton.disabled = busy;
  controls.locateButton.disabled = busy;
  controls.historyButton.disabled = busy;
  controls.photoLibraryButton.disabled = busy;
}

export function updateTodayStats(controls: Controls, cells: number, photos: number): void {
  controls.todayCells.textContent = String(cells);
  controls.todayPhotos.textContent = String(photos);
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Required element not found: ${selector}`);
  return element;
}

function walkIcon(): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 5.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM11.2 8.1 8.8 12l-3.1 1.8.9 1.6 3.5-2c.3-.2.5-.4.7-.7l.8-1.3 1 2.1-2 3.2-1.2 4.1 1.9.5 1.1-3.8 2.2-3.4 1.1 2.2c.2.4.5.7.9.8l3.2.9.5-1.8-2.8-.8-2.2-4.6-.1-.2-1-2.1 1.9 1 1.6 2.4 1.6-1.1-1.8-2.8a2 2 0 0 0-.8-.7l-2-1a2 2 0 0 0-2.6.7Z"/></svg>`;
}

function stopIcon(): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`;
}

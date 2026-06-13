import type { TravelMode } from "../db/types";
import { getTravelModeConfig, TRAVEL_MODES } from "../travelMode";

export function showTravelModeModal(initialMode: TravelMode): Promise<TravelMode | null> {
  const dialog = requireElement<HTMLDialogElement>(document, "#travelModeDialog");
  const confirmButton = requireElement<HTMLButtonElement>(dialog, "#travelModeConfirmButton");
  const cancelButton = requireElement<HTMLButtonElement>(dialog, "#travelModeCancelButton");
  const buttons = [...dialog.querySelectorAll<HTMLButtonElement>("[data-travel-mode]")];
  let selectedMode = initialMode;

  const render = () => {
    for (const button of buttons) {
      const isSelected = button.dataset.travelMode === selectedMode;
      button.classList.toggle("is-selected", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
    }
  };

  for (const button of buttons) {
    button.onclick = () => {
      const mode = button.dataset.travelMode as TravelMode;
      if (!TRAVEL_MODES.includes(mode)) return;
      selectedMode = mode;
      render();
    };
  }

  render();
  dialog.showModal();

  return new Promise((resolve) => {
    let result: TravelMode | null = null;
    confirmButton.onclick = () => {
      result = selectedMode;
      dialog.close();
    };
    cancelButton.onclick = () => dialog.close();
    dialog.oncancel = () => dialog.close();
    dialog.onclose = () => resolve(result);
  });
}

export function renderTravelModeOptions(): string {
  return TRAVEL_MODES.map((mode) => {
    const config = getTravelModeConfig(mode);
    return `
      <button class="travel-mode-option" type="button" data-travel-mode="${mode}" aria-pressed="false">
        <span class="travel-mode-icon" aria-hidden="true">${config.icon}</span>
        <strong>${config.label}</strong>
      </button>`;
  }).join("");
}

function requireElement<T extends Element>(parent: ParentNode, selector: string): T {
  const element = parent.querySelector<T>(selector);
  if (!element) throw new Error(`Required element not found: ${selector}`);
  return element;
}

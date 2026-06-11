let hideTimer: number | undefined;

export function showToast(message: string, duration = 3500): void {
  const toast = document.querySelector<HTMLElement>("#toast");
  if (!toast) return;

  window.clearTimeout(hideTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  hideTimer = window.setTimeout(() => toast.classList.remove("is-visible"), duration);
}

export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    const serviceWorkerUrl = `${import.meta.env.BASE_URL}sw.js`;
    void navigator.serviceWorker.register(serviceWorkerUrl).catch((error: unknown) => {
      console.warn("Service Worker registration failed", error);
    });
  });
}

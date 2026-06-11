import type { WalkPoint } from "../db/types";

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 5000,
  timeout: 10000,
};

let watchId: number | null = null;
let lastPosition: WalkPoint | undefined;

export function startTracking(
  onPoint: (point: WalkPoint) => void,
  onError: (message: string) => void,
): void {
  if (!navigator.geolocation) {
    onError("このブラウザでは位置情報が使えません。");
    return;
  }

  stopTracking();
  watchId = navigator.geolocation.watchPosition(
    (position) => {
      const point = toWalkPoint(position);
      lastPosition = point;
      onPoint(point);
    },
    (error) => onError(getGeolocationErrorMessage(error)),
    GEO_OPTIONS,
  );
}

export function stopTracking(): void {
  if (watchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

export function getLastPosition(): WalkPoint | undefined {
  return lastPosition;
}

export function getCurrentPosition(): Promise<WalkPoint> {
  if (!navigator.geolocation) {
    return Promise.reject(new Error("このブラウザでは位置情報が使えません。"));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = toWalkPoint(position);
        lastPosition = point;
        resolve(point);
      },
      (error) => reject(new Error(getGeolocationErrorMessage(error))),
      GEO_OPTIONS,
    );
  });
}

export function getGeolocationErrorMessage(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) {
    return "位置情報が許可されていません。ブラウザ設定から位置情報を許可してください。";
  }
  if (error.code === error.TIMEOUT) {
    return "位置情報の取得がタイムアウトしました。もう一度試してください。";
  }
  return "位置情報を取得できませんでした。電波状況を確認してください。";
}

function toWalkPoint(position: GeolocationPosition): WalkPoint {
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: position.coords.accuracy,
    timestamp: new Date(position.timestamp).toISOString(),
  };
}

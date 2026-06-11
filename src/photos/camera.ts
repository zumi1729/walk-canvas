let activeStream: MediaStream | undefined;

export function openPhotoLibrary(input: HTMLInputElement): void {
  input.value = "";
  input.click();
}

export function getSelectedPhoto(input: HTMLInputElement): File | undefined {
  const file = input.files?.[0];
  if (!file || !file.type.startsWith("image/")) return undefined;
  return file;
}

export async function startCamera(video: HTMLVideoElement): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("このブラウザではアプリ内カメラを使えません。写真ライブラリから選択してください。");
  }

  stopCamera(video);
  activeStream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
  });

  video.srcObject = activeStream;
  video.muted = true;
  video.playsInline = true;
  await waitForVideo(video);
  await video.play();

  if (video.videoWidth === 0 || video.videoHeight === 0) {
    throw new Error("カメラ映像を開始できませんでした。");
  }
}

export function stopCamera(video?: HTMLVideoElement): void {
  for (const track of activeStream?.getTracks() ?? []) track.stop();
  activeStream = undefined;

  if (video) {
    video.pause();
    video.srcObject = null;
  }
}

export async function captureCameraPhoto(video: HTMLVideoElement): Promise<File> {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (width === 0 || height === 0) {
    throw new Error("カメラ映像を取得できませんでした。");
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("写真を作成できませんでした。");
  context.drawImage(video, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("写真を作成できませんでした。"))),
      "image/jpeg",
      0.92,
    );
  });

  return new File([blob], `walk-canvas-${Date.now()}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

function waitForVideo(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("カメラ映像の開始がタイムアウトしました。"));
    }, 10_000);
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("カメラ映像を開始できませんでした。"));
    };
    const cleanup = () => {
      window.clearTimeout(timeoutId);
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("error", onError);
    };

    video.addEventListener("loadedmetadata", onReady, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

export function getCameraErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "カメラが許可されていません。iPhoneの設定でこのサイトのカメラを許可するか、写真ライブラリから選択してください。";
    }
    if (error.name === "NotFoundError" || error.name === "OverconstrainedError") {
      return "利用できるカメラが見つかりません。写真ライブラリから選択してください。";
    }
    if (error.name === "NotReadableError" || error.name === "AbortError") {
      return "カメラを開始できません。他のカメラアプリを閉じて、もう一度試してください。";
    }
  }

  return error instanceof Error ? error.message : "カメラを開始できませんでした。";
}

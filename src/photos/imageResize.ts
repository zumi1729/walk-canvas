type LoadedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  dispose: () => void;
};

export async function resizeImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number,
): Promise<Blob> {
  const image = await loadImage(file);
  try {
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = createCanvas(width, height);
    const context = getCanvasContext(canvas);
    context.drawImage(image.source, 0, 0, width, height);
    return canvasToJpeg(canvas, quality);
  } finally {
    image.dispose();
  }
}

export async function createThumbnail(file: File, size = 128): Promise<Blob> {
  const image = await loadImage(file);
  try {
    const sourceSize = Math.min(image.width, image.height);
    const sourceX = (image.width - sourceSize) / 2;
    const sourceY = (image.height - sourceSize) / 2;
    const canvas = createCanvas(size, size);
    const context = getCanvasContext(canvas);
    context.drawImage(image.source, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
    return canvasToJpeg(canvas, 0.75);
  } finally {
    image.dispose();
  }
}

async function loadImage(file: File): Promise<LoadedImage> {
  try {
    return await loadHtmlImage(file);
  } catch (htmlImageError) {
    if (!("createImageBitmap" in window)) throw htmlImageError;

    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    if (bitmap.width === 0 || bitmap.height === 0) {
      bitmap.close();
      throw new Error("画像を読み込めませんでした。");
    }
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      dispose: () => bitmap.close(),
    };
  }
}

async function loadHtmlImage(file: File): Promise<LoadedImage> {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("画像を読み込めませんでした。"));
      image.src = url;
    });

    if (image.naturalWidth === 0 || image.naturalHeight === 0) {
      throw new Error("画像を読み込めませんでした。");
    }

    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      dispose: () => {
        image.removeAttribute("src");
        URL.revokeObjectURL(url);
      },
    };
  } catch (error) {
    image.removeAttribute("src");
    URL.revokeObjectURL(url);
    throw error;
  }
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("画像を処理できませんでした。");
  return context;
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("画像を圧縮できませんでした。"))),
      "image/jpeg",
      quality,
    );
  });
}

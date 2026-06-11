type DrawableImage = CanvasImageSource & { width: number; height: number };

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
    context.drawImage(image, 0, 0, width, height);
    return canvasToJpeg(canvas, quality);
  } finally {
    closeImage(image);
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
    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
    return canvasToJpeg(canvas, 0.75);
  } finally {
    closeImage(image);
  }
}

async function loadImage(file: File): Promise<DrawableImage> {
  if ("createImageBitmap" in window) {
    return createImageBitmap(file, { imageOrientation: "from-image" });
  }

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function closeImage(image: DrawableImage): void {
  if ("close" in image && typeof image.close === "function") image.close();
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

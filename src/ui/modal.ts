import type { PhotoNote } from "../db/types";
import { normalizeTags } from "../library/metadata";

export type CameraModalAction = "capture" | "library" | null;

export type CameraModalSession = {
  video: HTMLVideoElement;
  result: Promise<CameraModalAction>;
  isOpen: () => boolean;
  setSwitchHandler: (handler: () => void) => void;
  setCameraLoading: (message: string) => void;
  setCameraReady: (isFrontCamera: boolean) => void;
  setCameraError: (message: string) => void;
  close: () => void;
};

export function showCameraModal(onOpenLibrary: () => void): CameraModalSession {
  const dialog = requireDialog("#cameraDialog");
  const video = requireElement<HTMLVideoElement>(dialog, "#cameraPreview");
  const status = requireElement<HTMLElement>(dialog, "#cameraStatus");
  const captureButton = requireElement<HTMLButtonElement>(dialog, "#cameraCaptureButton");
  const switchButton = requireElement<HTMLButtonElement>(dialog, "#cameraSwitchButton");
  const libraryButton = requireElement<HTMLButtonElement>(dialog, "#cameraLibraryButton");
  const cancelButton = requireElement<HTMLButtonElement>(dialog, "#cameraCancelButton");

  status.textContent = "カメラを準備しています…";
  status.classList.remove("is-error");
  captureButton.disabled = true;
  switchButton.disabled = true;
  video.classList.remove("is-mirrored");

  let settle: (action: CameraModalAction) => void = () => undefined;
  let settled = false;
  const result = new Promise<CameraModalAction>((resolve) => {
    settle = resolve;
  });
  const finish = (action: CameraModalAction) => {
    if (settled) return;
    settled = true;
    settle(action);
  };

  captureButton.onclick = () => {
    dialog.close("capture");
    finish("capture");
  };
  switchButton.onclick = () => undefined;
  libraryButton.onclick = () => {
    onOpenLibrary();
    dialog.close("library");
    finish("library");
  };
  cancelButton.onclick = () => {
    dialog.close("cancel");
    finish(null);
  };
  dialog.oncancel = (event) => {
    event.preventDefault();
    dialog.close("cancel");
    finish(null);
  };
  dialog.onclose = () => finish(dialog.returnValue === "capture" ? "capture" : null);
  dialog.showModal();

  return {
    video,
    result,
    isOpen: () => dialog.open,
    setSwitchHandler: (handler) => {
      switchButton.onclick = handler;
    },
    setCameraLoading: (message) => {
      status.textContent = message;
      status.classList.remove("is-error");
      captureButton.disabled = true;
      switchButton.disabled = true;
    },
    setCameraReady: (isFrontCamera) => {
      status.textContent = "";
      status.classList.remove("is-error");
      captureButton.disabled = false;
      switchButton.disabled = false;
      video.classList.toggle("is-mirrored", isFrontCamera);
    },
    setCameraError: (message) => {
      status.textContent = message;
      status.classList.add("is-error");
      captureButton.disabled = true;
      switchButton.disabled = false;
    },
    close: () => {
      if (dialog.open) dialog.close("cancel");
      finish(null);
    },
  };
}

export function showPhotoCommentModal(previewUrl: string): Promise<string | null> {
  const dialog = requireDialog("#photoCommentDialog");
  const preview = requireElement<HTMLImageElement>(dialog, "#photoPreview");
  const input = requireElement<HTMLInputElement>(dialog, "#photoComment");
  const cancelButton = requireElement<HTMLButtonElement>(dialog, "#commentCancelButton");
  const saveButton = requireElement<HTMLButtonElement>(dialog, "#commentSaveButton");

  preview.src = previewUrl;
  input.value = "";

  return new Promise((resolve) => {
    let settled = false;
    const finish = (comment: string | null) => {
      if (settled) return;
      settled = true;
      preview.removeAttribute("src");
      resolve(comment);
    };

    cancelButton.onclick = () => {
      dialog.close("cancel");
      finish(null);
    };
    saveButton.onclick = () => {
      dialog.close("save");
      finish(input.value.trim().slice(0, 120));
    };
    dialog.oncancel = (event) => {
      event.preventDefault();
      dialog.close("cancel");
      finish(null);
    };
    dialog.onclose = () => finish(dialog.returnValue === "save" ? input.value.trim().slice(0, 120) : null);
    dialog.showModal();
    window.setTimeout(() => input.focus(), 50);
  });
}

type PhotoDetailOptions = {
  onDelete: (note: PhotoNote) => Promise<void>;
  onUpdate: (note: PhotoNote) => Promise<void>;
};

export function showPhotoDetailModal(note: PhotoNote, options: PhotoDetailOptions): void {
  const dialog = requireDialog("#photoDetailDialog");
  const image = requireElement<HTMLImageElement>(dialog, "#detailPhoto");
  const comment = requireElement<HTMLElement>(dialog, "#detailComment");
  const date = requireElement<HTMLElement>(dialog, "#detailDate");
  const favoriteButton = requireElement<HTMLButtonElement>(dialog, "#detailFavoriteButton");
  const tagsInput = requireElement<HTMLInputElement>(dialog, "#detailTagsInput");
  const tagsSaveButton = requireElement<HTMLButtonElement>(dialog, "#detailTagsSaveButton");
  const tags = requireElement<HTMLElement>(dialog, "#detailTags");
  const deleteButton = requireElement<HTMLButtonElement>(dialog, "#deletePhotoButton");
  const closeButton = requireElement<HTMLButtonElement>(dialog, "#detailCloseButton");
  const imageUrl = URL.createObjectURL(note.imageBlob);
  let currentNote = note;

  image.src = imageUrl;
  comment.textContent = note.comment || "コメントなし";
  comment.classList.toggle("is-empty", !note.comment);
  date.textContent = new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(note.createdAt));

  const renderMetadata = () => {
    favoriteButton.classList.toggle("is-active", Boolean(currentNote.isFavorite));
    favoriteButton.setAttribute("aria-pressed", String(Boolean(currentNote.isFavorite)));
    favoriteButton.textContent = currentNote.isFavorite ? "★ お気に入り" : "☆ お気に入り";
    tagsInput.value = (currentNote.tags ?? []).join(", ");
    renderTagChips(tags, currentNote.tags ?? []);
  };

  favoriteButton.onclick = async () => {
    favoriteButton.disabled = true;
    try {
      const updated = { ...currentNote, isFavorite: !currentNote.isFavorite };
      await options.onUpdate(updated);
      currentNote = updated;
      renderMetadata();
    } catch {
      // The caller displays the persistence error.
    } finally {
      favoriteButton.disabled = false;
    }
  };
  tagsSaveButton.onclick = async () => {
    tagsSaveButton.disabled = true;
    try {
      const updated = { ...currentNote, tags: normalizeTags(tagsInput.value) };
      await options.onUpdate(updated);
      currentNote = updated;
      renderMetadata();
    } catch {
      // The caller displays the persistence error.
    } finally {
      tagsSaveButton.disabled = false;
    }
  };
  renderMetadata();

  deleteButton.disabled = false;
  deleteButton.onclick = async () => {
    if (!window.confirm("この写真を削除しますか？")) return;
    deleteButton.disabled = true;
    try {
      await options.onDelete(currentNote);
      dialog.close();
    } catch {
      // The caller reports the persistence error and the modal stays open.
    } finally {
      deleteButton.disabled = false;
    }
  };
  closeButton.onclick = () => dialog.close();
  dialog.onclose = () => {
    image.removeAttribute("src");
    URL.revokeObjectURL(imageUrl);
  };
  dialog.showModal();
}

function renderTagChips(container: HTMLElement, tags: string[]): void {
  container.replaceChildren();
  for (const tag of tags) {
    const chip = document.createElement("span");
    chip.textContent = `#${tag}`;
    container.append(chip);
  }
}

function requireDialog(selector: string): HTMLDialogElement {
  const dialog = document.querySelector<HTMLDialogElement>(selector);
  if (!dialog) throw new Error(`Required dialog not found: ${selector}`);
  return dialog;
}

function requireElement<T extends Element>(parent: ParentNode, selector: string): T {
  const element = parent.querySelector<T>(selector);
  if (!element) throw new Error(`Required element not found: ${selector}`);
  return element;
}

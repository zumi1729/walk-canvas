export function openCamera(input: HTMLInputElement): void {
  input.value = "";
  input.click();
}

export function getSelectedPhoto(input: HTMLInputElement): File | undefined {
  const file = input.files?.[0];
  if (!file || !file.type.startsWith("image/")) return undefined;
  return file;
}

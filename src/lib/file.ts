export const maxImageBytes = 2 * 1024 * 1024;
export const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];

export function validateImageFile(file: File | null) {
  if (!file) return "Envie uma imagem real.";
  if (!allowedImageTypes.includes(file.type)) return "Use uma imagem JPG, PNG ou WebP.";
  if (file.size > maxImageBytes) return "A imagem deve ter até 2MB.";
  return null;
}

export function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
}

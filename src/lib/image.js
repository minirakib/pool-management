const MAX_FILE_BYTES = 5 * 1024 * 1024;
const LOGO_SIZE = 256;
const MAX_LOGO_CHARS = 200_000; // ~150 KB once stored; keeps saved data well inside browser storage limits

/**
 * Reads an uploaded logo and shrinks it to fit 256×256 (aspect kept, transparency kept).
 * Resolves a data URL ready to save in settings; throws a user-facing Error otherwise.
 */
export async function fileToLogo(file) {
  if (!file || !/^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(file.type)) throw new Error("Choose a PNG, JPG, WebP, GIF or SVG image.");
  if (file.size > MAX_FILE_BYTES) throw new Error("That image is larger than 5 MB. Choose a smaller file.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("That image could not be opened."));
      el.src = url;
    });
    const w = img.naturalWidth || LOGO_SIZE, h = img.naturalHeight || LOGO_SIZE;
    const scale = Math.min(1, LOGO_SIZE / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let data = canvas.toDataURL("image/png");
    if (data.length > MAX_LOGO_CHARS) data = canvas.toDataURL("image/webp", .9);
    if (data.length > MAX_LOGO_CHARS) throw new Error("That image is too detailed to store. Try a simpler logo.");
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}

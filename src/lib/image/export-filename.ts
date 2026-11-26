import type { OutputMime } from "./export-image";

export function createExportFilename(originalName: string, format: OutputMime): string {
  const cleanName = originalName
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\p{Cc}/gu, "_")
    .trim()
    .replace(/\.+$/, "");
  const dot = cleanName.lastIndexOf(".");
  const stem = (dot < 0 ? cleanName : cleanName.slice(0, dot)).replace(/[. ]+$/, "") || "image";
  const safeStem = /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])\./i.test(stem) ? `_${stem}` : stem;
  const extension = format === "image/jpeg" ? "jpg" : "png";

  return `${safeStem}-pixelcover.${extension}`;
}

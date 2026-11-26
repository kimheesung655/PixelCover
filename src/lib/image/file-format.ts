import { ImageEditError } from "../editor/image-edit-error";

export type InputMime = "image/png" | "image/jpeg" | "image/webp";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const WEBP_CHUNKS = ["VP8 ", "VP8L", "VP8X"];

export async function detectImageFormat(file: File): Promise<InputMime> {
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const format = sniffImageFormat(header);
  if (!format) {
    throw new ImageEditError("UNSUPPORTED_FORMAT", "지원하는 이미지 형식은 JPEG, PNG, WebP입니다.");
  }

  if (file.type && file.type !== "application/octet-stream" && file.type !== format) {
    throw new ImageEditError("UNSUPPORTED_FORMAT", "파일에 표시된 형식이 실제 이미지 형식과 다릅니다.");
  }

  return format;
}

function sniffImageFormat(header: Uint8Array): InputMime | undefined {
  if (PNG_SIGNATURE.every((byte, index) => header[index] === byte)) return "image/png";
  if (JPEG_SIGNATURE.every((byte, index) => header[index] === byte)) return "image/jpeg";

  if (header.length < 16) return undefined;
  const container = String.fromCharCode(...header.subarray(0, 4));
  const form = String.fromCharCode(...header.subarray(8, 12));
  const chunk = String.fromCharCode(...header.subarray(12, 16));
  if (container === "RIFF" && form === "WEBP" && WEBP_CHUNKS.includes(chunk)) return "image/webp";

  return undefined;
}

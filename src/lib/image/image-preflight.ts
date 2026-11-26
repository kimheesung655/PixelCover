import { ImageEditError } from "../editor/image-edit-error";
import { detectImageFormat, type InputMime } from "./file-format";
import { readImageDimensions, type ImageDimensions } from "./image-dimensions";

export const MAX_IMAGE_BYTES = 20_000_000;
const MAX_IMAGE_EDGE = 8_192;
const MAX_IMAGE_PIXELS = 16_000_000;

interface ImagePreflight extends ImageDimensions {
  mimeType: InputMime;
}

export async function inspectImageFile(file: File): Promise<ImagePreflight> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new ImageEditError("FILE_TOO_LARGE", "이미지 파일은 20,000,000바이트 이하여야 합니다.");
  }

  const mimeType = await detectImageFormat(file);
  const dimensions = readImageDimensions(await file.arrayBuffer(), mimeType);
  enforceImageDimensions(dimensions);

  return { mimeType, ...dimensions };
}

export function enforceImageDimensions({ width, height }: ImageDimensions): void {
  if (width > MAX_IMAGE_EDGE || height > MAX_IMAGE_EDGE || width * height > MAX_IMAGE_PIXELS) {
    throw new ImageEditError("IMAGE_TOO_LARGE", "한 변은 8,192픽셀, 전체는 16,000,000픽셀 이하여야 합니다.");
  }
}

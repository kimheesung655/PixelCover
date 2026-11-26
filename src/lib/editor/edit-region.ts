import { ImageEditError } from "./image-edit-error";

export type EffectType = "mosaic" | "blur" | "redact";

export interface EditRegion {
  id: string;
  type: EffectType;
  x: number;
  y: number;
  width: number;
  height: number;
  intensity: number;
}

export function normalizeRegion(region: EditRegion, imageWidth: number, imageHeight: number): EditRegion {
  const { x, y, width, height, id, type, intensity } = region;
  const endX = x + width;
  const endY = y + height;
  if (
    !id.trim() ||
    ![x, y, endX, endY].every(Number.isFinite) ||
    x === endX || y === endY ||
    !Number.isSafeInteger(imageWidth) || !Number.isSafeInteger(imageHeight) ||
    imageWidth <= 0 || imageHeight <= 0
  ) {
    throw new ImageEditError("INVALID_REGION", "편집 영역의 ID, 좌표 또는 치수가 올바르지 않습니다.");
  }
  if (type !== "redact" && (!Number.isInteger(intensity) || intensity < 1 || intensity > 100)) {
    throw new ImageEditError("INVALID_REGION", "모자이크와 블러 강도는 1~100 사이의 정수여야 합니다.");
  }

  const left = Math.max(0, Math.floor(Math.min(x, endX)));
  const top = Math.max(0, Math.floor(Math.min(y, endY)));
  const right = Math.min(imageWidth, Math.ceil(Math.max(x, endX)));
  const bottom = Math.min(imageHeight, Math.ceil(Math.max(y, endY)));
  if (right <= left || bottom <= top) {
    throw new ImageEditError("INVALID_REGION", "이미지와 겹치는 편집 영역이 없습니다.");
  }

  return { ...region, x: left, y: top, width: right - left, height: bottom - top };
}

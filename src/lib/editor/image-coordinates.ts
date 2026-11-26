import { ImageEditError } from "./image-edit-error";

export interface Point {
  x: number;
  y: number;
}

interface DisplayedImageRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function toImageCoordinates(
  pointer: Point,
  displayed: DisplayedImageRect,
  imageWidth: number,
  imageHeight: number,
): Point {
  if (
    ![pointer.x, pointer.y, displayed.left, displayed.top, displayed.width, displayed.height].every(Number.isFinite) ||
    displayed.width <= 0 || displayed.height <= 0 ||
    !Number.isSafeInteger(imageWidth) || !Number.isSafeInteger(imageHeight) || imageWidth <= 0 || imageHeight <= 0
  ) {
    throw new ImageEditError("INVALID_REGION", "표시 영역 또는 이미지 치수가 올바르지 않습니다.");
  }

  const x = ((pointer.x - displayed.left) / displayed.width) * imageWidth;
  const y = ((pointer.y - displayed.top) / displayed.height) * imageHeight;
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new ImageEditError("INVALID_REGION", "이미지 좌표를 계산할 수 없습니다.");
  }
  return { x, y };
}

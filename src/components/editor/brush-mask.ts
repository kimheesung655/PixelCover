import { ImageEditError } from "../../lib/editor";

export type Area = { x: number; y: number; width: number; height: number };

/** 원본 이미지 픽셀 좌표로 기록한 브러시 한 획. points는 [x0, y0, x1, y1, ...], size는 붓 지름(원본 픽셀). */
export type BrushStroke = { points: number[]; size: number };

/** 한 획이 칠한 픽셀. area 안에서 mask[row * width + col] === 1 이면 칠해진 픽셀이다. */
export type BrushMask = Area & { mask: Uint8Array };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** 획 전체를 덮는 정수 사각형(이미지 경계 안). 엔진 normalizeRegion을 거쳐도 바뀌지 않는 값이다. */
export function strokeBounds(stroke: BrushStroke, imageWidth: number, imageHeight: number): Area {
  const { points, size } = stroke;
  if (points.length < 2 || points.length % 2 !== 0 || !points.every(Number.isFinite) || !(size > 0)) {
    throw new ImageEditError("INVALID_REGION", "브러시 획이 비어 있거나 올바르지 않습니다.");
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < points.length; i += 2) {
    minX = Math.min(minX, points[i]);
    maxX = Math.max(maxX, points[i]);
    minY = Math.min(minY, points[i + 1]);
    maxY = Math.max(maxY, points[i + 1]);
  }

  // 안티에일리어싱으로 번지는 가장자리까지 들어오도록 반지름에 1px 여유를 둔다.
  const pad = size / 2 + 1;
  const left = clamp(Math.floor(minX - pad), 0, imageWidth);
  const top = clamp(Math.floor(minY - pad), 0, imageHeight);
  const right = clamp(Math.ceil(maxX + pad), 0, imageWidth);
  const bottom = clamp(Math.ceil(maxY + pad), 0, imageHeight);
  if (right <= left || bottom <= top) {
    throw new ImageEditError("INVALID_REGION", "이미지와 겹치는 브러시 영역이 없습니다.");
  }
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function isDot(points: readonly number[]): boolean {
  for (let i = 2; i < points.length; i += 2) {
    if (points[i] !== points[0] || points[i + 1] !== points[1]) return false;
  }
  return true;
}

/** 획을 둥근 붓 모양으로 그린다. 좌표는 원본 이미지 픽셀 기준. */
export function traceStroke(context: CanvasRenderingContext2D, stroke: BrushStroke): void {
  const { points, size } = stroke;
  context.lineWidth = size;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  if (isDot(points)) {
    context.arc(points[0], points[1], size / 2, 0, Math.PI * 2);
    context.fill();
    return;
  }
  context.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) context.lineTo(points[i], points[i + 1]);
  context.stroke();
}

/** 획이 칠한 픽셀을 area 크기의 마스크로 만든다. */
export function rasterizeStroke(stroke: BrushStroke, area: Area): BrushMask {
  if (typeof document === "undefined") {
    throw new ImageEditError("RENDER_FAILED", "이 환경에서는 브러시 영역을 계산할 수 없습니다.");
  }
  const canvas = document.createElement("canvas");
  try {
    canvas.width = area.width;
    canvas.height = area.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new ImageEditError("RENDER_FAILED", "브러시 영역 캔버스를 열 수 없습니다.");
    context.fillStyle = "#fff";
    context.strokeStyle = "#fff";
    context.translate(-area.x, -area.y);
    traceStroke(context, stroke);

    const { data } = context.getImageData(0, 0, area.width, area.height);
    const mask = new Uint8Array(area.width * area.height);
    // 반투명하게 걸친 가장자리 픽셀도 칠한 것으로 본다. 가리기에서 원본이 조금이라도 비치지 않게 하려는 것.
    for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] > 0 ? 1 : 0;
    return { ...area, mask };
  } finally {
    canvas.width = 0;
  }
}

/** 이미지 좌표 (x, y)가 마스크에서 칠해진 픽셀인지. */
export function isPainted(mask: BrushMask, x: number, y: number): boolean {
  const col = x - mask.x;
  const row = y - mask.y;
  return col >= 0 && row >= 0 && col < mask.width && row < mask.height && mask.mask[row * mask.width + col] === 1;
}

/** 효과를 적용한 pixels(area 크기 RGBA)에서 칠하지 않은 픽셀을 original 값으로 되돌린다. */
export function keepPaintedPixels(
  pixels: Uint8ClampedArray,
  original: Uint8ClampedArray,
  area: Area,
  mask: BrushMask,
): void {
  for (let row = 0; row < area.height; row++) {
    for (let col = 0; col < area.width; col++) {
      if (isPainted(mask, area.x + col, area.y + row)) continue;
      const i = (row * area.width + col) * 4;
      pixels[i] = original[i];
      pixels[i + 1] = original[i + 1];
      pixels[i + 2] = original[i + 2];
      pixels[i + 3] = original[i + 3];
    }
  }
}

/** 칠한 픽셀을 불투명 검정으로 덮는다. 엔진의 가리기(#000, 알파 255)와 같은 값이다. */
export function fillPaintedPixels(pixels: Uint8ClampedArray, area: Area, mask: BrushMask): void {
  for (let row = 0; row < area.height; row++) {
    for (let col = 0; col < area.width; col++) {
      if (!isPainted(mask, area.x + col, area.y + row)) continue;
      const i = (row * area.width + col) * 4;
      pixels[i] = 0;
      pixels[i + 1] = 0;
      pixels[i + 2] = 0;
      pixels[i + 3] = 255;
    }
  }
}

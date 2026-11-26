import { ImageEditError } from "../editor/image-edit-error";
import type { InputMime } from "./file-format";

export interface ImageDimensions {
  width: number;
  height: number;
}

const JPEG_FRAME_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);
const PNG_IHDR = 0x49484452;
const WEBP_VP8 = 0x56503820;
const WEBP_VP8L = 0x5650384c;
const WEBP_VP8X = 0x56503858;
const WEBP_PAYLOAD = 20;

export function readImageDimensions(buffer: ArrayBuffer, mimeType: InputMime): ImageDimensions {
  const data = new DataView(buffer);
  const dimensions = dimensionReaders[mimeType](data);

  if (!dimensions || dimensions.width === 0 || dimensions.height === 0) {
    throw new ImageEditError("DECODE_FAILED", "이미지 헤더에서 유효한 치수를 읽을 수 없습니다.");
  }

  return dimensions;
}

function readPngDimensions(data: DataView): ImageDimensions | undefined {
  // Signature, chunk length and type, 13-byte IHDR data, and CRC.
  if (data.byteLength < 33 || data.getUint32(8) !== 13 || data.getUint32(12) !== PNG_IHDR) return;

  return { width: data.getUint32(16), height: data.getUint32(20) };
}

function readJpegDimensions(data: DataView): ImageDimensions | undefined {
  let offset = 2;
  while (offset < data.byteLength && data.getUint8(offset) === 0xff) {
    do {
      offset++;
    } while (offset < data.byteLength && data.getUint8(offset) === 0xff);
    if (offset === data.byteLength) return;

    const marker = data.getUint8(offset++);
    if (marker === 0x01) continue; // TEM carries no length.
    if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xda) || offset + 2 > data.byteLength) return;

    const length = data.getUint16(offset);
    if (length < 2 || offset + length > data.byteLength) return;

    if (JPEG_FRAME_MARKERS.has(marker)) {
      if (length < 8) return;
      const components = data.getUint8(offset + 7);
      if (components === 0 || length !== 8 + 3 * components) return;
      return {
        width: data.getUint16(offset + 5),
        height: data.getUint16(offset + 3),
      };
    }

    offset += length;
  }
}

function readWebpDimensions(data: DataView): ImageDimensions | undefined {
  if (data.byteLength < WEBP_PAYLOAD) return;
  const riffEnd = 8 + data.getUint32(4, true);
  const chunkSize = data.getUint32(16, true);
  if (riffEnd > data.byteLength || WEBP_PAYLOAD + chunkSize + (chunkSize % 2) > riffEnd) return;

  const chunk = data.getUint32(12);
  if (chunk === WEBP_VP8X && chunkSize === 10) {
    return {
      width: 1 + readUint24LE(data, WEBP_PAYLOAD + 4),
      height: 1 + readUint24LE(data, WEBP_PAYLOAD + 7),
    };
  }
  if (chunk === WEBP_VP8L && chunkSize >= 5 && data.getUint8(WEBP_PAYLOAD) === 0x2f) {
    const bits = data.getUint32(WEBP_PAYLOAD + 1, true);
    if (bits >>> 29) return;
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >>> 14) & 0x3fff) };
  }
  if (
    chunk === WEBP_VP8 && chunkSize >= 10 &&
    (data.getUint8(WEBP_PAYLOAD) & 1) === 0 &&
    readUint24LE(data, WEBP_PAYLOAD + 3) === 0x2a019d
  ) {
    return {
      width: data.getUint16(WEBP_PAYLOAD + 6, true) & 0x3fff,
      height: data.getUint16(WEBP_PAYLOAD + 8, true) & 0x3fff,
    };
  }
}

function readUint24LE(data: DataView, offset: number): number {
  return data.getUint16(offset, true) + data.getUint8(offset + 2) * 0x10000;
}

const dimensionReaders = {
  "image/png": readPngDimensions,
  "image/jpeg": readJpegDimensions,
  "image/webp": readWebpDimensions,
};

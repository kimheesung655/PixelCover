import { expect, test } from "vitest";
import { inspectImageFile } from "../../src/lib/image/image-preflight";

function png(width: number, height: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const data = new DataView(bytes.buffer);
  data.setUint32(16, width);
  data.setUint32(20, height);
  bytes[24] = 8;
  bytes[25] = 2;
  return bytes;
}

function webp(chunk: string, payload: number[]): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(20 + payload.length + (payload.length % 2));
  const ascii = new TextEncoder();
  bytes.set(ascii.encode("RIFF"));
  bytes.set(ascii.encode("WEBP" + chunk), 8);
  const data = new DataView(bytes.buffer);
  data.setUint32(4, bytes.length - 8, true);
  data.setUint32(16, payload.length, true);
  bytes.set(payload, 20);
  return bytes;
}

const jpeg = Uint8Array.of(
  0xff, 0xd8,
  0xff, 0xe1, 0, 4, 0xff, 0xc0, // Marker-looking bytes inside an APP segment.
  0xff, 0xff, 0xc2, 0, 11, 8, 0, 23, 0, 17, 1, 1, 0x11, 0,
);
const vp8 = webp("VP8 ", [0, 0, 0, 0x9d, 1, 0x2a, 17, 0x80, 23, 0x40]);
const vp8l = webp("VP8L", [0x2f, 16, 0x80, 5, 0]);
const vp8x = webp("VP8X", [0, 0, 0, 0, 16, 0, 0, 22, 0, 0]);

test.each([
  ["image/png", png(17, 23)],
  ["image/jpeg", jpeg],
  ["image/webp", vp8],
  ["image/webp", vp8l],
  ["image/webp", vp8x],
] as const)("%s 헤더에서 치수를 읽는다 %#", async (mimeType, header) => {
  await expect(inspectImageFile(new File([header], "image"))).resolves.toEqual({
    mimeType, width: 17, height: 23,
  });
});

test.each([[8191, 1], [8192, 1], [1, 8192], [7999, 2000], [8000, 2000]])(
  "%i×%i 픽셀을 허용한다",
  async (width, height) => {
    await expect(inspectImageFile(new File([png(width, height)], "image.png"))).resolves.toMatchObject({ width, height });
  },
);

test.each([[8193, 1], [1, 8193], [8001, 2000], [16_000_001, 1]])(
  "%i×%i 픽셀을 거부한다",
  async (width, height) => {
    await expect(inspectImageFile(new File([png(width, height)], "image.png"))).rejects.toHaveProperty("code", "IMAGE_TOO_LARGE");
  },
);

test.each([
  png(0, 1),
  png(1, 33).slice(0, 30),
  jpeg.slice(0, -1),
  Uint8Array.of(0xff, 0xd8, 0xff, 0xda, 0, 2),
  vp8x.slice(0, -1),
  webp("VP8L", [0, 0, 0, 0, 0]),
])("손상되거나 잘린 헤더를 디코딩 오류로 처리한다 %#", async (header) => {
  await expect(inspectImageFile(new File([header], "image"))).rejects.toHaveProperty("code", "DECODE_FAILED");
});

import { describe, expect, test } from "vitest";
import { ImageEditError } from "../../src/lib/editor/image-edit-error";
import { detectImageFormat } from "../../src/lib/image/file-format";

const png = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const jpeg = Uint8Array.of(0xff, 0xd8, 0xff, 0xe0);
const webp = new TextEncoder().encode("RIFF\0\0\0\0WEBP");

describe("이미지 시그니처", () => {
  test.each([
    ["image/png", png],
    ["image/jpeg", jpeg],
    ["image/webp", new Uint8Array([...webp, 0x56, 0x50, 0x38, 0x20])],
    ["image/webp", new Uint8Array([...webp, 0x56, 0x50, 0x38, 0x4c])],
    ["image/webp", new Uint8Array([...webp, 0x56, 0x50, 0x38, 0x58])],
  ] as const)("%s 시그니처를 인식한다", async (mime, bytes) => {
    await expect(detectImageFormat(new File([bytes], "image", { type: mime }))).resolves.toBe(mime);
  });

  test.each(["", "application/octet-stream"])("MIME 힌트가 %j일 때 실제 형식을 사용한다", async (type) => {
    await expect(detectImageFormat(new File([png], "photo.jpg", { type }))).resolves.toBe("image/png");
  });

  test("선언된 MIME이 실제 형식과 다르면 형식 오류를 반환한다", async () => {
    const result = detectImageFormat(new File([png], "photo.jpg", { type: "image/jpeg" }));
    await expect(result).rejects.toBeInstanceOf(ImageEditError);
    await expect(result).rejects.toHaveProperty("code", "UNSUPPORTED_FORMAT");
  });

  test.each([
    Uint8Array.of(),
    png.slice(0, 7),
    jpeg.slice(0, 2),
    webp,
    new Uint8Array([...webp, 0x4a, 0x55, 0x4e, 0x4b]),
    new TextEncoder().encode("GIF89a"),
  ])("잘렸거나 지원하지 않는 시그니처를 거부한다 %#", async (bytes) => {
    const file = new File([bytes], "fake.png", { type: "image/png" });
    await expect(detectImageFormat(file)).rejects.toHaveProperty("code", "UNSUPPORTED_FORMAT");
  });
});

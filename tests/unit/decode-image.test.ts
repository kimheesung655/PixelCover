import { afterEach, expect, test, vi } from "vitest";
import { decodeImage, validateImage } from "../../src/lib/image/decode-image";

function jpegHeaderOnly(type = "image/jpeg"): File {
  const bytes = Uint8Array.of(0xff, 0xd8, 0xff, 0xc0, 0, 11, 8, 0, 2, 0, 3, 1, 1, 0x11, 0);
  return new File([bytes], "photo.jpg", { type });
}

afterEach(() => vi.unstubAllGlobals());

test("사전 검사에 실패한 파일을 브라우저 디코더에 전달하지 않는다", async () => {
  const decoder = vi.fn();
  vi.stubGlobal("createImageBitmap", decoder);

  await expect(decodeImage(new File(["invalid"], "photo.jpg"))).rejects.toHaveProperty("code", "UNSUPPORTED_FORMAT");
  expect(decoder).not.toHaveBeenCalled();
});

test("헤더를 통과한 손상 파일의 브라우저 디코딩 거부를 변환한다", async () => {
  const cause = new DOMException("The source image could not be decoded.", "InvalidStateError");
  const decoder = vi.fn().mockRejectedValue(cause);
  vi.stubGlobal("createImageBitmap", decoder);
  const file = jpegHeaderOnly();

  await expect(decodeImage(file)).rejects.toMatchObject({ code: "DECODE_FAILED", cause });
  expect(decoder).toHaveBeenCalledExactlyOnceWith(file, { imageOrientation: "from-image" });
});

test("MIME 힌트 없이 들어온 파일을 감지한 MIME으로 디코딩한다", async () => {
  const bitmap = { width: 3, height: 2, close: vi.fn() };
  const decoder = vi.fn().mockResolvedValue(bitmap);
  vi.stubGlobal("createImageBitmap", decoder);
  const file = jpegHeaderOnly("");

  await expect(decodeImage(file)).resolves.toBe(bitmap);
  expect(bitmap.close).not.toHaveBeenCalled();
  const source: Blob = decoder.mock.calls[0][0];
  expect(source.type).toBe("image/jpeg");
  expect(await source.arrayBuffer()).toEqual(await file.arrayBuffer());
});

test("검증 결과는 헤더 대신 방향이 보정된 원본 치수를 사용한다", async () => {
  const rotatedBitmap = { width: 2, height: 3, close: vi.fn() };
  const decoder = vi.fn().mockResolvedValue(rotatedBitmap);
  vi.stubGlobal("createImageBitmap", decoder);
  const file = jpegHeaderOnly();

  await expect(validateImage(file)).resolves.toEqual({
    width: 2,
    height: 3,
    mimeType: "image/jpeg",
    fileName: file.name,
    fileSize: file.size,
  });
  expect(decoder).toHaveBeenCalledExactlyOnceWith(file, { imageOrientation: "from-image" });
  expect(rotatedBitmap.close).toHaveBeenCalledOnce();
});

test.each([decodeImage, validateImage])("디코딩 결과가 상한을 넘으면 비트맵을 해제한다 %#", async (operation) => {
  const bitmap = { width: 8_193, height: 1, close: vi.fn() };
  vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap));

  await expect(operation(jpegHeaderOnly())).rejects.toHaveProperty("code", "IMAGE_TOO_LARGE");
  expect(bitmap.close).toHaveBeenCalledOnce();
});

test("치수가 비어 있는 디코딩 결과를 해제한다", async () => {
  const bitmap = { width: 0, height: 1, close: vi.fn() };
  vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap));

  await expect(decodeImage(jpegHeaderOnly())).rejects.toHaveProperty("code", "DECODE_FAILED");
  expect(bitmap.close).toHaveBeenCalledOnce();
});

test("이미지 비트맵 API를 지원하지 않는 브라우저에 명확한 오류를 반환한다", async () => {
  vi.stubGlobal("createImageBitmap", undefined);
  await expect(decodeImage(jpegHeaderOnly())).rejects.toMatchObject({
    code: "DECODE_FAILED",
    message: expect.stringContaining("이 브라우저"),
  });
});

test("파일 읽기 실패도 디코딩 오류로 전달한다", async () => {
  const file = jpegHeaderOnly();
  const cause = new DOMException("The original file is unavailable.", "NotReadableError");
  vi.spyOn(file, "arrayBuffer").mockRejectedValue(cause);
  const decoder = vi.fn();
  vi.stubGlobal("createImageBitmap", decoder);

  await expect(validateImage(file)).rejects.toMatchObject({ code: "DECODE_FAILED", cause });
  expect(decoder).not.toHaveBeenCalled();
});

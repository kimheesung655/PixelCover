import { afterEach, expect, test, vi } from "vitest";
import { decodeImage } from "../../src/lib/image/decode-image";

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
  expect(decoder).toHaveBeenCalledExactlyOnceWith(file);
});

test("MIME 힌트 없이 들어온 파일을 감지한 MIME으로 디코딩한다", async () => {
  const bitmap = { width: 3, height: 2, close: vi.fn() };
  const decoder = vi.fn().mockResolvedValue(bitmap);
  vi.stubGlobal("createImageBitmap", decoder);
  const file = jpegHeaderOnly("");

  await expect(decodeImage(file)).resolves.toBe(bitmap);
  const source: Blob = decoder.mock.calls[0][0];
  expect(source.type).toBe("image/jpeg");
  expect(await source.arrayBuffer()).toEqual(await file.arrayBuffer());
});

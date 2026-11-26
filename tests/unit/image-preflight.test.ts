import { expect, test, vi } from "vitest";
import { inspectImageFile, MAX_IMAGE_BYTES } from "../../src/lib/image/image-preflight";

function jpegOfSize(size: number): File {
  const bytes = new Uint8Array(size);
  bytes.set([0xff, 0xd8, 0xff, 0xc0, 0, 11, 8, 0, 1, 0, 1, 1, 1, 0x11, 0]);
  return new File([bytes], "photo.jpg", { type: "image/jpeg" });
}

test.each([MAX_IMAGE_BYTES - 1, MAX_IMAGE_BYTES])("%i바이트 JPEG를 사전 검사에서 허용한다", async (size) => {
  await expect(inspectImageFile(jpegOfSize(size))).resolves.toEqual({ mimeType: "image/jpeg", width: 1, height: 1 });
});

test("상한을 1바이트 넘으면 헤더를 읽기 전에 거부한다", async () => {
  const oversized = jpegOfSize(MAX_IMAGE_BYTES + 1);
  const slice = vi.spyOn(oversized, "slice");

  await expect(inspectImageFile(oversized)).rejects.toHaveProperty("code", "FILE_TOO_LARGE");
  expect(slice).not.toHaveBeenCalled();
});

test("용량 제한을 통과한 파일도 시그니처를 검사한다", async () => {
  const file = new File(["invalid"], "photo.jpg", { type: "image/jpeg" });
  await expect(inspectImageFile(file)).rejects.toHaveProperty("code", "UNSUPPORTED_FORMAT");
});

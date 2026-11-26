import { expect, test } from "vitest";
import { createExportFilename } from "../../src/lib/image/export-filename";

test.each([
  ["가족.여행.webp", "image/png", "가족.여행-pixelcover.png"],
  ["photo.jpeg", "image/jpeg", "photo-pixelcover.jpg"],
  ["photo", "image/png", "photo-pixelcover.png"],
  [".png", "image/png", "image-pixelcover.png"],
  ["  ", "image/jpeg", "image-pixelcover.jpg"],
  ["con.backup.webp", "image/png", "_con.backup-pixelcover.png"],
  ["team/board?.png", "image/png", "team_board_-pixelcover.png"],
] as const)("%j에 안전한 출력 파일명을 만든다", (name, format, output) => {
  expect(createExportFilename(name, format)).toBe(output);
});

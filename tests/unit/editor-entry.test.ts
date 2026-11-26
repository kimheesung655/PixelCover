import { expect, test } from "vitest";
import * as editor from "../../src/lib/editor";

test("공개 엔진 진입점으로 입력 검사, 편집, 출력 API를 불러올 수 있다", async () => {
  expect(editor.decodeImage).toBeTypeOf("function");
  expect(editor.exportImage).toBeTypeOf("function");
  expect(editor.normalizeRegion).toBeTypeOf("function");
  expect(editor.renderImage).toBeTypeOf("function");

  const invalid = editor.validateImage(new File(["not an image"], "fake.png", { type: "image/png" }));
  await expect(invalid).rejects.toBeInstanceOf(editor.ImageEditError);
  await expect(invalid).rejects.toHaveProperty("code", "UNSUPPORTED_FORMAT");
});

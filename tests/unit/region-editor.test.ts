import { expect, test } from "vitest";
import { RegionEditor } from "../../src/lib/editor/region-editor";
import type { EditRegion } from "../../src/lib/editor/edit-region";

const initial: EditRegion = { id: "one", type: "blur", x: 1.5, y: 2, width: 3, height: 4, intensity: 30 };

test("추가 순서를 유지하고 정규화된 영역의 복사본을 반환한다", () => {
  const editor = new RegionEditor(12, 12);
  const input = { ...initial };
  editor.add(input);
  editor.add({ ...initial, id: "two" });
  input.id = "changed";
  editor.getRegions()[0].id = "changed again";

  expect(editor.getRegions()).toEqual([
    { ...initial, x: 1, width: 4 },
    { ...initial, id: "two", x: 1, width: 4 },
  ]);
});

test("중복 ID로 추가할 때 기존 영역을 유지한다", () => {
  const editor = new RegionEditor(12, 12);
  editor.add(initial);

  expect(() => editor.add({ ...initial, intensity: 80 })).toThrow(
    expect.objectContaining({ code: "INVALID_REGION" }),
  );
  expect(editor.getRegions()[0].intensity).toBe(30);
});

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

test("이동과 속성 변경 후에도 ID와 순서를 유지한다", () => {
  const editor = new RegionEditor(12, 12);
  editor.add(initial);
  editor.add({ ...initial, id: "two" });
  editor.update("one", { x: 9.5, y: 5.1, type: "mosaic", intensity: 70 });

  const [first, second] = editor.getRegions();
  expect(first).toEqual({ ...initial, x: 9, y: 5, width: 3, height: 5, type: "mosaic", intensity: 70 });
  expect(second.id).toBe("two");
});

test("없는 ID나 유효하지 않은 변경을 거부하고 기존 값을 유지한다", () => {
  const editor = new RegionEditor(12, 12);
  editor.add(initial);
  const before = editor.getRegions();

  expect(() => editor.update("missing", { x: 1 })).toThrow(expect.objectContaining({ code: "INVALID_REGION" }));
  expect(() => editor.update("one", { x: 20 })).toThrow(expect.objectContaining({ code: "INVALID_REGION" }));
  expect(editor.getRegions()).toEqual(before);
});

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

test("지정한 영역만 삭제하고 나머지 순서를 유지한다", () => {
  const editor = new RegionEditor(12, 12);
  editor.add(initial);
  editor.add({ ...initial, id: "two" });
  editor.add({ ...initial, id: "three" });

  editor.remove("two");

  expect(editor.getRegions().map(({ id }) => id)).toEqual(["one", "three"]);
  expect(() => editor.remove("two")).toThrow(expect.objectContaining({ code: "INVALID_REGION" }));
});

test("추가, 수정, 삭제를 순서대로 되돌리고 다시 실행한다", () => {
  const editor = new RegionEditor(12, 12);
  expect(editor.undo()).toBe(false);
  editor.add(initial);
  editor.update("one", { intensity: 60 });
  editor.remove("one");

  expect(editor.undo()).toBe(true);
  expect(editor.getRegions()[0].intensity).toBe(60);
  expect(editor.undo()).toBe(true);
  expect(editor.getRegions()[0].intensity).toBe(30);
  expect(editor.undo()).toBe(true);
  expect(editor.getRegions()).toEqual([]);
  expect(editor.undo()).toBe(false);
  expect(editor.redo()).toBe(true);
  expect(editor.redo()).toBe(true);
  expect(editor.redo()).toBe(true);
  expect(editor.getRegions()).toEqual([]);
  expect(editor.redo()).toBe(false);
});

test("실패하거나 값이 같은 변경은 Redo를 보존하고 새 편집은 폐기한다", () => {
  const editor = new RegionEditor(12, 12);
  editor.add(initial);
  editor.update("one", { intensity: 60 });
  editor.undo();

  editor.update("one", { intensity: 30 });
  expect(() => editor.remove("unknown")).toThrow();
  expect(editor.redo()).toBe(true);
  expect(editor.getRegions()[0].intensity).toBe(60);

  editor.undo();
  editor.update("one", { intensity: 90 });
  expect(editor.redo()).toBe(false);
  expect(editor.getRegions()[0].intensity).toBe(90);
});

test("최근 편집 50개만 되돌리고 다시 실행할 수 있다", () => {
  const editor = new RegionEditor(12, 12);
  editor.add(initial);
  for (let intensity = 31; intensity <= 85; intensity++) {
    editor.update("one", { intensity });
  }

  for (let count = 0; count < 50; count++) expect(editor.undo()).toBe(true);
  expect(editor.undo()).toBe(false);
  expect(editor.getRegions()[0].intensity).toBe(35);
  for (let count = 0; count < 50; count++) expect(editor.redo()).toBe(true);
  expect(editor.redo()).toBe(false);
  expect(editor.getRegions()[0].intensity).toBe(85);
});

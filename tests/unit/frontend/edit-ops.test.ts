import { expect, test } from "vitest";
import type { BrushMask } from "../../../src/components/editor/brush-mask";
import {
  blackenCovered,
  computeCoverage,
  isCovered,
  restoreErased,
  type EditStep,
} from "../../../src/components/editor/edit-ops";

// 프론트 지우개·가리기 순서 규칙 검증.

function maskOf(x: number, y: number, rows: string[]): BrushMask {
  const width = rows[0].length;
  const mask = new Uint8Array(width * rows.length);
  rows.forEach((row, r) => [...row].forEach((cell, c) => (mask[r * width + c] = cell === "#" ? 1 : 0)));
  return { x, y, width, height: rows.length, mask };
}

function solid(width: number, height: number, value: number): Uint8ClampedArray {
  return new Uint8ClampedArray(width * height * 4).fill(value);
}

const row4 = (x: number, width: number) => ({ x, y: 0, width, height: 1 });

test("가리기가 없으면 덮을 픽셀도 없다", () => {
  expect(computeCoverage([{ region: row4(0, 4), effect: "mosaic" }, { region: row4(0, 4), effect: "erase" }])).toBeNull();
});

test("가리기 뒤의 지우개는 가림을 걷어내고, 지우개 뒤의 가리기는 다시 덮는다", () => {
  const redact: EditStep = { region: row4(0, 4), effect: "redact" };
  const erase: EditStep = { region: row4(1, 2), effect: "erase" };

  const erasedLater = computeCoverage([redact, erase])!;
  expect([0, 1, 2, 3].map((x) => isCovered(erasedLater, x, 0))).toEqual([true, false, false, true]);

  const redactedLater = computeCoverage([erase, redact])!;
  expect([0, 1, 2, 3].map((x) => isCovered(redactedLater, x, 0))).toEqual([true, true, true, true]);
});

test("브러시 가리기·지우개는 칠한 픽셀에만 적용된다", () => {
  const redact: EditStep = { region: row4(0, 3), effect: "redact", mask: maskOf(0, 0, ["#.#"]) };
  const erase: EditStep = { region: row4(2, 1), effect: "erase", mask: maskOf(2, 0, ["."]) };
  const coverage = computeCoverage([redact, erase])!;
  expect([0, 1, 2].map((x) => isCovered(coverage, x, 0))).toEqual([true, false, true]);
});

test("지우개는 칠한 곳만 원본으로 되돌리고, 나중에 가려질 픽셀은 건드리지 않는다", () => {
  const erase: EditStep = { region: row4(0, 3), effect: "erase", mask: maskOf(0, 0, ["##."]) };
  const laterRedact: EditStep = { region: row4(1, 1), effect: "redact" };
  const coverage = computeCoverage([erase, laterRedact]);

  const pixels = solid(3, 1, 200);
  restoreErased(pixels, solid(3, 1, 10), erase, coverage);
  expect([...pixels]).toEqual([10, 10, 10, 10, 200, 200, 200, 200, 200, 200, 200, 200]);
});

test("덮어야 하는 픽셀만 불투명 검정으로 칠한다", () => {
  const coverage = computeCoverage([{ region: row4(1, 1), effect: "redact" }])!;
  const pixels = solid(3, 1, 90);
  blackenCovered(pixels, row4(0, 3), coverage);
  expect([...pixels]).toEqual([90, 90, 90, 90, 0, 0, 0, 255, 90, 90, 90, 90]);
});

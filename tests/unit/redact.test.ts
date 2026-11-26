import { expect, test, vi } from "vitest";
import { applyRedaction } from "../../src/lib/canvas/redact";

test("가림 경계를 불투명 검정으로 채운다", () => {
  const context = { fillStyle: "transparent", fillRect: vi.fn() };
  applyRedaction(context as unknown as CanvasRenderingContext2D, {
    x: 1, y: 0, width: 1, height: 2,
  });

  expect(context.fillStyle).toBe("#000");
  expect(context.fillRect).toHaveBeenCalledExactlyOnceWith(1, 0, 1, 2);
});

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { test } from "node:test";
import config from "../next.config.mjs";

test("서비스 이름과 정적 내보내기 설정을 확인한다", async () => {
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  assert.equal(pkg.name, "pixelcover");
  assert.equal(config.output, "export");
});

test("README에서 협업 문서로 이동할 수 있다", async () => {
  const readme = await readFile("README.md", "utf8");
  assert.match(readme, /^# PixelCover\r?\n/);
  for (const path of ["AGENTS.md", "docs/PROJECT_PLAN.md", "docs/API_CONTRACT.md"]) {
    assert.ok(readme.includes(`](${path})`));
    await access(path);
  }
});

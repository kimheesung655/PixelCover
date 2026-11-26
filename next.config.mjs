/** @type {import("next").NextConfig} */
export default {
  // 서버 없이 정적 호스팅(Cloudflare Pages)에 올린다. `npm run build` 결과는 out/ 폴더.
  output: "export",
  // AI 도구로 `next dev`를 실행할 때 팀 AGENTS.md에 Next.js 안내 문구가 자동으로 끼워지는 것을 막는다.
  agentRules: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

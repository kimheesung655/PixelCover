# PixelCover

사진이나 스크린샷에서 선택한 영역에 모자이크, 블러, 불투명 가림을 적용하는 브라우저용 이미지 편집 프로젝트다. 이미지는 기기에서 처리하며, MVP에는 로그인이나 업로드 서버가 없다.

Node.js 24에서 개발 환경을 확인한다.

```sh
npm ci
npm run check:setup
npm test
npm run typecheck
```

`check:setup`은 패키지, 정적 내보내기 설정 및 문서 연결을 검사한다. `test`는 `tests/unit`의 TypeScript 단위 테스트를 실행하고, `typecheck`는 TypeScript 소스와 테스트의 타입을 검사한다.

브라우저 통합 테스트는 `npx playwright install chromium`으로 브라우저를 설치한 뒤 `npm run test:e2e`로 실행한다.

- [협업 규칙](AGENTS.md)
- [담당 영역과 개발 계획](docs/PROJECT_PLAN.md)
- [엔진 연동 계약 초안](docs/API_CONTRACT.md)

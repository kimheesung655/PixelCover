# 이미지 처리 엔진

브라우저 코드에서 `src/lib/editor`의 진입점을 가져온다. 편집 영역은 EXIF 방향을 보정한 원본의 픽셀 좌표를 사용한다.

```ts
import { decodeImage, exportImage, renderImage, type EditRegion } from "./src/lib/editor";

async function renderAndExport(
  file: File,
  regions: readonly EditRegion[],
  preview: CanvasRenderingContext2D,
): Promise<Blob> {
  const bitmap = await decodeImage(file);
  try {
    renderImage(bitmap, regions, preview);
    return await exportImage(bitmap, regions, "image/png");
  } finally {
    bitmap.close();
  }
}
```

같은 이미지를 반복 편집할 때는 비트맵을 재사용한다. 이미지 교체나 화면 종료 시 진행 중인 내보내기가 끝난 뒤 비트맵을 해제한다. 입력 메타데이터만 필요한 경우에는 `validateImage`가 임시 비트맵을 해제한 뒤 파일명, 형식, 크기, 보정된 치수를 반환한다. Blob URL을 만든 호출자가 사용 후 해제한다.

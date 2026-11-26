# PixelCover 이미지 처리 계약 초안

프론트엔드 검토용 제안이다. 아래 선언의 구현은 후속 단계에서 제공한다. 브라우저의 클라이언트 코드에서 호출한다.

```ts
type EffectType = "mosaic" | "blur" | "redact";
type InputMime = "image/png" | "image/jpeg" | "image/webp";
type OutputMime = "image/png" | "image/jpeg";
interface ImageInfo {
  width: number;
  height: number;
  fileName: string;
  mimeType: InputMime;
  fileSize: number;
}
interface EditRegion {
  id: string;
  type: EffectType;
  x: number;
  y: number;
  width: number;
  height: number;
  intensity: number;
}
declare function validateImage(file: File): Promise<ImageInfo>;
declare function decodeImage(file: File): Promise<ImageBitmap>;
declare function normalizeRegion(region: EditRegion, imageWidth: number, imageHeight: number): EditRegion;
declare function renderImage(image: ImageBitmap, regions: readonly EditRegion[], target: CanvasRenderingContext2D): void;
declare function exportImage(image: ImageBitmap, regions: readonly EditRegion[], format: OutputMime, quality?: number): Promise<Blob>;
```

- 입력 상한 제안은 20,000,000바이트, 한 변 8,192픽셀, 총 16,000,000픽셀이다. 상한과 같은 값은 허용한다. 실제 형식과 디코딩을 검사한 뒤 EXIF 방향을 반영한 치수를 반환한다. 검증 과정의 임시 비트맵은 엔진이 해제한다. decodeImage도 단독 호출 시 동일하게 검사한다.
- decodeImage 결과는 호출자가 소유한다. 이미지 교체나 화면 종료 시 진행 중인 내보내기가 끝난 뒤 close()를 호출한다.
- 좌표는 방향 보정된 이미지의 왼쪽 위가 원점인 픽셀 단위다. 표시된 이미지 사각형의 왼쪽·위쪽을 포인터 위치에서 빼고 각 축에 원본 길이/표시 길이를 곱한다. 여백은 표시 길이에서 제외한다.
- normalizeRegion은 역방향 드래그의 양 끝을 정렬하고 시작점을 내림, 끝점을 올림한 뒤 경계로 자른 새 영역을 반환한다. 끝 좌표는 제외한다. 면적 0, 비유한 수, 빈 ID는 오류다.
- 모자이크·블러 강도는 정수 1~100이며 값이 클수록 효과가 강하다. 불투명 가림은 강도를 무시하고 불투명 검정으로 덮는다. 중복 ID는 거부한다. 일반 효과는 배열 순서로, 가림은 마지막에 그린다. 가려질 원본이 주변에 섞이지 않도록 효과를 계산하기 전에도 가림 픽셀을 덮는다.
- renderImage는 원본 크기의 전용 캔버스를 다시 그린다. 표시 배율은 CSS에서 조절한다. exportImage는 같은 렌더러로 새 캔버스에 평탄화한다. PNG는 투명도를 유지하고 JPEG는 흰 배경과 품질 0~1(기본값 0.92)을 사용한다. 원본 메타데이터를 복사하지 않는다. 다운로드용 객체 URL은 UI가 사용 후 해제한다.
- 오류는 Error를 확장한 ImageEditError의 code로 구분한다. 형식 오류 UNSUPPORTED_FORMAT, 용량 초과 FILE_TOO_LARGE, 치수 초과 IMAGE_TOO_LARGE, 디코딩 실패 DECODE_FAILED, 영역 오류 INVALID_REGION, 캔버스 오류 RENDER_FAILED, 인코딩·품질 오류 EXPORT_FAILED를 제안한다. 동기 함수는 예외를 던지고 비동기 함수는 같은 오류로 거부된다.

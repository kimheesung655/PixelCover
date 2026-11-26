import { ImageEditError } from "../../lib/editor";

/** 엔진 오류 코드를 사용자에게 보여줄 문장으로 바꾼다. */
export function toUserMessage(error: unknown): string {
  if (error instanceof ImageEditError) {
    switch (error.code) {
      case "UNSUPPORTED_FORMAT":
        return "JPG, PNG, WebP 이미지만 열 수 있어요.";
      case "FILE_TOO_LARGE":
        return "20MB 이하 이미지만 열 수 있어요.";
      case "IMAGE_TOO_LARGE":
        return "이미지가 너무 커요. 한 변 8,192px, 총 1,600만 픽셀 이하만 열 수 있어요.";
      case "DECODE_FAILED":
        return "이미지를 열 수 없어요. 파일이 손상되지 않았는지 확인해 주세요.";
      case "INVALID_REGION":
        return "선택 영역이 올바르지 않아요. 다시 드래그해 주세요.";
      case "RENDER_FAILED":
        return "이미지를 그리는 중 문제가 생겼어요. 다시 시도해 주세요.";
      case "EXPORT_FAILED":
        return "이미지를 저장하지 못했어요. 다시 시도해 주세요.";
    }
  }
  return "알 수 없는 문제가 생겼어요. 다시 시도해 주세요.";
}

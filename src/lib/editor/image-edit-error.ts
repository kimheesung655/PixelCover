export type ImageEditErrorCode =
  | "UNSUPPORTED_FORMAT"
  | "FILE_TOO_LARGE"
  | "IMAGE_TOO_LARGE"
  | "DECODE_FAILED"
  | "INVALID_REGION"
  | "RENDER_FAILED";

export class ImageEditError extends Error {
  constructor(readonly code: ImageEditErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ImageEditError";
  }
}

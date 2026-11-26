export type ImageEditErrorCode = "UNSUPPORTED_FORMAT" | "FILE_TOO_LARGE";

export class ImageEditError extends Error {
  constructor(readonly code: ImageEditErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ImageEditError";
  }
}

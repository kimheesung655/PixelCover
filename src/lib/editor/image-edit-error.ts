export type ImageEditErrorCode = "UNSUPPORTED_FORMAT";

export class ImageEditError extends Error {
  constructor(readonly code: ImageEditErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ImageEditError";
  }
}

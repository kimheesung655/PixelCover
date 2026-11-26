import { ImageEditError } from "./image-edit-error";
import { normalizeRegion, type EditRegion } from "./edit-region";

export class RegionEditor {
  private regions: EditRegion[] = [];

  constructor(private readonly imageWidth: number, private readonly imageHeight: number) {}

  getRegions(): EditRegion[] {
    return this.regions.map((region) => ({ ...region }));
  }

  add(region: EditRegion): void {
    const normalized = normalizeRegion(region, this.imageWidth, this.imageHeight);
    if (this.regions.some(({ id }) => id === normalized.id)) {
      throw new ImageEditError("INVALID_REGION", "같은 ID의 편집 영역이 이미 있습니다.");
    }
    this.regions = [...this.regions, normalized];
  }
}

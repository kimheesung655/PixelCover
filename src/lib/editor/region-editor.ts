import { ImageEditError } from "./image-edit-error";
import { normalizeRegion, type EditRegion } from "./edit-region";

const MAX_HISTORY_ENTRIES = 50;

export class RegionEditor {
  private regions: EditRegion[] = [];
  private past: EditRegion[][] = [];
  private future: EditRegion[][] = [];

  constructor(private readonly imageWidth: number, private readonly imageHeight: number) {}

  getRegions(): EditRegion[] {
    return this.regions.map((region) => ({ ...region }));
  }

  add(region: EditRegion): void {
    const normalized = normalizeRegion(region, this.imageWidth, this.imageHeight);
    if (this.regions.some(({ id }) => id === normalized.id)) {
      throw new ImageEditError("INVALID_REGION", "같은 ID의 편집 영역이 이미 있습니다.");
    }
    this.record([...this.regions, normalized]);
  }

  update(id: string, changes: Partial<Omit<EditRegion, "id">>): void {
    const index = this.findIndex(id);
    const current = this.regions[index];
    const next = normalizeRegion({ ...current, ...changes, id }, this.imageWidth, this.imageHeight);
    if (sameRegion(current, next)) return;

    this.record(this.regions.map((region, position) => position === index ? next : region));
  }

  remove(id: string): void {
    const index = this.findIndex(id);
    this.record(this.regions.filter((_region, position) => position !== index));
  }

  undo(): boolean {
    const previous = this.past.pop();
    if (!previous) return false;
    this.future.push(this.regions);
    this.regions = previous;
    return true;
  }

  redo(): boolean {
    const next = this.future.pop();
    if (!next) return false;
    this.past.push(this.regions);
    this.regions = next;
    return true;
  }

  private record(next: EditRegion[]): void {
    this.past.push(this.regions);
    if (this.past.length > MAX_HISTORY_ENTRIES) this.past.shift();
    this.regions = next;
    this.future = [];
  }

  private findIndex(id: string): number {
    const index = this.regions.findIndex((region) => region.id === id);
    if (index < 0) throw new ImageEditError("INVALID_REGION", "지정한 편집 영역을 찾을 수 없습니다.");
    return index;
  }
}

function sameRegion(left: EditRegion, right: EditRegion): boolean {
  return left.type === right.type && left.x === right.x && left.y === right.y &&
    left.width === right.width && left.height === right.height && Object.is(left.intensity, right.intensity);
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { decodeImage, type EditRegion, type EffectType } from "../lib/editor";
import { RegionEditor } from "../lib/editor/region-editor";
import { createExportFilename } from "../lib/image/export-filename";
import { rasterizeStroke, strokeBounds, type Area, type BrushStroke } from "../components/editor/brush-mask";
import { exportEdits, renderEdits, type EditOp } from "../components/editor/render-edits";

export type { Area, BrushStroke } from "../components/editor/brush-mask";

/** 화면에서 고르는 도구. 'erase'(지우개)는 적용한 효과를 지우고 원본으로 되돌린다. */
export type Tool = EffectType | "erase";

// RegionEditor가 보관하는 실행 취소 단계 수(MAX_HISTORY_ENTRIES)와 같게 맞춘다.
const MAX_UNDO_STEPS = 50;

export type LoadedImage = {
  bitmap: ImageBitmap;
  fileName: string;
  width: number;
  height: number;
};

/**
 * 이미지 처리 엔진(src/lib)과 화면 상태를 잇는다.
 * - 디코딩한 비트맵은 이 훅이 소유하고, 교체·제거·종료 시 진행 중인 내보내기가 끝난 뒤 닫는다.
 * - 편집 영역과 실행 취소 이력은 엔진의 RegionEditor가 관리한다(브러시 한 획, 지우개 한 획도 한 단계).
 * - 칠한 모양과 지우개 여부처럼 엔진이 아직 모르는 정보는 영역 ID별로 따로 보관한다.
 */
export function useImageEditor() {
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [regions, setRegions] = useState<EditRegion[]>([]);
  const [undoSteps, setUndoSteps] = useState(0);
  const [redoSteps, setRedoSteps] = useState(0);

  const imageRef = useRef<LoadedImage | null>(null);
  const editorRef = useRef<RegionEditor | null>(null);
  const opsRef = useRef(new Map<string, EditOp>());
  const loadIdRef = useRef(0);
  const regionSeqRef = useRef(0);
  const pendingExportsRef = useRef(new Set<Promise<unknown>>());

  const releaseBitmap = useCallback((bitmap: ImageBitmap) => {
    void Promise.allSettled([...pendingExportsRef.current]).then(() => bitmap.close());
  }, []);

  useEffect(() => {
    return () => {
      if (imageRef.current) releaseBitmap(imageRef.current.bitmap);
    };
  }, [releaseBitmap]);

  const resetEdits = useCallback((next: LoadedImage | null) => {
    editorRef.current = next ? new RegionEditor(next.width, next.height) : null;
    opsRef.current = new Map();
    setRegions([]);
    setUndoSteps(0);
    setRedoSteps(0);
  }, []);

  /** 새 이미지를 연다. 검증·디코딩 오류는 ImageEditError로 던진다. 더 나중 요청에 밀려 버려졌으면 false. */
  const loadFile = useCallback(
    async (file: File): Promise<boolean> => {
      const loadId = ++loadIdRef.current;
      const bitmap = await decodeImage(file);
      if (loadId !== loadIdRef.current) {
        bitmap.close();
        return false;
      }

      const previous = imageRef.current;
      const next: LoadedImage = { bitmap, fileName: file.name, width: bitmap.width, height: bitmap.height };
      imageRef.current = next;
      resetEdits(next);
      setImage(next);
      if (previous) releaseBitmap(previous.bitmap);
      return true;
    },
    [releaseBitmap, resetEdits],
  );

  /** 현재 이미지를 내려놓고 처음 화면으로 돌아간다. 열리는 중인 이미지도 버린다. */
  const clearImage = useCallback(() => {
    loadIdRef.current += 1;
    const previous = imageRef.current;
    imageRef.current = null;
    resetEdits(null);
    setImage(null);
    if (previous) releaseBitmap(previous.bitmap);
  }, [releaseBitmap, resetEdits]);

  const nextRegionId = () => {
    regionSeqRef.current += 1;
    return `region-${regionSeqRef.current}`;
  };

  /** 영역 하나를 이력에 추가한다. 지우개는 엔진에 'redact'로 넣고 프론트 정보로 지우개임을 표시한다. */
  const record = useCallback((area: Area, tool: Tool, intensity: number, op: EditOp | undefined) => {
    const editor = editorRef.current;
    if (!editor) return;
    const id = nextRegionId();
    const type: EffectType = tool === "erase" ? "redact" : tool;
    editor.add({ id, type, intensity: tool === "erase" ? 1 : Math.round(intensity), ...area });
    if (op) opsRef.current.set(id, op);
    setRegions(editor.getRegions());
    setUndoSteps((steps) => Math.min(steps + 1, MAX_UNDO_STEPS));
    setRedoSteps(0);
  }, []);

  /** 사각형 영역에 효과를 적용하거나(지우개면) 되돌린다. */
  const addRegion = useCallback(
    (area: Area, tool: Tool, intensity: number) => {
      record(area, tool, intensity, tool === "erase" ? { erase: true } : undefined);
    },
    [record],
  );

  /** 브러시로 칠한 한 획에 효과를 적용하거나(지우개면) 되돌린다. */
  const addBrushStroke = useCallback(
    (stroke: BrushStroke, tool: Tool, intensity: number) => {
      const current = imageRef.current;
      if (!current) return;
      const area = strokeBounds(stroke, current.width, current.height);
      const mask = rasterizeStroke(stroke, area);
      record(area, tool, intensity, { erase: tool === "erase", mask });
    },
    [record],
  );

  const undo = useCallback((): boolean => {
    const editor = editorRef.current;
    if (!editor?.undo()) return false;
    setRegions(editor.getRegions());
    setUndoSteps((steps) => Math.max(0, steps - 1));
    setRedoSteps((steps) => steps + 1);
    return true;
  }, []);

  const redo = useCallback((): boolean => {
    const editor = editorRef.current;
    if (!editor?.redo()) return false;
    setRegions(editor.getRegions());
    setUndoSteps((steps) => steps + 1);
    setRedoSteps((steps) => Math.max(0, steps - 1));
    return true;
  }, []);

  /** 적용한 효과를 모두 지우고 원본 상태로 돌아간다(이력도 비운다). */
  const reset = useCallback(() => {
    if (imageRef.current) resetEdits(imageRef.current);
  }, [resetEdits]);

  /** 현재 편집 상태를 원본 크기 캔버스에 그린다. 화면 표시 크기는 CSS가 줄인다. */
  const renderPreview = useCallback(
    (context: CanvasRenderingContext2D) => {
      if (!image) return;
      renderEdits(image.bitmap, regions, opsRef.current, context);
    },
    [image, regions],
  );

  /** 현재 편집 결과를 원본 해상도 PNG로 만든다. 원본 메타데이터는 포함되지 않는다. */
  const exportPng = useCallback(async (): Promise<{ blob: Blob; fileName: string } | null> => {
    const current = imageRef.current;
    const editor = editorRef.current;
    if (!current || !editor) return null;

    const task = exportEdits(current.bitmap, editor.getRegions(), opsRef.current);
    pendingExportsRef.current.add(task);
    try {
      const blob = await task;
      return { blob, fileName: createExportFilename(current.fileName, "image/png") };
    } finally {
      pendingExportsRef.current.delete(task);
    }
  }, []);

  return {
    image,
    regions,
    hasEffects: regions.length > 0,
    canUndo: undoSteps > 0,
    canRedo: redoSteps > 0,
    loadFile,
    clearImage,
    addRegion,
    addBrushStroke,
    undo,
    redo,
    reset,
    renderPreview,
    exportPng,
  };
}

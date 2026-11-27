"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import {
  ArrowDownToLine,
  Brush,
  CircleHelp,
  CloudUpload,
  Copy,
  Eraser,
  EyeOff,
  Image as ImageIcon,
  Info,
  Layers3,
  MousePointer2,
  Redo2,
  RotateCcw,
  Sparkles,
  SquareDashed,
  Undo2,
  WandSparkles,
  X,
} from "lucide-react";
import { toImageCoordinates } from "../../lib/editor/image-coordinates";
import { useImageEditor, type Area, type BrushStroke, type Tool } from "../../hooks/useImageEditor";
import { toUserMessage } from "./messages";

const TOOLS: { label: string; key: Tool; icon: typeof Layers3 }[] = [
  { label: "모자이크", key: "mosaic", icon: Layers3 },
  { label: "블러", key: "blur", icon: WandSparkles },
  { label: "가리기", key: "redact", icon: EyeOff },
  { label: "지우개", key: "erase", icon: Eraser },
];

type SelectMode = "brush" | "rect";

const ACCEPT = "image/jpeg,image/png,image/webp";
// 이보다 작은 드래그(원본 픽셀 기준)는 클릭으로 보고 선택하지 않는다.
const MIN_SELECTION = 4;
const COPY_LABEL = "복사";
// 브러시 크기는 화면에 보이는 지름(CSS px)으로 고르고, 칠할 때 원본 픽셀 크기로 바꾼다.
const BRUSH_MIN = 8;
const BRUSH_MAX = 120;
const BRUSH_DEFAULT = 36;

type ActiveStroke = { stroke: BrushStroke; minStep: number; path: string };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function appliedMessage(tool: Tool): string {
  if (tool === "erase") return "지운 부분을 원래 이미지로 되돌렸어요.";
  return `${TOOLS.find(({ key }) => key === tool)?.label ?? tool} 처리가 적용됐어요.`;
}

function formatCoord(value: number): string {
  return String(Math.round(value * 10) / 10);
}

function getSelectionStyle(selection: Area, imageWidth: number, imageHeight: number): CSSProperties {
  return {
    left: `${(selection.x / imageWidth) * 100}%`,
    top: `${(selection.y / imageHeight) * 100}%`,
    width: `${(selection.width / imageWidth) * 100}%`,
    height: `${(selection.height / imageHeight) * 100}%`,
  };
}

function guideText(mode: SelectMode, tool: Tool, hasSelection: boolean): string {
  if (mode === "brush") {
    return tool === "erase"
      ? "효과를 준 곳을 칠하면 그 부분만 원래 이미지로 돌아가요."
      : "가릴 부분을 칠하면 손을 뗄 때 바로 적용돼요.";
  }
  if (hasSelection) {
    return tool === "erase"
      ? "선택한 영역을 원래대로 되돌리려면 아래 버튼을 눌러주세요."
      : "선택한 영역에 효과를 적용하려면 아래 버튼을 눌러주세요.";
  }
  return tool === "erase" ? "원래대로 되돌릴 영역을 드래그해 주세요." : "가리고 싶은 영역을 드래그해 주세요.";
}

export function Editor() {
  const {
    image,
    hasEffects,
    canUndo,
    canRedo,
    loadFile,
    clearImage,
    addRegion,
    addBrushStroke,
    undo,
    redo,
    reset,
    renderPreview,
    exportPng,
  } = useImageEditor();

  const [tool, setTool] = useState<Tool>("mosaic");
  const [selectMode, setSelectMode] = useState<SelectMode>("brush");
  const [intensity, setIntensity] = useState(40);
  const [brushSize, setBrushSize] = useState(BRUSH_DEFAULT);
  const [selection, setSelection] = useState<Area | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [status, setStatus] = useState({ text: "작업을 시작하려면 이미지를 추가하세요", error: false });
  const [copyLabel, setCopyLabel] = useState(COPY_LABEL);
  const [shortcutLabel, setShortcutLabel] = useState("Ctrl O");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const strokeRef = useRef<ActiveStroke | null>(null);
  const strokePathRef = useRef<SVGPathElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  const showStatus = useCallback((text: string, error = false) => setStatus({ text, error }), []);

  const clearStrokePreview = useCallback(() => {
    strokePathRef.current?.setAttribute("d", "");
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      showStatus("이미지를 여는 중이에요…");
      try {
        const loaded = await loadFile(file);
        if (!loaded) return;
        setSelection(null);
        showStatus(selectMode === "brush" ? "가릴 부분을 마우스로 칠해 보세요" : "영역을 드래그해 편집을 시작하세요");
      } catch (error) {
        showStatus(toUserMessage(error), true);
      }
    },
    [loadFile, showStatus, selectMode],
  );

  const handleUndo = useCallback(() => {
    if (!undo()) return;
    setSelection(null);
    showStatus("이전 작업으로 되돌렸어요.");
  }, [undo, showStatus]);

  const handleRedo = useCallback(() => {
    if (!redo()) return;
    setSelection(null);
    showStatus("작업을 다시 적용했어요.");
  }, [redo, showStatus]);

  // 엔진 렌더러로 원본 크기 캔버스를 다시 그린다. 화면 표시 크기는 CSS가 줄인다.
  useEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (!image || !context) return;
    try {
      renderPreview(context);
    } catch (error) {
      showStatus(toUserMessage(error), true);
    }
    // 방금 칠한 획의 미리보기 선은 실제 결과가 그려진 뒤에 지운다.
    clearStrokePreview();
  }, [image, renderPreview, showStatus, clearStrokePreview]);

  // Ctrl+V 붙여넣기, 페이지 어디에 놓아도 열리는 드래그 앤 드롭, Ctrl/⌘+O 파일 열기, Ctrl/⌘+Z 실행 취소
  useEffect(() => {
    let dragDepth = 0;
    const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes("Files");

    function handlePaste(event: ClipboardEvent) {
      const item = Array.from(event.clipboardData?.items ?? []).find((entry) => entry.type.startsWith("image/"));
      const file = item?.getAsFile();
      if (!file) return;
      event.preventDefault();
      void handleFile(file);
    }
    function handleDragEnter(event: DragEvent) {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepth += 1;
      setIsDragging(true);
    }
    function handleDragOver(event: DragEvent) {
      if (!hasFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    }
    function handleDragLeave(event: DragEvent) {
      if (!hasFiles(event)) return;
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) setIsDragging(false);
    }
    function handleDrop(event: DragEvent) {
      if (!hasFiles(event)) return;
      // 막지 않으면 브라우저가 이미지 파일을 열면서 페이지를 떠난다.
      event.preventDefault();
      dragDepth = 0;
      setIsDragging(false);
      const file = event.dataTransfer?.files[0];
      if (file) void handleFile(file);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "o") {
        event.preventDefault();
        fileInputRef.current?.click();
      } else if (key === "z" || key === "y") {
        const target = event.target as HTMLElement | null;
        const typing =
          target?.isContentEditable ||
          target?.tagName === "TEXTAREA" ||
          (target?.tagName === "INPUT" && (target as HTMLInputElement).type === "text");
        if (typing) return;
        event.preventDefault();
        if (key === "y" || event.shiftKey) handleRedo();
        else handleUndo();
      }
    }

    document.addEventListener("paste", handlePaste);
    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("paste", handlePaste);
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleFile, handleUndo, handleRedo]);

  useEffect(() => {
    // 서버에서 만든 HTML과 어긋나지 않도록 마운트 후에 운영체제별 단축키 표시를 바꾼다.
    const platform = navigator.platform || navigator.userAgent;
    if (/Mac|iPhone|iPad/i.test(platform)) setShortcutLabel("⌘ O");
  }, []);

  function toImagePoint(canvas: HTMLCanvasElement, clientX: number, clientY: number): { x: number; y: number } | null {
    if (!image) return null;
    try {
      const point = toImageCoordinates({ x: clientX, y: clientY }, canvas.getBoundingClientRect(), image.width, image.height);
      return { x: clamp(point.x, 0, image.width), y: clamp(point.y, 0, image.height) };
    } catch {
      return null;
    }
  }

  function isSecondaryMouseButton(event: ReactPointerEvent<HTMLCanvasElement>): boolean {
    return event.pointerType === "mouse" && event.button !== 0;
  }

  /** 지우개는 지울 효과가 있을 때만 쓴다. */
  function canUseTool(): boolean {
    if (tool === "erase" && !hasEffects) {
      showStatus("아직 지울 효과가 없어요. 먼저 모자이크·블러·가리기를 적용해 주세요.");
      return false;
    }
    return true;
  }

  // ── 브러시 커서 ──
  function updateCursor(event: ReactPointerEvent<HTMLCanvasElement>) {
    const cursor = cursorRef.current;
    if (!cursor) return;
    if (selectMode !== "brush" || event.pointerType === "touch") {
      cursor.style.display = "none";
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    cursor.style.display = "block";
    cursor.style.width = `${brushSize}px`;
    cursor.style.height = `${brushSize}px`;
    cursor.style.left = `${event.clientX - rect.left}px`;
    cursor.style.top = `${event.clientY - rect.top}px`;
  }

  function hideCursor() {
    if (cursorRef.current) cursorRef.current.style.display = "none";
  }

  // ── 브러시 모드: 누른 채로 움직인 길을 따라 칠하고, 손을 떼면 그 획을 적용한다 ──
  function startStroke(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const point = toImagePoint(canvas, event.clientX, event.clientY);
    if (!image || !point || rect.width === 0 || !canUseTool()) return;

    canvas.setPointerCapture(event.pointerId);
    const imagePxPerCssPx = image.width / rect.width;
    const size = Math.max(1, Math.round(brushSize * imagePxPerCssPx));
    // 길이가 0인 선도 둥근 끝 덕분에 점으로 보인다(한 번 클릭한 경우).
    const path = `M${formatCoord(point.x)} ${formatCoord(point.y)} L${formatCoord(point.x)} ${formatCoord(point.y)}`;
    strokeRef.current = { stroke: { points: [point.x, point.y], size }, minStep: imagePxPerCssPx, path };
    const preview = strokePathRef.current;
    if (preview) {
      preview.setAttribute("stroke-width", String(size));
      preview.setAttribute("d", path);
    }
  }

  function continueStroke(event: ReactPointerEvent<HTMLCanvasElement>) {
    const active = strokeRef.current;
    if (!active) return;
    const canvas = event.currentTarget;
    const native = event.nativeEvent;
    const coalesced = typeof native.getCoalescedEvents === "function" ? native.getCoalescedEvents() : [];
    const samples = coalesced.length > 0 ? coalesced : [native];

    const { points } = active.stroke;
    for (const sample of samples) {
      const point = toImagePoint(canvas, sample.clientX, sample.clientY);
      if (!point) continue;
      const lastX = points[points.length - 2];
      const lastY = points[points.length - 1];
      // 화면 1px보다 짧은 이동은 건너뛰어 점 개수를 줄인다.
      if (Math.hypot(point.x - lastX, point.y - lastY) < active.minStep) continue;
      points.push(point.x, point.y);
      active.path += ` L${formatCoord(point.x)} ${formatCoord(point.y)}`;
    }
    strokePathRef.current?.setAttribute("d", active.path);
  }

  function finishStroke(event: ReactPointerEvent<HTMLCanvasElement>, commit: boolean) {
    const active = strokeRef.current;
    if (!active) return;
    strokeRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!commit) {
      clearStrokePreview();
      return;
    }
    try {
      addBrushStroke(active.stroke, tool, intensity);
      showStatus(appliedMessage(tool));
    } catch (error) {
      clearStrokePreview();
      showStatus(toUserMessage(error), true);
    }
  }

  // ── 사각형 모드: 드래그로 영역을 잡고 '선택 영역 적용'을 누른다 ──
  function startSelection(event: ReactPointerEvent<HTMLCanvasElement>) {
    const point = toImagePoint(event.currentTarget, event.clientX, event.clientY);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = point;
    setSelection({ x: point.x, y: point.y, width: 0, height: 0 });
    setIsDrawing(true);
  }

  function moveSelection(event: ReactPointerEvent<HTMLCanvasElement>) {
    const start = dragStartRef.current;
    if (!isDrawing || !start) return;
    const point = toImagePoint(event.currentTarget, event.clientX, event.clientY);
    if (!point) return;
    setSelection({
      x: Math.min(start.x, point.x),
      y: Math.min(start.y, point.y),
      width: Math.abs(point.x - start.x),
      height: Math.abs(point.y - start.y),
    });
  }

  function endSelection(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    setIsDrawing(false);
    dragStartRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setSelection((current) =>
      current && current.width >= MIN_SELECTION && current.height >= MIN_SELECTION ? current : null,
    );
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (isSecondaryMouseButton(event)) return;
    if (selectMode === "brush") startStroke(event);
    else startSelection(event);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    updateCursor(event);
    if (selectMode === "brush") continueStroke(event);
    else moveSelection(event);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (selectMode === "brush") finishStroke(event, true);
    else endSelection(event);
  }

  function handlePointerCancel(event: ReactPointerEvent<HTMLCanvasElement>) {
    // 시스템 제스처 등으로 끊긴 획은 적용하지 않는다.
    if (selectMode === "brush") finishStroke(event, false);
    else endSelection(event);
  }

  function changeSelectMode(mode: SelectMode) {
    setSelectMode(mode);
    setSelection(null);
    hideCursor();
  }

  function applySelection() {
    if (!selection || selection.width < MIN_SELECTION || selection.height < MIN_SELECTION) {
      showStatus("먼저 이미지에서 영역을 드래그해 주세요.");
      return;
    }
    if (!canUseTool()) return;
    try {
      addRegion(selection, tool, intensity);
      setSelection(null);
      showStatus(appliedMessage(tool));
    } catch (error) {
      showStatus(toUserMessage(error), true);
    }
  }

  function handleReset() {
    reset();
    setSelection(null);
    showStatus("원본 이미지로 초기화했어요.");
  }

  function handleRemoveImage() {
    if (hasEffects && !window.confirm("적용한 편집이 모두 사라져요. 현재 이미지를 제거할까요?")) return;
    strokeRef.current = null;
    clearStrokePreview();
    hideCursor();
    setSelection(null);
    setIsDrawing(false);
    clearImage();
    showStatus("이미지를 제거했어요. 새 이미지를 추가하세요.");
  }

  async function handleDownload() {
    if (!image) {
      showStatus("먼저 이미지를 추가해 주세요.");
      return;
    }
    try {
      const result = await exportPng();
      if (!result) return;
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.fileName;
      document.body.append(link);
      link.click();
      link.remove();
      // 다운로드가 시작될 시간을 준 뒤 객체 URL을 해제한다.
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
      showStatus("편집한 이미지를 다운로드했어요.");
    } catch (error) {
      showStatus(toUserMessage(error), true);
    }
  }

  async function handleCopy() {
    const flash = (label: string) => {
      setCopyLabel(label);
      window.setTimeout(() => setCopyLabel(COPY_LABEL), 2200);
    };
    if (!image) {
      showStatus("먼저 이미지를 추가해 주세요.");
      return;
    }
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
      flash("지원 안 됨");
      showStatus("이 브라우저에서는 이미지 복사를 지원하지 않아요. 다운로드를 이용해 주세요.", true);
      return;
    }
    try {
      // Safari는 클릭 직후 바로 write를 호출해야 해서 Blob 대신 Promise를 넘긴다.
      const blob = exportPng().then((result) => {
        if (!result) throw new Error("no image");
        return result.blob;
      });
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      flash("복사 완료");
      showStatus("이미지를 클립보드에 복사했어요.");
    } catch {
      flash("복사 실패");
      showStatus("브라우저의 클립보드 권한을 확인해 주세요.", true);
    }
  }

  const isBrush = selectMode === "brush";
  const isErase = tool === "erase";
  const usesIntensity = tool === "mosaic" || tool === "blur";

  return (
    <section className="workspace-card" id="editor" aria-label="이미지 편집 영역">
      <div className="workspace-topbar">
        <div className="workspace-title">
          <span className="status-dot" />
          <div>
            <strong>{image?.fileName || "새 이미지 편집"}</strong>
            <small className={status.error ? "is-error" : undefined} role="status">
              {status.text}
            </small>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="icon-button" type="button" aria-label="실행 취소" title="실행 취소 (Ctrl+Z)" onClick={handleUndo} disabled={!canUndo}>
            <Undo2 size={17} />
          </button>
          <button className="icon-button" type="button" aria-label="다시 실행" title="다시 실행 (Ctrl+Shift+Z)" onClick={handleRedo} disabled={!canRedo}>
            <Redo2 size={17} />
          </button>
          <span className="topbar-divider" />
          <button className="reset-button" type="button" onClick={handleReset} disabled={!hasEffects}>
            <RotateCcw size={15} /> 초기화
          </button>
        </div>
      </div>

      <div className="editor-layout">
        <div className="canvas-panel">
          <div className="canvas-toolbar">
            <div className="canvas-meta">
              <span className="live-dot" /> {image ? `${image.width} × ${image.height}px` : "미리보기"}{" "}
              <span className="meta-divider">/</span> 원본 해상도 유지
            </div>
            {image && (
              <button className="remove-image-button" type="button" onClick={handleRemoveImage}>
                <X size={13} /> 이미지 제거
              </button>
            )}
          </div>
          <div className={`canvas-area ${image ? "has-image" : ""} ${isDragging ? "is-dragging" : ""}`}>
            <input
              ref={fileInputRef}
              className="file-input"
              type="file"
              accept={ACCEPT}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void handleFile(file);
              }}
            />
            {image ? (
              <div className={`canvas-stage ${isBrush ? "is-brush" : ""}`}>
                <canvas
                  ref={canvasRef}
                  aria-label={`편집 중인 이미지: ${image.fileName}`}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerCancel}
                  onPointerEnter={updateCursor}
                  onPointerLeave={hideCursor}
                />
                {/* 칠하는 동안 보여주는 획 미리보기. 손을 떼면 실제 결과로 바뀐다. */}
                <svg
                  className={`brush-preview ${isErase ? "is-erase" : ""}`}
                  viewBox={`0 0 ${image.width} ${image.height}`}
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path ref={strokePathRef} />
                </svg>
                <div ref={cursorRef} className="brush-cursor" aria-hidden="true" />
                {selection && (
                  <div className="selection-box" style={getSelectionStyle(selection, image.width, image.height)}>
                    <span>영역 선택됨</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="upload-placeholder">
                <div className="upload-icon-wrap">
                  <CloudUpload size={30} strokeWidth={1.6} />
                </div>
                <h2>이미지를 여기에 놓으세요</h2>
                <p>또는 파일을 선택해서 업로드하세요</p>
                <button className="upload-button" type="button" onClick={() => fileInputRef.current?.click()}>
                  <ImageIcon size={17} /> 이미지 선택 <span>{shortcutLabel}</span>
                </button>
                <div className="upload-hint">
                  <MousePointer2 size={14} /> 드래그 앤 드롭 또는 Ctrl + V 붙여넣기
                </div>
              </div>
            )}
            <div className="canvas-corner canvas-corner-tl" />
            <div className="canvas-corner canvas-corner-tr" />
            <div className="canvas-corner canvas-corner-bl" />
            <div className="canvas-corner canvas-corner-br" />
          </div>
        </div>

        <aside className="tools-panel">
          <div className="tools-heading">
            <div>
              <span>EDIT TOOLS</span>
              <h2>편집 도구</h2>
            </div>
            <button
              type="button"
              className={`help-button ${showHelp ? "is-open" : ""}`}
              aria-label="편집 도구 사용법"
              aria-expanded={showHelp}
              aria-controls="editor-help"
              onClick={() => setShowHelp((open) => !open)}
            >
              <CircleHelp size={17} />
            </button>
          </div>
          {showHelp && (
            <div className="help-box" id="editor-help">
              <p><strong>브러시</strong> 누른 채로 칠하면 손을 뗄 때 바로 적용돼요.</p>
              <p><strong>사각형</strong> 드래그한 뒤 &apos;선택 영역 적용&apos;을 누르세요.</p>
              <p><strong>지우개</strong> 효과를 준 곳을 칠하면 원래대로 돌아가요.</p>
              <p><strong>단축키</strong> Ctrl+Z 실행 취소 · Ctrl+Shift+Z 다시 실행</p>
            </div>
          )}
          <div className="tool-list" role="radiogroup" aria-label="편집 도구">
            {TOOLS.map(({ label, key, icon: Icon }) => (
              <button
                className={`tool-button ${tool === key ? "is-active" : ""}`}
                type="button"
                role="radio"
                aria-checked={tool === key}
                key={key}
                onClick={() => setTool(key)}
              >
                <span className="tool-icon">
                  <Icon size={16} />
                </span>
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="mode-block">
            <div className="settings-label">
              <span>영역 지정</span>
            </div>
            <div className="mode-switch" role="radiogroup" aria-label="영역 지정 방식">
              <button
                className={`mode-button ${isBrush ? "is-active" : ""}`}
                type="button"
                role="radio"
                aria-checked={isBrush}
                onClick={() => changeSelectMode("brush")}
              >
                <Brush size={14} /> 브러시
              </button>
              <button
                className={`mode-button ${!isBrush ? "is-active" : ""}`}
                type="button"
                role="radio"
                aria-checked={!isBrush}
                onClick={() => changeSelectMode("rect")}
              >
                <SquareDashed size={14} /> 사각형
              </button>
            </div>
          </div>
          <div className="settings-block">
            <div className="range-group">
              <div className="settings-label">
                <span>강도</span>
                <strong>{tool === "redact" ? "완전 가림" : isErase ? "원본 복원" : `${intensity}%`}</strong>
              </div>
              <input
                className="intensity-range"
                type="range"
                min="10"
                max="100"
                value={intensity}
                disabled={!usesIntensity}
                onChange={(event) => setIntensity(Number(event.target.value))}
                aria-label="효과 강도"
              />
            </div>
            {isBrush && (
              <div className="range-group">
                <div className="settings-label">
                  <span>브러시 크기</span>
                  <strong>{brushSize}px</strong>
                </div>
                <input
                  className="intensity-range"
                  type="range"
                  min={BRUSH_MIN}
                  max={BRUSH_MAX}
                  value={brushSize}
                  onChange={(event) => setBrushSize(Number(event.target.value))}
                  aria-label="브러시 크기"
                />
              </div>
            )}
          </div>
          <div className="selection-note">
            <Info size={15} />
            <span>{guideText(selectMode, tool, selection !== null)}</span>
          </div>
          {!isBrush && (
            <button className="apply-button" type="button" onClick={applySelection} disabled={!selection}>
              <Sparkles size={16} /> {isErase ? "선택 영역 지우기" : "선택 영역 적용"}
            </button>
          )}
          <div className="output-actions">
            <button className="download-button" type="button" onClick={() => void handleDownload()}>
              <ArrowDownToLine size={17} /> 다운로드
            </button>
            <button className="copy-button" type="button" onClick={() => void handleCopy()}>
              <Copy size={15} /> {copyLabel}
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}

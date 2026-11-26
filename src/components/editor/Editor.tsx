"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import {
  ArrowDownToLine,
  ChevronDown,
  CircleHelp,
  CloudUpload,
  Copy,
  Eraser,
  Image as ImageIcon,
  Info,
  Layers3,
  MousePointer2,
  Redo2,
  RotateCcw,
  Sparkles,
  Undo2,
  WandSparkles,
} from "lucide-react";
import { renderImage, type EffectType } from "../../lib/editor";
import { toImageCoordinates } from "../../lib/editor/image-coordinates";
import { useImageEditor, type Area } from "../../hooks/useImageEditor";
import { toUserMessage } from "./messages";

const TOOLS: { label: string; key: EffectType; icon: typeof Layers3 }[] = [
  { label: "모자이크", key: "mosaic", icon: Layers3 },
  { label: "블러", key: "blur", icon: WandSparkles },
  { label: "가리기", key: "redact", icon: Eraser },
];

const ACCEPT = "image/jpeg,image/png,image/webp";
// 이보다 작은 드래그(원본 픽셀 기준)는 클릭으로 보고 선택하지 않는다.
const MIN_SELECTION = 4;
const COPY_LABEL = "이미지 복사";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toolLabel(tool: EffectType): string {
  return TOOLS.find(({ key }) => key === tool)?.label ?? tool;
}

function getSelectionStyle(selection: Area, imageWidth: number, imageHeight: number): CSSProperties {
  return {
    left: `${(selection.x / imageWidth) * 100}%`,
    top: `${(selection.y / imageHeight) * 100}%`,
    width: `${(selection.width / imageWidth) * 100}%`,
    height: `${(selection.height / imageHeight) * 100}%`,
  };
}

export function Editor() {
  const { image, regions, canUndo, canRedo, loadFile, addRegion, undo, redo, reset, exportPng } = useImageEditor();

  const [selectedTool, setSelectedTool] = useState<EffectType>("mosaic");
  const [intensity, setIntensity] = useState(40);
  const [selection, setSelection] = useState<Area | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState({ text: "작업을 시작하려면 이미지를 추가하세요", error: false });
  const [copyLabel, setCopyLabel] = useState(COPY_LABEL);
  const [shortcutLabel, setShortcutLabel] = useState("Ctrl O");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const showStatus = useCallback((text: string, error = false) => setStatus({ text, error }), []);

  const handleFile = useCallback(
    async (file: File) => {
      showStatus("이미지를 여는 중이에요…");
      try {
        const loaded = await loadFile(file);
        if (!loaded) return;
        setSelection(null);
        showStatus("영역을 드래그해 편집을 시작하세요");
      } catch (error) {
        showStatus(toUserMessage(error), true);
      }
    },
    [loadFile, showStatus],
  );

  // 엔진 렌더러로 원본 크기 캔버스를 다시 그린다. 화면 표시 크기는 CSS가 줄인다.
  useEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (!image || !context) return;
    try {
      renderImage(image.bitmap, regions, context);
    } catch (error) {
      showStatus(toUserMessage(error), true);
    }
  }, [image, regions, showStatus]);

  // Ctrl+V 붙여넣기, 페이지 어디에 놓아도 열리는 드래그 앤 드롭, Ctrl/⌘+O 파일 열기
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
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "o") {
        event.preventDefault();
        fileInputRef.current?.click();
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
  }, [handleFile]);

  useEffect(() => {
    // 서버에서 만든 HTML과 어긋나지 않도록 마운트 후에 운영체제별 단축키 표시를 바꾼다.
    const platform = navigator.platform || navigator.userAgent;
    if (/Mac|iPhone|iPad/i.test(platform)) setShortcutLabel("⌘ O");
  }, []);

  function getImagePoint(event: ReactPointerEvent<HTMLCanvasElement>): { x: number; y: number } | null {
    if (!image) return null;
    try {
      const point = toImageCoordinates(
        { x: event.clientX, y: event.clientY },
        event.currentTarget.getBoundingClientRect(),
        image.width,
        image.height,
      );
      return { x: clamp(point.x, 0, image.width), y: clamp(point.y, 0, image.height) };
    } catch {
      return null;
    }
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    const point = getImagePoint(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = point;
    setSelection({ x: point.x, y: point.y, width: 0, height: 0 });
    setIsDrawing(true);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const start = dragStartRef.current;
    if (!isDrawing || !start) return;
    const point = getImagePoint(event);
    if (!point) return;
    setSelection({
      x: Math.min(start.x, point.x),
      y: Math.min(start.y, point.y),
      width: Math.abs(point.x - start.x),
      height: Math.abs(point.y - start.y),
    });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
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

  function applySelection() {
    if (!selection || selection.width < MIN_SELECTION || selection.height < MIN_SELECTION) {
      showStatus("먼저 이미지에서 가릴 영역을 드래그해 주세요.");
      return;
    }
    try {
      addRegion(selection, selectedTool, intensity);
      setSelection(null);
      showStatus(`${toolLabel(selectedTool)} 처리가 적용됐어요.`);
    } catch (error) {
      showStatus(toUserMessage(error), true);
    }
  }

  function handleUndo() {
    if (!undo()) return;
    setSelection(null);
    showStatus("이전 작업으로 되돌렸어요.");
  }

  function handleRedo() {
    if (!redo()) return;
    setSelection(null);
    showStatus("작업을 다시 적용했어요.");
  }

  function handleReset() {
    reset();
    setSelection(null);
    showStatus("원본 이미지로 초기화했어요.");
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
      flash("이미지를 먼저 추가해 주세요");
      return;
    }
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
      flash("브라우저에서 지원하지 않아요");
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
      flash("복사할 수 없어요");
      showStatus("브라우저의 클립보드 권한을 확인해 주세요.", true);
    }
  }

  const isRedact = selectedTool === "redact";

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
          <button className="icon-button" type="button" aria-label="실행 취소" onClick={handleUndo} disabled={!canUndo}>
            <Undo2 size={17} />
          </button>
          <button className="icon-button" type="button" aria-label="다시 실행" onClick={handleRedo} disabled={!canRedo}>
            <Redo2 size={17} />
          </button>
          <span className="topbar-divider" />
          <button className="reset-button" type="button" onClick={handleReset} disabled={regions.length === 0}>
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
            {/* TODO: 확대·축소 보기 미구현 */}
            <button className="fit-button" type="button">
              화면에 맞춤 <ChevronDown size={14} />
            </button>
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
              <div className="canvas-stage">
                <canvas
                  ref={canvasRef}
                  aria-label={`편집 중인 이미지: ${image.fileName}`}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                />
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
            {/* TODO: 도움말 동작 미구현 */}
            <button type="button" className="help-button" aria-label="편집 도구 도움말">
              <CircleHelp size={17} />
            </button>
          </div>
          <div className="tool-list" role="radiogroup" aria-label="가리기 방식">
            {TOOLS.map(({ label, key, icon: Icon }) => (
              <button
                className={`tool-button ${selectedTool === key ? "is-active" : ""}`}
                type="button"
                role="radio"
                aria-checked={selectedTool === key}
                key={key}
                onClick={() => setSelectedTool(key)}
              >
                <span className="tool-icon">
                  <Icon size={18} />
                </span>
                <span>{label}</span>
                {selectedTool === key && <span className="tool-selected">선택됨</span>}
              </button>
            ))}
          </div>
          <div className="settings-block">
            <div className="settings-label">
              <span>강도</span>
              <strong>{isRedact ? "완전 가림" : `${intensity}%`}</strong>
            </div>
            <input
              className="intensity-range"
              type="range"
              min="10"
              max="100"
              value={intensity}
              disabled={isRedact}
              onChange={(event) => setIntensity(Number(event.target.value))}
              aria-label="효과 강도"
            />
            <div className="range-values">
              <span>약하게</span>
              <span>강하게</span>
            </div>
          </div>
          <div className="selection-note">
            <Info size={15} />
            <span>
              {selection
                ? "선택한 영역에 효과를 적용하려면 아래 버튼을 눌러주세요."
                : "이미지에서 가리고 싶은 영역을 드래그해 주세요."}
            </span>
          </div>
          <button className="apply-button" type="button" onClick={applySelection} disabled={!selection}>
            <Sparkles size={16} /> 선택 영역 적용
          </button>
          <div className="output-actions">
            <button className="download-button" type="button" onClick={() => void handleDownload()}>
              <ArrowDownToLine size={18} /> 이미지 다운로드
            </button>
            <button className="copy-button" type="button" onClick={() => void handleCopy()}>
              <Copy size={16} /> {copyLabel}
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}

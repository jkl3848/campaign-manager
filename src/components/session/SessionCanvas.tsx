import { useRef, useEffect, useState, useCallback } from 'react';
import type { CanvasElement } from '../../types';
import { Button } from '../ui/Button';

type Tool = 'pen' | 'pan' | 'select';
type HandleCorner = 'nw' | 'ne' | 'sw' | 'se';

interface Viewport {
  panX: number;
  panY: number;
  zoom: number;
}

interface ImageData {
  url: string;
  storagePath: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SessionCanvasProps {
  elements: CanvasElement[];
  onElementsChange: (elements: CanvasElement[]) => void;
  onImageUpload?: (file: File) => Promise<{ url: string; storagePath: string }>;
  onImageDelete?: (storagePath: string) => Promise<void>;
  viewportKey?: string;
  readOnly?: boolean;
  fullscreen?: boolean;
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const HANDLE_SIZE = 8;
const MIN_IMAGE_SIZE = 24;
const DROP_FIT_PX = 400;
const DEFAULT_VIEWPORT: Viewport = { panX: 0, panY: 0, zoom: 1 };

function loadViewport(key?: string): Viewport {
  if (!key || typeof localStorage === 'undefined') return { ...DEFAULT_VIEWPORT };
  try {
    const raw = localStorage.getItem(`session-viewport:${key}`);
    if (!raw) return { ...DEFAULT_VIEWPORT };
    const parsed = JSON.parse(raw) as Partial<Viewport>;
    const zoom = typeof parsed.zoom === 'number' ? clamp(parsed.zoom, MIN_ZOOM, MAX_ZOOM) : 1;
    return {
      panX: typeof parsed.panX === 'number' ? parsed.panX : 0,
      panY: typeof parsed.panY === 'number' ? parsed.panY : 0,
      zoom,
    };
  } catch {
    return { ...DEFAULT_VIEWPORT };
  }
}

function saveViewport(key: string | undefined, viewport: Viewport) {
  if (!key || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(`session-viewport:${key}`, JSON.stringify(viewport));
  } catch {
    // ignore quota / private mode
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function isImageData(data: Record<string, unknown>): data is ImageData & Record<string, unknown> {
  return (
    typeof data.url === 'string' &&
    typeof data.x === 'number' &&
    typeof data.y === 'number' &&
    typeof data.width === 'number' &&
    typeof data.height === 'number'
  );
}

function getImageData(el: CanvasElement): ImageData | null {
  if (el.type !== 'image' || !isImageData(el.data)) return null;
  return {
    url: el.data.url,
    storagePath: typeof el.data.storagePath === 'string' ? el.data.storagePath : '',
    x: el.data.x,
    y: el.data.y,
    width: el.data.width,
    height: el.data.height,
  };
}

export function SessionCanvas({
  elements,
  onElementsChange,
  onImageUpload,
  onImageDelete,
  viewportKey,
  readOnly = false,
  fullscreen = false,
}: SessionCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCacheRef = useRef(new Map<string, HTMLImageElement>());
  const rafRef = useRef<number | null>(null);
  const spaceDownRef = useRef(false);
  const interactionRef = useRef<
    | { kind: 'pan'; lastX: number; lastY: number }
    | { kind: 'draw'; path: { x: number; y: number }[] }
    | {
        kind: 'move';
        id: string;
        startWorld: { x: number; y: number };
        origin: ImageData;
        draft: CanvasElement[];
      }
    | {
        kind: 'scale';
        id: string;
        corner: HandleCorner;
        origin: ImageData;
        draft: CanvasElement[];
      }
    | null
  >(null);

  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#f59e0b');
  const [lineWidth, setLineWidth] = useState(3);
  const [viewport, setViewport] = useState<Viewport>(() => loadViewport(viewportKey));
  const [cacheTick, setCacheTick] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftElements, setDraftElements] = useState<CanvasElement[] | null>(null);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [spaceDown, setSpaceDown] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const displayElements = draftElements ?? elements;
  const canEditImages = !!onImageUpload && !readOnly;

  useEffect(() => {
    setViewport(loadViewport(viewportKey));
  }, [viewportKey]);

  useEffect(() => {
    saveViewport(viewportKey, viewport);
  }, [viewport, viewportKey]);

  const ensureCachedImage = useCallback((url: string) => {
    const cache = imageCacheRef.current;
    const existing = cache.get(url);
    if (existing) return existing;

    const img = new Image();
    // No crossOrigin: the bucket has no CORS config, and this canvas never reads pixels back.
    img.onload = () => setCacheTick((t) => t + 1);
    img.src = url;
    cache.set(url, img);
    return img;
  }, []);

  useEffect(() => {
    for (const el of displayElements) {
      if (el.type === 'image' && typeof el.data.url === 'string') {
        ensureCachedImage(el.data.url);
      }
    }
  }, [displayElements, ensureCachedImage]);

  const screenToWorld = useCallback(
    (screenX: number, screenY: number) => ({
      x: (screenX - viewport.panX) / viewport.zoom,
      y: (screenY - viewport.panY) / viewport.zoom,
    }),
    [viewport],
  );

  const worldToScreen = useCallback(
    (worldX: number, worldY: number) => ({
      x: worldX * viewport.zoom + viewport.panX,
      y: worldY * viewport.zoom + viewport.panY,
    }),
    [viewport],
  );

  const getScreenPos = (e: { clientX: number; clientY: number }) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const getHandleRects = useCallback(
    (img: ImageData) => {
      const tl = worldToScreen(img.x, img.y);
      const br = worldToScreen(img.x + img.width, img.y + img.height);
      const half = HANDLE_SIZE / 2;
      return {
        nw: { x: tl.x - half, y: tl.y - half, w: HANDLE_SIZE, h: HANDLE_SIZE },
        ne: { x: br.x - half, y: tl.y - half, w: HANDLE_SIZE, h: HANDLE_SIZE },
        sw: { x: tl.x - half, y: br.y - half, w: HANDLE_SIZE, h: HANDLE_SIZE },
        se: { x: br.x - half, y: br.y - half, w: HANDLE_SIZE, h: HANDLE_SIZE },
      } as const;
    },
    [worldToScreen],
  );

  const hitHandle = useCallback(
    (img: ImageData, screen: { x: number; y: number }): HandleCorner | null => {
      const rects = getHandleRects(img);
      for (const corner of ['nw', 'ne', 'sw', 'se'] as HandleCorner[]) {
        const r = rects[corner];
        if (screen.x >= r.x && screen.x <= r.x + r.w && screen.y >= r.y && screen.y <= r.y + r.h) {
          return corner;
        }
      }
      return null;
    },
    [getHandleRects],
  );

  const hitImage = useCallback(
    (world: { x: number; y: number }, list: CanvasElement[]): CanvasElement | null => {
      for (let i = list.length - 1; i >= 0; i--) {
        const el = list[i];
        const img = getImageData(el);
        if (!img) continue;
        if (
          world.x >= img.x &&
          world.x <= img.x + img.width &&
          world.y >= img.y &&
          world.y <= img.y + img.height
        ) {
          return el;
        }
      }
      return null;
    },
    [],
  );

  const drawPath = (ctx: CanvasRenderingContext2D, points: { x: number; y: number }[], strokeColor: string, width: number) => {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
  };

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const { panX, panY, zoom } = viewport;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.setTransform(zoom, 0, 0, zoom, panX, panY);

    for (const el of displayElements) {
      if (el.type === 'image') {
        const imgData = getImageData(el);
        if (!imgData) continue;
        const cached = imageCacheRef.current.get(imgData.url);
        if (cached?.complete && cached.naturalWidth > 0) {
          ctx.drawImage(cached, imgData.x, imgData.y, imgData.width, imgData.height);
        }
      }
    }

    for (const el of displayElements) {
      if (el.type === 'path') {
        const points = el.data.points as { x: number; y: number }[];
        drawPath(ctx, points, el.data.color as string, el.data.lineWidth as number);
      } else if (el.type === 'text') {
        ctx.fillStyle = el.data.color as string;
        ctx.font = `${el.data.fontSize ?? 16}px sans-serif`;
        ctx.fillText(el.data.text as string, el.data.x as number, el.data.y as number);
      }
    }

    if (currentPath.length > 1) {
      drawPath(ctx, currentPath, color, lineWidth);
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (selectedId && canEditImages && tool === 'select') {
      const selected = displayElements.find((el) => el.id === selectedId);
      const img = selected ? getImageData(selected) : null;
      if (img) {
        const tl = worldToScreen(img.x, img.y);
        const br = worldToScreen(img.x + img.width, img.y + img.height);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
        ctx.setLineDash([]);
        ctx.fillStyle = '#f59e0b';
        const handles = getHandleRects(img);
        for (const r of Object.values(handles)) {
          ctx.fillRect(r.x, r.y, r.w, r.h);
        }
      }
    }
  }, [
    viewport,
    displayElements,
    currentPath,
    color,
    lineWidth,
    selectedId,
    canEditImages,
    tool,
    worldToScreen,
    getHandleRects,
    cacheTick,
  ]);

  const scheduleRedraw = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      redraw();
    });
  }, [redraw]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    if (!fullscreen) return;
    const container = containerRef.current;
    if (!container) return;

    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      redraw();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();
    return () => ro.disconnect();
  }, [fullscreen, redraw]);

  // React's synthetic wheel is often passive; native listener lets us prevent page scroll while zooming.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const screenX = (e.clientX - rect.left) * scaleX;
      const screenY = (e.clientY - rect.top) * scaleY;
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      setViewport((prev) => {
        const zoom = clamp(prev.zoom * factor, MIN_ZOOM, MAX_ZOOM);
        const worldX = (screenX - prev.panX) / prev.zoom;
        const worldY = (screenY - prev.panY) / prev.zoom;
        return {
          zoom,
          panX: screenX - worldX * zoom,
          panY: screenY - worldY * zoom,
        };
      });
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement | null)?.isContentEditable) {
          return;
        }
        e.preventDefault();
        spaceDownRef.current = true;
        setSpaceDown(true);
      }

      if (e.key === 'Escape') {
        setSelectedId(null);
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && canEditImages) {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement | null)?.isContentEditable) {
          return;
        }
        e.preventDefault();
        const target = elements.find((el) => el.id === selectedId);
        const img = target ? getImageData(target) : null;
        onElementsChange(elements.filter((el) => el.id !== selectedId));
        setSelectedId(null);
        if (img?.storagePath && onImageDelete) {
          void onImageDelete(img.storagePath).catch(() => undefined);
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceDownRef.current = false;
        setSpaceDown(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [selectedId, canEditImages, elements, onElementsChange, onImageDelete]);

  const zoomAt = useCallback((screenX: number, screenY: number, nextZoom: number) => {
    setViewport((prev) => {
      const zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
      const worldX = (screenX - prev.panX) / prev.zoom;
      const worldY = (screenY - prev.panY) / prev.zoom;
      return {
        zoom,
        panX: screenX - worldX * zoom,
        panY: screenY - worldY * zoom,
      };
    });
  }, []);

  const beginPan = (screen: { x: number; y: number }) => {
    interactionRef.current = { kind: 'pan', lastX: screen.x, lastY: screen.y };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const screen = getScreenPos(e);
    const world = screenToWorld(screen.x, screen.y);

    if (e.button === 1 || spaceDownRef.current || tool === 'pan' || readOnly) {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      beginPan(screen);
      return;
    }

    if (e.button !== 0) return;

    if (tool === 'select' && canEditImages) {
      canvas.setPointerCapture(e.pointerId);
      const selected = selectedId ? displayElements.find((el) => el.id === selectedId) : null;
      const selectedImg = selected ? getImageData(selected) : null;
      if (selectedImg) {
        const corner = hitHandle(selectedImg, screen);
        if (corner) {
          const draft = displayElements.map((el) => ({ ...el, data: { ...el.data } }));
          interactionRef.current = {
            kind: 'scale',
            id: selected!.id,
            corner,
            origin: { ...selectedImg },
            draft,
          };
          setDraftElements(draft);
          return;
        }
      }

      const hit = hitImage(world, displayElements);
      if (hit) {
        const img = getImageData(hit)!;
        setSelectedId(hit.id);
        const draft = displayElements.map((el) => ({ ...el, data: { ...el.data } }));
        interactionRef.current = {
          kind: 'move',
          id: hit.id,
          startWorld: world,
          origin: { ...img },
          draft,
        };
        setDraftElements(draft);
      } else {
        setSelectedId(null);
      }
      return;
    }

    if (readOnly || tool !== 'pen') return;

    canvas.setPointerCapture(e.pointerId);
    const path = [world];
    interactionRef.current = { kind: 'draw', path };
    setCurrentPath(path);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const interaction = interactionRef.current;
    if (!interaction) return;
    const screen = getScreenPos(e);

    if (interaction.kind === 'pan') {
      const dx = screen.x - interaction.lastX;
      const dy = screen.y - interaction.lastY;
      interaction.lastX = screen.x;
      interaction.lastY = screen.y;
      setViewport((prev) => ({ ...prev, panX: prev.panX + dx, panY: prev.panY + dy }));
      return;
    }

    if (interaction.kind === 'draw') {
      const world = screenToWorld(screen.x, screen.y);
      interaction.path.push(world);
      setCurrentPath([...interaction.path]);
      scheduleRedraw();
      return;
    }

    if (interaction.kind === 'move') {
      const world = screenToWorld(screen.x, screen.y);
      const dx = world.x - interaction.startWorld.x;
      const dy = world.y - interaction.startWorld.y;
      const next = interaction.draft.map((el) => {
        if (el.id !== interaction.id) return el;
        return {
          ...el,
          data: {
            ...el.data,
            x: interaction.origin.x + dx,
            y: interaction.origin.y + dy,
          },
        };
      });
      interaction.draft = next;
      setDraftElements(next);
      return;
    }

    if (interaction.kind === 'scale') {
      const world = screenToWorld(screen.x, screen.y);
      const { origin, corner } = interaction;
      const aspect = origin.width / origin.height;
      let x = origin.x;
      let y = origin.y;
      let width = origin.width;
      let height = origin.height;

      if (corner === 'se') {
        width = Math.max(MIN_IMAGE_SIZE, world.x - origin.x);
        height = width / aspect;
      } else if (corner === 'sw') {
        width = Math.max(MIN_IMAGE_SIZE, origin.x + origin.width - world.x);
        height = width / aspect;
        x = origin.x + origin.width - width;
      } else if (corner === 'ne') {
        width = Math.max(MIN_IMAGE_SIZE, world.x - origin.x);
        height = width / aspect;
        y = origin.y + origin.height - height;
      } else {
        width = Math.max(MIN_IMAGE_SIZE, origin.x + origin.width - world.x);
        height = width / aspect;
        x = origin.x + origin.width - width;
        y = origin.y + origin.height - height;
      }

      const next = interaction.draft.map((el) => {
        if (el.id !== interaction.id) return el;
        return { ...el, data: { ...el.data, x, y, width, height } };
      });
      interaction.draft = next;
      setDraftElements(next);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const interaction = interactionRef.current;
    interactionRef.current = null;

    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // already released
    }

    if (!interaction) return;

    if (interaction.kind === 'draw') {
      const path = interaction.path;
      setCurrentPath([]);
      if (path.length > 1) {
        onElementsChange([
          ...elements,
          {
            id: crypto.randomUUID(),
            type: 'path',
            data: { points: path, color, lineWidth },
          },
        ]);
      }
      return;
    }

    if (interaction.kind === 'move' || interaction.kind === 'scale') {
      onElementsChange(interaction.draft);
      setDraftElements(null);
    }
  };

  const handleClear = () => {
    if (!confirm('Clear all drawings?')) return;
    onElementsChange(elements.filter((el) => el.type === 'image'));
    setSelectedId(null);
  };

  const placeUploadedImages = async (files: File[], dropWorld: { x: number; y: number }) => {
    if (!onImageUpload || files.length === 0) return;
    setUploading(true);
    try {
      const additions: CanvasElement[] = [];
      let index = 0;
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        const { url, storagePath } = await onImageUpload(file);
        const img = ensureCachedImage(url);
        await new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) resolve();
          else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }
        });

        const natW = img.naturalWidth || 400;
        const natH = img.naturalHeight || 400;
        const fit = DROP_FIT_PX / viewport.zoom;
        const scale = Math.min(1, fit / Math.max(natW, natH));
        const width = Math.max(MIN_IMAGE_SIZE, natW * scale);
        const height = Math.max(MIN_IMAGE_SIZE, natH * scale);
        const offset = index * 24;
        additions.push({
          id: crypto.randomUUID(),
          type: 'image',
          data: {
            url,
            storagePath,
            x: dropWorld.x - width / 2 + offset,
            y: dropWorld.y - height / 2 + offset,
            width,
            height,
          },
        });
        index += 1;
      }
      if (additions.length > 0) {
        onElementsChange([...elements, ...additions]);
        setSelectedId(additions[additions.length - 1].id);
        setTool('select');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!onImageUpload || readOnly) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget === e.target) setDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    if (!onImageUpload || readOnly) return;
    e.preventDefault();
    setDragOver(false);
    const screen = getScreenPos(e);
    const world = screenToWorld(screen.x, screen.y);
    const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
    await placeUploadedImages(files, world);
  };

  const cursorClass = (() => {
    if (spaceDown || tool === 'pan') return 'cursor-grab';
    if (tool === 'select') return 'cursor-default';
    if (tool === 'pen' && !readOnly) return 'cursor-crosshair';
    return 'cursor-default';
  })();

  const toolbar = !readOnly && (
    <div
      className={
        fullscreen
          ? 'absolute top-3 z-10 flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-950/80 px-2 py-1.5 backdrop-blur-md'
          : 'flex flex-wrap gap-2 items-center'
      }
      style={fullscreen ? { left: 'calc(var(--dm-panel-width, 0px) + 12px)' } : undefined}
    >
      <Button variant={tool === 'pen' ? 'primary' : 'ghost'} size="sm" onClick={() => setTool('pen')}>
        Draw
      </Button>
      <Button variant={tool === 'pan' ? 'primary' : 'ghost'} size="sm" onClick={() => setTool('pan')}>
        Pan
      </Button>
      {canEditImages && (
        <Button
          variant={tool === 'select' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setTool('select')}
        >
          Move
        </Button>
      )}
      <input
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        className="h-7 w-7 cursor-pointer rounded"
        title="Color"
      />
      <input
        type="range"
        min={1}
        max={10}
        value={lineWidth}
        onChange={(e) => setLineWidth(parseInt(e.target.value))}
        className="w-16"
        title="Line width"
      />
      <Button variant="ghost" size="sm" onClick={handleClear}>
        Clear
      </Button>
      {uploading && <span className="text-xs text-amber-200/90">Uploading…</span>}
    </div>
  );

  const zoomOverlay = (
    <div
      className={
        fullscreen
          ? 'absolute bottom-4 z-10 flex items-center gap-1 rounded-lg border border-slate-700/60 bg-slate-950/80 px-1.5 py-1 backdrop-blur-md'
          : 'flex items-center gap-1 self-end'
      }
      style={fullscreen ? { right: 'calc(20rem + 12px)' } : undefined}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          zoomAt(canvas.width / 2, canvas.height / 2, viewport.zoom / 1.2);
        }}
      >
        −
      </Button>
      <span className="min-w-12 text-center text-xs text-slate-300">{Math.round(viewport.zoom * 100)}%</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          zoomAt(canvas.width / 2, canvas.height / 2, viewport.zoom * 1.2);
        }}
      >
        +
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setViewport({ ...DEFAULT_VIEWPORT })}>
        Reset
      </Button>
    </div>
  );

  const canvasProps = {
    ref: canvasRef,
    className: `${fullscreen ? 'h-full w-full bg-slate-900' : 'w-full rounded-lg border border-slate-600 bg-slate-900'} ${cursorClass}`,
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerUp,
  };

  if (fullscreen) {
    return (
      <div
        ref={containerRef}
        className={`absolute inset-0 ${dragOver ? 'ring-2 ring-inset ring-amber-500/70' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {toolbar}
        <canvas {...canvasProps} />
        {zoomOverlay}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-2 ${dragOver ? 'ring-2 ring-amber-500/70 rounded-lg' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {toolbar}
      <canvas {...canvasProps} width={900} height={600} />
      {zoomOverlay}
      {uploading && !toolbar && <span className="text-xs text-amber-200/90">Uploading…</span>}
    </div>
  );
}

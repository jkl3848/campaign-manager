import { useRef, useEffect, useState, useCallback } from 'react';
import type { CanvasElement } from '../../types';
import { Button } from '../ui/Button';

type Tool = 'pen' | 'eraser' | 'text' | 'select';

interface SessionCanvasProps {
  elements: CanvasElement[];
  mapImageUrl?: string;
  onElementsChange: (elements: CanvasElement[]) => void;
  onMapUpload?: (file: File) => Promise<void>;
  readOnly?: boolean;
}

export function SessionCanvas({
  elements,
  mapImageUrl,
  onElementsChange,
  onMapUpload,
  readOnly = false,
}: SessionCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#f59e0b');
  const [lineWidth, setLineWidth] = useState(3);
  const [drawing, setDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const mapInputRef = useRef<HTMLInputElement>(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (mapImageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        drawElements(ctx);
      };
      img.src = mapImageUrl;
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawElements(ctx);
    }
  }, [elements, mapImageUrl]);

  const drawElements = (ctx: CanvasRenderingContext2D) => {
    for (const el of elements) {
      if (el.type === 'path') {
        const points = el.data.points as { x: number; y: number }[];
        const strokeColor = el.data.color as string;
        const width = el.data.lineWidth as number;
        if (points.length < 2) continue;
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
      } else if (el.type === 'text') {
        ctx.fillStyle = el.data.color as string;
        ctx.font = `${el.data.fontSize ?? 16}px sans-serif`;
        ctx.fillText(el.data.text as string, el.data.x as number, el.data.y as number);
      }
    }
  };

  useEffect(() => {
    redraw();
  }, [redraw]);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly || tool !== 'pen') return;
    setDrawing(true);
    const pos = getPos(e);
    setCurrentPath([pos]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || readOnly) return;
    const pos = getPos(e);
    setCurrentPath((prev) => [...prev, pos]);

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const last = currentPath[currentPath.length - 1];
    if (last) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const handleMouseUp = () => {
    if (!drawing) return;
    setDrawing(false);
    if (currentPath.length > 1) {
      const newElement: CanvasElement = {
        id: crypto.randomUUID(),
        type: 'path',
        data: { points: currentPath, color, lineWidth },
      };
      onElementsChange([...elements, newElement]);
    }
    setCurrentPath([]);
  };

  const handleClear = () => {
    if (confirm('Clear all drawings?')) {
      onElementsChange([]);
    }
  };

  const handleMapUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onMapUpload) {
      await onMapUpload(file);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {!readOnly && (
        <div className="flex flex-wrap gap-2 items-center">
          <Button
            variant={tool === 'pen' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setTool('pen')}
          >
            Draw
          </Button>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer"
            title="Color"
          />
          <input
            type="range"
            min={1}
            max={10}
            value={lineWidth}
            onChange={(e) => setLineWidth(parseInt(e.target.value))}
            className="w-20"
            title="Line width"
          />
          <Button variant="ghost" size="sm" onClick={handleClear}>
            Clear Drawings
          </Button>
          {onMapUpload && (
            <>
              <input
                ref={mapInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleMapUpload}
              />
              <Button variant="secondary" size="sm" onClick={() => mapInputRef.current?.click()}>
                Upload Map
              </Button>
            </>
          )}
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={900}
        height={600}
        className="w-full rounded-lg border border-slate-600 cursor-crosshair bg-slate-900"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
}

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { GridNineIcon } from '@phosphor-icons/react';

interface PixelCanvasProps {
  width: number;
  height: number;
  matrix: number[][];
  palette: { hex: string; label: string }[];
  onCellClick: (r: number, c: number) => void;
  onCellMouseEnter: (r: number, c: number, buttons: number) => void;
}

export function PixelCanvas({
  width,
  height,
  matrix,
  palette,
  onCellClick,
  onCellMouseEnter,
}: PixelCanvasProps) {
  const [showGridLines, setShowGridLines] = useState(true);

  // Checkerboard background for transparency preview
  const checkersStyle: React.CSSProperties = {
    backgroundImage: `
      linear-gradient(45deg, #222222 25%, transparent 25%),
      linear-gradient(-45deg, #222222 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #222222 75%),
      linear-gradient(-45deg, transparent 75%, #222222 75%)
    `,
    backgroundSize: '16px 16px',
    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
    backgroundColor: '#111111',
  };

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-0 p-4">
      {/* Grid Settings Bar */}
      <div className="flex items-center justify-between w-full max-w-[480px] mb-3 px-1 text-xs text-muted-foreground select-none">
        <div className="flex items-center gap-1">
          <GridNineIcon className="h-4.5 w-4.5" />
          <span>Canvas: {width} x {height}</span>
        </div>
        <button
          onClick={() => setShowGridLines(!showGridLines)}
          className={cn(
            "hover:text-foreground transition-colors cursor-pointer",
            showGridLines && "text-green-500 font-semibold"
          )}
        >
          {showGridLines ? "Grid Lines: ON" : "Grid Lines: OFF"}
        </button>
      </div>

      {/* Grid Container wrapper with border */}
      <div 
        className="relative border rounded-md overflow-hidden shadow-2xl max-w-full max-h-[80vh] flex items-center justify-center p-2 bg-muted/20"
        style={checkersStyle}
      >
        <div 
          className="grid gap-[0.5px] select-none"
          style={{
            gridTemplateColumns: `repeat(${width}, 1fr)`,
            gridTemplateRows: `repeat(${height}, 1fr)`,
            width: `${Math.min(480, width * 32)}px`,
            aspectRatio: `${width} / ${height}`,
          }}
        >
          {matrix.map((row, r) =>
            row.map((colorIdx, c) => {
              const color = palette[colorIdx] || palette[0];
              const isTransparent = color.hex === '#00000000';
              
              return (
                <div
                  key={`${r}-${c}`}
                  onMouseDown={() => onCellClick(r, c)}
                  onMouseEnter={(e) => onCellMouseEnter(r, c, e.buttons)}
                  className={cn(
                    "relative aspect-square transition-all duration-75 cursor-crosshair group",
                    showGridLines ? "border-[0.5px] border-neutral-800/40" : "border-0"
                  )}
                  style={{
                    backgroundColor: isTransparent ? 'transparent' : color.hex,
                  }}
                  title={`Cell (${r}, ${c}) - Index: ${colorIdx} (${color.label})`}
                >
                  {/* Hover highlighter overlay */}
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

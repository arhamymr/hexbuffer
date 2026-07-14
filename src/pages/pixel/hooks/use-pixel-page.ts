import { useState, useEffect, useCallback, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { PALETTES, PRESET_DIMENSIONS, type ColorPaletteItem } from '../constants';

export type DrawMode = 'draw' | 'erase' | 'picker';

interface PixelGeneratedData {
  name: string;
  width: number;
  height: number;
  matrix: number[][];
}

interface PixelGenerationResponse {
  provider: string;
  model: string;
  data: PixelGeneratedData;
}

export function usePixelPage() {
  const [width, setWidth] = useState(16);
  const [height, setHeight] = useState(16);
  const [palette, setPalette] = useState<ColorPaletteItem[]>(() => PALETTES[0].colors);
  const [selectedPaletteIndex, setSelectedPaletteIndex] = useState(0);
  
  const [activeColorIndex, setActiveColorIndex] = useState(1);
  const [drawMode, setDrawMode] = useState<DrawMode>('draw');
  
  const [matrix, setMatrix] = useState<number[][]>(() => 
    Array.from({ length: 16 }, () => Array(16).fill(0))
  );

  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedName, setGeneratedName] = useState('pixel_asset');
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Sync matrix dimensions if they change
  const resizeMatrix = useCallback((newWidth: number, newHeight: number) => {
    setMatrix((prev) => {
      const next = Array.from({ length: newHeight }, (_, r) => {
        const prevRow = prev[r] || [];
        return Array.from({ length: newWidth }, (_, c) => {
          return prevRow[c] !== undefined ? prevRow[c] : 0;
        });
      });
      return next;
    });
  }, []);

  // Update dimensions
  const handleDimensionChange = (w: number, h: number) => {
    setWidth(w);
    setHeight(h);
    resizeMatrix(w, h);
  };

  // Load preset palette
  const handlePaletteSelect = (index: number) => {
    setSelectedPaletteIndex(index);
    if (PALETTES[index]) {
      setPalette(PALETTES[index].colors);
      setActiveColorIndex(1); // default to first solid color
    }
  };

  // Add custom color to palette
  const handleAddColor = () => {
    const nextIndex = palette.length;
    setPalette([...palette, { hex: '#ff0000', label: `Custom Color ${nextIndex}` }]);
    setActiveColorIndex(nextIndex);
  };

  // Update a palette color
  const handleUpdateColor = (index: number, hex: string, label: string) => {
    const next = [...palette];
    next[index] = { hex, label };
    setPalette(next);
  };

  // Delete a palette color
  const handleDeleteColor = (index: number) => {
    if (palette.length <= 1) {
      toast.error("Palette must have at least one color");
      return;
    }
    const next = palette.filter((_, i) => i !== index);
    setPalette(next);
    
    // Adjust matrix indices for any values deleted or shifted
    setMatrix((prev) => 
      prev.map((row) => 
        row.map((val) => {
          if (val === index) return 0;
          if (val > index) return val - 1;
          return val;
        })
      )
    );

    if (activeColorIndex >= next.length) {
      setActiveColorIndex(next.length - 1);
    }
  };

  // Drawing action
  const handleCellAction = useCallback((r: number, c: number) => {
    setMatrix((prev) => {
      const next = prev.map((row) => [...row]);
      if (drawMode === 'draw') {
        next[r][c] = activeColorIndex;
      } else if (drawMode === 'erase') {
        next[r][c] = 0;
      } else if (drawMode === 'picker') {
        const colorVal = next[r][c];
        setActiveColorIndex(colorVal);
        setDrawMode('draw');
      }
      return next;
    });
  }, [drawMode, activeColorIndex]);

  // Drag drawing (left-click drag)
  const handleCellMouseEnter = useCallback((r: number, c: number, buttons: number) => {
    if (buttons === 1) {
      handleCellAction(r, c);
    }
  }, [handleCellAction]);

  // Clear Canvas
  const handleClear = () => {
    setMatrix(Array.from({ length: height }, () => Array(width).fill(0)));
  };

  // Fill Canvas
  const handleFill = () => {
    setMatrix(Array.from({ length: height }, () => Array(width).fill(activeColorIndex)));
  };

  // AI Prompt generation
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a description for the asset');
      return;
    }
    
    setGenerating(true);
    setGenerateError(null);

    const paletteDescriptions = palette.map((col, index) => `${index}: ${col.label}`);

    try {
      const response = await invoke<PixelGenerationResponse>('generate_pixel_matrix', {
        request: {
          prompt,
          width,
          height,
          palette: paletteDescriptions,
        },
      });

      const { data } = response;
      if (data && data.matrix) {
        setGeneratedName(data.name || 'pixel_asset');
        
        // Ensure dimensions match
        const newWidth = data.width || width;
        const newHeight = data.height || height;
        setWidth(newWidth);
        setHeight(newHeight);

        // Normalize matrix data in case size from LLM slightly differs
        const finalMatrix = Array.from({ length: newHeight }, (_, r) => {
          const rowData = data.matrix[r] || [];
          return Array.from({ length: newWidth }, (_, c) => {
            const indexValue = rowData[c] ?? 0;
            // Bound index value to palette length
            return indexValue < palette.length ? indexValue : 0;
          });
        });
        
        setMatrix(finalMatrix);
        toast.success(`Generated asset: ${data.name}`);
      } else {
        throw new Error('AI returned an empty matrix response');
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = typeof err === 'string' ? err : err.message || 'Unknown error occurred';
      setGenerateError(errMsg);
      toast.error(`Generation failed: ${errMsg}`);
    } finally {
      setGenerating(false);
    }
  };

  // Export JSON structured matrix matching schema
  const formattedJson = useMemo(() => {
    return JSON.stringify(
      {
        name: generatedName,
        width,
        height,
        matrix,
      },
      null,
      2
    );
  }, [generatedName, width, height, matrix]);

  // Copy JSON matrix string
  const handleCopyJson = () => {
    navigator.clipboard.writeText(formattedJson);
    toast.success('Matrix data copied to clipboard');
  };

  // Export as PNG image (scaled up)
  const handleExportPng = () => {
    const scale = 32; // draw 32x32 real pixels per grid cell
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      toast.error('Failed to create canvas context');
      return;
    }

    // Draw the grid cells
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const colorIdx = matrix[r]?.[c] ?? 0;
        const color = palette[colorIdx] ?? palette[0];
        
        ctx.fillStyle = color.hex === '#00000000' ? 'rgba(0,0,0,0)' : color.hex;
        if (color.hex === '#00000000') {
          ctx.clearRect(c * scale, r * scale, scale, scale);
        } else {
          ctx.fillRect(c * scale, r * scale, scale, scale);
        }
      }
    }

    // Download link trigger
    const link = document.createElement('a');
    link.download = `${generatedName}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('Asset downloaded as PNG');
  };

  return {
    width,
    height,
    matrix,
    setMatrix,
    handleDimensionChange,
    
    palette,
    setPalette,
    selectedPaletteIndex,
    handlePaletteSelect,
    handleAddColor,
    handleUpdateColor,
    handleDeleteColor,
    
    activeColorIndex,
    setActiveColorIndex,
    drawMode,
    setDrawMode,
    
    prompt,
    setPrompt,
    generating,
    generatedName,
    setGeneratedName,
    generateError,
    
    handleCellAction,
    handleCellMouseEnter,
    handleClear,
    handleFill,
    handleGenerate,
    formattedJson,
    handleCopyJson,
    handleExportPng,
  };
}

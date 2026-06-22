import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

interface WallpaperWidgetProps {
  wallpaperType: string;
  setWallpaperType: (type: string) => void;
  wallpaperUrl: string;
  setWallpaperUrl: (url: string) => void;
}

export function WallpaperWidget({
  wallpaperType,
  setWallpaperType,
  wallpaperUrl,
  setWallpaperUrl
}: WallpaperWidgetProps) {
  const [urlInput, setUrlInput] = React.useState(wallpaperUrl);

  React.useEffect(() => {
    setUrlInput(wallpaperUrl);
  }, [wallpaperUrl]);

  const handleApplyUrl = () => {
    setWallpaperUrl(urlInput);
    localStorage.setItem('desktop-wallpaper-url', urlInput);
    setWallpaperType('image');
    localStorage.setItem('desktop-wallpaper-type', 'image');
  };

  const handlePresetSelect = (url: string) => {
    setUrlInput(url);
    setWallpaperUrl(url);
    localStorage.setItem('desktop-wallpaper-url', url);
    setWallpaperType('image');
    localStorage.setItem('desktop-wallpaper-type', 'image');
  };

  const handleColorSelect = (color: string) => {
    setUrlInput(color);
    setWallpaperUrl(color);
    localStorage.setItem('desktop-wallpaper-url', color);
    setWallpaperType('solid');
    localStorage.setItem('desktop-wallpaper-type', 'solid');
  };

  const handleApplyColor = () => {
    setWallpaperUrl(urlInput);
    localStorage.setItem('desktop-wallpaper-url', urlInput);
    setWallpaperType('solid');
    localStorage.setItem('desktop-wallpaper-type', 'solid');
  };

  const handleReset = () => {
    setWallpaperType('gradient');
    localStorage.setItem('desktop-wallpaper-type', 'gradient');
  };

  const presets = [
    { name: 'Obsidian', url: 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=800&q=80' },
    { name: 'Fluid', url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=800&q=80' },
    { name: 'Flow', url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80' }
  ];

  const colorPresets = [
    { name: 'Charcoal', value: '#12131a' },
    { name: 'Midnight', value: '#030712' },
    { name: 'Slate', value: '#0f172a' },
    { name: 'Emerald', value: '#064e3b' },
    { name: 'Indigo', value: '#311084' },
    { name: 'Plum', value: '#3b0764' }
  ];

  return (
    <div className="p-2 rounded-md border bg-card/30 dark:bg-card/10 backdrop-blur-md flex flex-col gap-2.5">
      <div className="flex items-center gap-1.5">
        <Settings className="size-3.5 text-primary" />
        <span className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground uppercase">Desktop Wallpaper</span>
      </div>

      <div className="flex items-center gap-1 mt-1">
        <Button
          variant={wallpaperType === 'gradient' ? 'default' : 'outline'}
          onClick={handleReset}
          className="flex-1 h-6 text-[9px] font-medium"
        >
          Gradients
        </Button>
        <Button
          variant={wallpaperType === 'solid' ? 'default' : 'outline'}
          onClick={() => {
            setWallpaperType('solid');
            localStorage.setItem('desktop-wallpaper-type', 'solid');
            const defaultColor = '#12131a';
            setWallpaperUrl(defaultColor);
            localStorage.setItem('desktop-wallpaper-url', defaultColor);
            setUrlInput(defaultColor);
          }}
          className="flex-1 h-6 text-[9px] font-medium"
        >
          Solid Color
        </Button>
        <Button
          variant={wallpaperType === 'image' ? 'default' : 'outline'}
          onClick={() => {
            setWallpaperType('image');
            localStorage.setItem('desktop-wallpaper-type', 'image');
            const defaultUrl = presets[0].url;
            setWallpaperUrl(defaultUrl);
            localStorage.setItem('desktop-wallpaper-url', defaultUrl);
            setUrlInput(defaultUrl);
          }}
          className="flex-1 h-6 text-[9px] font-medium"
        >
          Image
        </Button>
      </div>

      {wallpaperType === 'image' && (
        <>
          <div className="flex flex-col gap-1.5 mt-0.5">
            <span className="text-[9px] text-muted-foreground font-medium">Presets:</span>
            <div className="flex gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.name}
                  onClick={() => handlePresetSelect(p.url)}
                  className="flex-1 text-[9px] py-1 border border-border/50 rounded-sm bg-muted/20 hover:bg-muted/50 text-foreground transition-all truncate cursor-pointer select-none font-medium"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 mt-0.5">
            <span className="text-[9px] text-muted-foreground font-medium">Custom Image URL:</span>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="flex-1 h-6 px-2 bg-muted/20 dark:bg-black/10 border border-border/40 rounded-sm text-[9px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 font-sans min-w-0"
              />
              <Button
                onClick={handleApplyUrl}
                className="h-6 px-2 text-[9px] font-medium shrink-0"
                disabled={!urlInput}
              >
                Apply
              </Button>
            </div>
          </div>
        </>
      )}

      {wallpaperType === 'solid' && (
        <>
          <div className="flex flex-col gap-1.5 mt-0.5">
            <span className="text-[9px] text-muted-foreground font-medium">Color Presets:</span>
            <div className="grid grid-cols-3 gap-1.5">
              {colorPresets.map((c) => (
                <button
                  key={c.name}
                  onClick={() => handleColorSelect(c.value)}
                  className="text-[9px] py-1 border border-border/50 rounded-sm bg-muted/20 hover:bg-muted/50 text-foreground transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none font-medium"
                >
                  <span className="size-2 rounded-full border border-black/20" style={{ backgroundColor: c.value }} />
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 mt-0.5">
            <span className="text-[9px] text-muted-foreground font-medium">Custom Hex Color:</span>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="#12131a"
                className="flex-1 h-6 px-2 bg-muted/20 dark:bg-black/10 border border-border/40 rounded-sm text-[9px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 font-sans min-w-0"
              />
              <Button
                onClick={handleApplyColor}
                className="h-6 px-2 text-[9px] font-medium shrink-0"
                disabled={!urlInput}
              >
                Apply
              </Button>
            </div>
          </div>
        </>
      )}

      {wallpaperType === 'gradient' && (
        <div className="text-[9px] text-muted-foreground py-2 text-center border border-dashed border-border/45 rounded bg-muted/5 font-medium">
          Using default dynamic gradient wallpaper.
        </div>
      )}
    </div>
  );
}

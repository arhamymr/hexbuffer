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
    setWallpaperUrl('');
    localStorage.setItem('desktop-wallpaper-url', '');
  };

  const handleGradientSelect = (gradientValue: string) => {
    setWallpaperUrl(gradientValue);
    localStorage.setItem('desktop-wallpaper-url', gradientValue);
    setWallpaperType('gradient');
    localStorage.setItem('desktop-wallpaper-type', 'gradient');
  };

  const colorPresets = [
    { name: 'Charcoal', value: '#12131a' },
    { name: 'Midnight', value: '#030712' },
    { name: 'Slate', value: '#0f172a' },
    { name: 'Emerald', value: '#064e3b' },
    { name: 'Indigo', value: '#311084' },
    { name: 'Plum', value: '#3b0764' }
  ];

  const gradientPresets = [
    { name: 'Default Aura', value: '' },
    { name: 'Midnight Purple', value: 'gradient-midnight' },
    { name: 'Sunset Glow', value: 'gradient-sunset' },
    { name: 'Ocean Breeze', value: 'gradient-ocean' },
    { name: 'Northern Lights', value: 'gradient-aurora' },
    { name: 'Cyberpunk Violet', value: 'gradient-cyberpunk' }
  ];

  const isGradientActive = (value: string) => {
    if (value === '') {
      return !wallpaperUrl || !wallpaperUrl.includes('gradient');
    }
    return wallpaperUrl === value;
  };

  return (
    <div className="p-2 rounded-md border bg-background/30 dark:bg-background/10 backdrop-blur-md flex flex-col gap-2.5">
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
      </div>


      {wallpaperType === 'solid' && (
        <>
          <div className="flex flex-col gap-1.5 mt-0.5">
            <span className="text-[9px] text-muted-foreground font-medium">Color Presets:</span>
            <div className="grid grid-cols-3 gap-1.5">
              {colorPresets.map((c) => {
                const isActive = wallpaperType === 'solid' && wallpaperUrl === c.value;
                return (
                  <button
                    key={c.name}
                    onClick={() => handleColorSelect(c.value)}
                    className={`text-[9px] py-1 border rounded-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none font-medium ${
                      isActive
                        ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/30'
                        : 'border-border/50 bg-muted/20 hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="size-2 rounded-full border border-black/20" style={{ backgroundColor: c.value }} />
                    <span className="truncate">{c.name}</span>
                  </button>
                );
              })}
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
        <div className="flex flex-col gap-1.5 mt-0.5">
          <span className="text-[9px] text-muted-foreground font-medium">Gradient Presets:</span>
          <div className="grid grid-cols-2 gap-1.5">
            {gradientPresets.map((g) => {
              const isActive = isGradientActive(g.value);
              return (
                <button
                  key={g.name}
                  onClick={() => handleGradientSelect(g.value)}
                  className={`text-[9px] py-1 px-1.5 border rounded-sm transition-all flex items-center justify-start gap-1.5 cursor-pointer select-none font-medium ${
                    isActive
                      ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/30'
                      : 'border-border/50 bg-muted/20 hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span
                    className={`size-3 rounded-full border border-black/20 shrink-0 ${g.value || 'gradient-default'}`}
                  />
                  <span className="truncate">{g.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

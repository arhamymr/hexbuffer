import * as React from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';
import { ImageIcon, PaletteIcon, TrashIcon, ArrowCounterClockwise } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useAppSettingsStore } from '@/stores/app-settings-store';
import { SettingsGroup, SettingsRow } from './settings-group';
import { ShortcutManager } from '@/pages/desktop/components/shortcut-manager';

import whiteWallpaper from '@/assets/white-walpaper.png';
import blackWallpaper from '@/assets/black-walpaper.png';

const PRESET_COLORS = [
  '#0f0f0f', '#1a1a2e', '#16213e', '#0f3460',
  '#1b1b2f', '#162447', '#1f4068', '#1b262c',
  '#2d132c', '#1a1a1a', '#2c2c54', '#474787',
];

export function AppearanceSettingsTab() {
  const bgType = useAppSettingsStore((s) => s.bgType);
  const bgValue = useAppSettingsStore((s) => s.bgValue);
  const setBg = useAppSettingsStore((s) => s.setBg);
  const clearBg = useAppSettingsStore((s) => s.clearBg);

  const handlePickImage = React.useCallback(async () => {
    const path = await open({
      title: 'Select background image',
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif'] }],
    });
    if (!path || typeof path !== 'string') return;

    // Save the local path directly. convertFileSrc converts it to a safe asset:// url at render time.
    setBg('image', path);
  }, [setBg]);

  const handlePickColor = React.useCallback((hex: string) => {
    setBg('color', hex);
  }, [setBg]);

  return (
    <>
      <SettingsGroup label="Background" description="Customize the app background with a color or image.">
        <SettingsRow
          label="Background image"
          description="Upload a custom image. It will be displayed as cover."
        >
          <div className="flex items-center gap-2">
            <Button size="xs" variant="outline" onClick={handlePickImage}>
              <ImageIcon className="mr-1.5 size-3.5" />
              {bgType === 'image' && bgValue !== 'default-light' && bgValue !== 'default-dark' ? 'Change image' : 'Pick image'}
            </Button>
            {bgType !== 'none' && (
              <Button size="xs" variant="ghost" onClick={clearBg}>
                <TrashIcon className="size-3.5" />
              </Button>
            )}
          </div>
        </SettingsRow>

        <SettingsRow
          label="Preset wallpapers"
          description="Choose a default theme wallpaper."
        >
          <div className="flex items-center gap-3 justify-end">
            <button
              type="button"
              title="Light Wallpaper"
              onClick={() => setBg('image', 'default-light')}
              className="group relative h-12 w-20 rounded-md border border-border overflow-hidden transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{
                outline: bgType === 'image' && bgValue === 'default-light' ? '2px solid var(--primary)' : undefined,
                outlineOffset: '2px',
              }}
            >
              <img src={whiteWallpaper} alt="Light Wallpaper" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
            </button>
            <button
              type="button"
              title="Dark Wallpaper"
              onClick={() => setBg('image', 'default-dark')}
              className="group relative h-12 w-20 rounded-md border border-border overflow-hidden transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{
                outline: bgType === 'image' && bgValue === 'default-dark' ? '2px solid var(--primary)' : undefined,
                outlineOffset: '2px',
              }}
            >
              <img src={blackWallpaper} alt="Dark Wallpaper" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
            </button>
          </div>
        </SettingsRow>

        <SettingsRow label="Background color" description="Pick a solid color as the background.">
          <div className="flex items-center gap-2 flex-wrap justify-end max-w-xs">
            {PRESET_COLORS.map((hex) => (
              <button
                key={hex}
                type="button"
                title={hex}
                onClick={() => handlePickColor(hex)}
                className="size-6 rounded-md border border-border transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{
                  backgroundColor: hex,
                  outline: bgType === 'color' && bgValue === hex ? '2px solid var(--primary)' : undefined,
                  outlineOffset: '2px',
                }}
              />
            ))}
            {/* native color picker for custom color */}
            <label
              title="Custom color"
              className="relative size-6 rounded-md border border-dashed border-border cursor-pointer flex items-center justify-center hover:border-primary transition-colors"
            >
              <PaletteIcon className="size-3.5 text-muted-foreground" />
              <input
                type="color"
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                value={bgType === 'color' ? bgValue : '#000000'}
                onChange={(e) => handlePickColor(e.target.value)}
              />
            </label>
          </div>
        </SettingsRow>

        {bgType !== 'none' && (
          <SettingsRow label="Preview">
            <div
              className="h-16 w-40 rounded-md border border-border overflow-hidden"
              style={
                bgType === 'image'
                  ? {
                      backgroundImage: `url(${
                        bgValue === 'default-light'
                          ? whiteWallpaper
                          : bgValue === 'default-dark'
                          ? blackWallpaper
                          : convertFileSrc(bgValue)
                      })`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }
                  : { backgroundColor: bgValue }
              }
            />
          </SettingsRow>
        )}

        {bgType !== 'none' && (
          <SettingsRow label="Reset background" description="Restore the default light/dark theme wallpaper.">
            <Button size="xs" variant="outline" onClick={clearBg}>
              <ArrowCounterClockwise className="mr-1.5 size-3.5" />
              Reset to default
            </Button>
          </SettingsRow>
        )}
      </SettingsGroup>

      <SettingsGroup label="Workspace Customization" description="Configure shortcuts and widgets shown on your desktop and sidebar.">
        <div className="p-4 rounded-md border border-border/80 bg-muted/10">
          <ShortcutManager />
        </div>
      </SettingsGroup>
    </>
  );
}

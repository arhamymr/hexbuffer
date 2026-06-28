import * as React from 'react';
import { relaunch } from '@tauri-apps/plugin-process';
import { toast } from 'sonner';

import { useGlobalTerminalStore } from '@/stores/global-terminal';
import { useChatboxStore } from '@/stores/chatbox';
import { useTheme } from '@/components/theme-provider';
import { useLicenseStore } from '@/stores/license';
import { useUpdater } from '@/hooks/use-updater';
import { ManualUpdateCommand } from '@/pages/settings/components/manual-update-command';
import { formatBytes } from '../footer/utils';

const SNAP_THRESHOLD = 20;

export function useSidebarDock() {
  // ── Terminal toggle ─────────────────────────────────────────────────────
  const isTerminalOpen = useGlobalTerminalStore((s) => s.isOpen);
  const setIsTerminalOpen = useGlobalTerminalStore((s) => s.setIsOpen);
  const toggleTerminal = React.useCallback(() => {
    setIsTerminalOpen(!isTerminalOpen);
  }, [isTerminalOpen, setIsTerminalOpen]);

  // ── AI chat toggle ──────────────────────────────────────────────────────
  const isChatboxOpen = useChatboxStore((s) => s.isOpen);
  const toggleChatbox = useChatboxStore((s) => s.toggle);

  // ── Theme toggle ────────────────────────────────────────────────────────
  const { theme, toggleTheme } = useTheme();

  // ── License ─────────────────────────────────────────────────────────────
  const licenseStatus = useLicenseStore((state) => state.status);
  const [licenseModalOpen, setLicenseModalOpen] = React.useState(false);

  // ── Updater ─────────────────────────────────────────────────────────────
  const {
    updateAvailable,
    updateVersion,
    downloading: updateDownloading,
    downloadProgress,
    downloadError,
    updateInstalled,
    installUpdate,
  } = useUpdater();
  const [updateConfirmReady, setUpdateConfirmReady] = React.useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = React.useState(false);

  // ── Drag state ──────────────────────────────────────────────────────────
  // Committed position (used for React render — updated on mouseup for snap)
  const [position, setPosition] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragging, setDragging] = React.useState(false);
  const dockRef = React.useRef<HTMLDivElement>(null);

  // Refs for drag-time state (avoid re-renders during mousemove)
  const dragPosRef = React.useRef({ x: 0, y: 0 });
  const dragStartRef = React.useRef<{
    mouseX: number; mouseY: number;
    posX: number; posY: number;
    dockW: number; dockH: number;
    hasMoved: boolean;
  } | null>(null);
  const rafIdRef = React.useRef(0);

  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const el = dockRef.current;
    if (!el) return;
    // Cache dimensions once at drag start
    const rect = el.getBoundingClientRect();
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: dragPosRef.current.x,
      posY: dragPosRef.current.y,
      dockW: rect.width,
      dockH: rect.height,
      hasMoved: false,
    };
    setDragging(true);
  }, []);

  React.useEffect(() => {
    if (!dragging) return;

    const applyTransform = () => {
      const el = dockRef.current;
      if (!el) return;
      const { x, y } = dragPosRef.current;
      el.style.transform = `translate(calc(-50% + ${x}px), ${y}px)`;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const ds = dragStartRef.current;
      if (!ds) return;
      const dx = e.clientX - ds.mouseX;
      const dy = e.clientY - ds.mouseY;
      if (!ds.hasMoved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
        ds.hasMoved = true;
      }

      let newX = ds.posX + dx;
      let newY = ds.posY + dy;

      // Boundary clamping using cached dimensions
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      const gap = 8;
      const maxLeft = winW / 2 - ds.dockW / 2 - gap;
      const maxRight = maxLeft;
      const maxUp = winH - ds.dockH - 16 - gap;
      const maxDown = 16 - gap;

      newX = Math.max(-maxLeft, Math.min(maxRight, newX));
      newY = Math.max(-maxUp, Math.min(maxDown, newY));

      dragPosRef.current = { x: newX, y: newY };

      // Throttle DOM writes to animation frames
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(applyTransform);
    };

    const handleMouseUp = () => {
      cancelAnimationFrame(rafIdRef.current);

      // Snap logic using cached dimensions
      const ds = dragStartRef.current;
      const { x: px, y: py } = dragPosRef.current;
      let snapX = px;
      let snapY = py;

      if (Math.abs(px) < SNAP_THRESHOLD && Math.abs(py) < SNAP_THRESHOLD) {
        snapX = 0;
        snapY = 0;
      } else {
        if (Math.abs(py) < SNAP_THRESHOLD) snapY = 0;

        const winW = window.innerWidth;
        const winH = window.innerHeight;
        const dockW = ds?.dockW ?? 0;
        const dockH = ds?.dockH ?? 0;

        const leftEdgeX = -(winW / 2 - dockW / 2 - 8);
        if (Math.abs(px - leftEdgeX) < SNAP_THRESHOLD) snapX = leftEdgeX;

        const rightEdgeX = winW / 2 - dockW / 2 - 8;
        if (Math.abs(px - rightEdgeX) < SNAP_THRESHOLD) snapX = rightEdgeX;

        const topEdgeY = -(winH - dockH - 16 - 8);
        if (Math.abs(py - topEdgeY) < SNAP_THRESHOLD) snapY = topEdgeY;
      }

      // Commit to React state once (triggers CSS transition for snap animation)
      dragPosRef.current = { x: snapX, y: snapY };
      setPosition({ x: snapX, y: snapY });
      setDragging(false);
      dragStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      cancelAnimationFrame(rafIdRef.current);
    };
  }, [dragging]);

  // ── Install update ──────────────────────────────────────────────────────
  const handleInstallUpdate = React.useCallback(async () => {
    if (!updateConfirmReady) return;
    const targetVersion = updateVersion;
    const toastId = toast.loading(`Installing v${targetVersion}...`);
    const result = await installUpdate();
    if (result.ok) {
      toast.success(`Updated to v${targetVersion}`, {
        id: toastId,
        description: 'Restarting app to finish applying the update.',
      });
      window.setTimeout(() => { void relaunch(); }, 1500);
    } else {
      const err = result.error || downloadError || 'Update failed.';
      toast.error('Update failed', {
        id: toastId,
        description: (
          <div className="space-y-2">
            <p>{err.toLowerCase().includes('signature') ? 'Release signature mismatch.' : err}</p>
            <ManualUpdateCommand className="bg-background/70 p-2" message="Run this command manually to update." />
          </div>
        ),
      });
    }
  }, [updateConfirmReady, updateVersion, installUpdate, downloadError]);

  // Delayed confirm for update dialog
  React.useEffect(() => {
    if (!updateDialogOpen || updateDownloading || updateInstalled) return;
    const t = window.setTimeout(() => setUpdateConfirmReady(true), 250);
    return () => window.clearTimeout(t);
  }, [updateDialogOpen, updateDownloading, updateInstalled]);

  const progressLabel = downloadProgress.percent !== null
    ? `${downloadProgress.percent}%`
    : downloadProgress.downloadedBytes > 0
      ? `Downloaded ${formatBytes(downloadProgress.downloadedBytes)}`
      : 'Preparing...';

  // ── GearSix window ─────────────────────────────────────────────────────
  const openSettings = React.useCallback(async () => {
    try {
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const existing = await WebviewWindow.getByLabel('settings');
      // Close and recreate: on macOS child windows can't be elevated above parent
      if (existing) {
        await existing.close();
      }
      new WebviewWindow('settings', {
        url: '/?window=settings',
        title: 'hexbuffer - GearSix',
        width: 700,
        height: 600,
        decorations: true,
        resizable: true,
      });
    } catch {
      window.open('/settings', '_blank');
    }
  }, []);

  return {
    // Terminal
    isTerminalOpen,
    toggleTerminal,
    // Chat
    isChatboxOpen,
    toggleChatbox,
    // Theme
    theme,
    toggleTheme,
    // License
    licenseStatus,
    licenseModalOpen,
    setLicenseModalOpen,
    // Updater
    updateAvailable,
    updateVersion,
    updateDownloading,
    downloadProgress,
    updateInstalled,
    updateDialogOpen,
    setUpdateDialogOpen,
    updateConfirmReady,
    progressLabel,
    handleInstallUpdate,
    // Drag
    dockRef,
    position,
    dragging,
    handleMouseDown,
    // GearSix
    openSettings,
  };
}

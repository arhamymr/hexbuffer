import * as React from 'react';

interface UpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  updateDownloading: boolean;
  progressLabel: string;
  updateVersion: string | null;
  updateConfirmReady: boolean;
  onInstall: () => void;
}

export function UpdateDialog({
  open,
  onOpenChange,
  updateDownloading,
  progressLabel,
  updateVersion,
  updateConfirmReady,
  onInstall,
}: UpdateDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg border bg-background p-6 shadow-lg">
        <h3 className="text-sm font-semibold">
          Update to v{updateVersion}
        </h3>
        <p className="mt-2 text-xs text-muted-foreground">
          {updateDownloading
            ? progressLabel
            : "A new version is ready to install."}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-50"
            disabled={!updateConfirmReady || updateDownloading}
            onClick={onInstall}
          >
            {updateDownloading ? "Installing..." : "Install & Restart"}
          </button>
        </div>
      </div>
    </div>
  );
}

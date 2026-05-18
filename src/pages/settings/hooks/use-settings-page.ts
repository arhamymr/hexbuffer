import * as React from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { toast } from 'sonner';
import { getCaCert, saveCaCert } from '@/pages/http-history/api';

export function useSettingsPage() {
  const [downloading, setDownloading] = React.useState(false);

  const handleDownloadCert = React.useCallback(async () => {
    try {
      setDownloading(true);

      const filePath = await save({
        title: 'Save CA Certificate',
        defaultPath: 'apprecon-ca.pem',
        filters: [
          {
            name: 'PEM Certificate',
            extensions: ['pem', 'crt', 'cer'],
          },
        ],
      });

      if (!filePath) {
        return;
      }

      const certPem = await getCaCert();
      await saveCaCert(filePath, certPem);
      toast.success(`Certificate saved to ${filePath}`);
    } catch (error) {
      console.error('Failed to download CA certificate:', error);
      toast.error(`Failed to save certificate: ${error}`);
    } finally {
      setDownloading(false);
    }
  }, []);

  return {
    downloading,
    handleDownloadCert,
  };
}

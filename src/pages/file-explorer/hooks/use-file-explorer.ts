import * as React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { writeFile, readFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import { openPath } from '@tauri-apps/plugin-opener';
import { appLocalDataDir, join } from '@tauri-apps/api/path';
import { toast } from 'sonner';
import { copyText } from '@/lib/clipboard';
import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { MULTIPART_THRESHOLD } from '../constants';
import { tauriRequestHandler } from '../lib/tauri-s3-transport';
import { uploadMultipart } from '../lib/s3-multipart-upload';
import type { R2Item, R2Credentials } from '../types';

export function useFileExplorer() {
  const [loading, setLoading] = React.useState(true);
  const [credentials, setCredentials] = React.useState<R2Credentials | null>(null);
  const [s3Client, setS3Client] = React.useState<S3Client | null>(null);
  const [buckets, setBuckets] = React.useState<string[]>([]);
  const [currentBucket, setCurrentBucket] = React.useState<string>('');
  const [currentPrefix, setCurrentPrefix] = React.useState<string>('');
  const [items, setItems] = React.useState<R2Item[]>([]);
  const [selectedItem, setSelectedItem] = React.useState<R2Item | null>(null);
  const [uploadProgress, setUploadProgress] = React.useState<{ fileName: string; progress: number } | null>(null);
  const [cacheStatus, setCacheStatus] = React.useState<Record<string, { isCached: boolean; localPath: string }>>({});
  const [creatingFolder, setCreatingFolder] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [deletingKey, setDeletingKey] = React.useState<string | null>(null);
  const [customBuckets, setCustomBuckets] = React.useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('r2_custom_buckets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleAddCustomBucket = React.useCallback((name: string) => {
    const clean = name.trim();
    if (!clean) return;
    setCustomBuckets((prev) => {
      const updated = Array.from(new Set([...prev, clean]));
      localStorage.setItem('r2_custom_buckets', JSON.stringify(updated));
      return updated;
    });
    setBuckets((prev) => Array.from(new Set([...prev, clean])));
    setCurrentBucket(clean);
  }, []);

  const handleRemoveBucket = React.useCallback((name: string) => {
    setCustomBuckets((prev) => {
      const updated = prev.filter((b) => b !== name);
      localStorage.setItem('r2_custom_buckets', JSON.stringify(updated));
      return updated;
    });
    setBuckets((prev) => prev.filter((b) => b !== name));
    setCurrentBucket((prev) => (prev === name ? '' : prev));
  }, []);

  // 1. Fetch credentials on mount
  const fetchCredentials = React.useCallback(async () => {
    try {
      setLoading(true);
      const settings = await invoke<R2Credentials | null>('get_r2_settings');
      if (settings && settings.accountId && settings.accessKeyId && settings.secretAccessKey) {
        setCredentials(settings);
        
        // Initialize client
        const endpoint = settings.customEndpointUrl?.trim() 
          ? settings.customEndpointUrl.trim() 
          : `https://${settings.accountId.trim()}.r2.cloudflarestorage.com`;
        
        const client = new S3Client({
          endpoint,
          region: 'auto',
          requestHandler: tauriRequestHandler,
          forcePathStyle: true,
          credentials: {
            accessKeyId: settings.accessKeyId.trim(),
            secretAccessKey: settings.secretAccessKey.trim(),
          },
        });
        setS3Client(client);
      } else {
        setCredentials(null);
        setS3Client(null);
      }
    } catch (err) {
      console.error('Failed to load R2 credentials:', err);
      toast.error(`Error loading storage settings: ${err}`);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchCredentials();
  }, [fetchCredentials]);

  // 2. Discover buckets once client is initialized
  const loadBuckets = React.useCallback(async () => {
    if (!s3Client) return;
    try {
      setLoading(true);
      const command = new ListBucketsCommand({});
      const res = await s3Client.send(command);
      const bucketNames = (res.Buckets ?? []).map((b) => b.Name ?? '').filter(Boolean);
      const merged = Array.from(new Set([...bucketNames, ...customBuckets]));
      setBuckets(merged);
      if (merged.length > 0 && !currentBucket) {
        setCurrentBucket(merged[0]);
      }
    } catch (err) {
      console.error('Failed to load R2 buckets:', err);
      setBuckets(customBuckets);
      if (customBuckets.length > 0 && !currentBucket) {
        setCurrentBucket(customBuckets[0]);
      }
      
      const errMsg = String(err);
      if (errMsg.includes('DOMParser') || errMsg.includes('XML') || errMsg.includes('deserialization') || errMsg.includes('404')) {
        toast.error('S3 endpoint returned an invalid response. If using a bucket-specific custom domain, clear Custom Endpoint in Settings and manually add bucket.');
      } else {
        toast.error(`Could not autodiscover R2 Buckets: ${err}. You can manually add a bucket name in the sidebar.`);
      }
    } finally {
      setLoading(false);
    }
  }, [s3Client, currentBucket, customBuckets]);

  React.useEffect(() => {
    if (s3Client) {
      void loadBuckets();
    }
  }, [s3Client, loadBuckets]);

  // 3. List objects under current prefix
  const listItems = React.useCallback(async () => {
    if (!s3Client || !currentBucket) return;
    try {
      setLoading(true);
      const command = new ListObjectsV2Command({
        Bucket: currentBucket,
        Prefix: currentPrefix,
        Delimiter: '/',
      });
      const res = await s3Client.send(command);

      const folders: R2Item[] = (res.CommonPrefixes ?? []).map((p) => {
        const fullPrefix = p.Prefix ?? '';
        const parts = fullPrefix.slice(0, -1).split('/');
        const name = parts[parts.length - 1] ?? '';
        return {
          type: 'folder',
          name,
          key: fullPrefix,
        };
      });

      const files: R2Item[] = (res.Contents ?? [])
        .map((c) => ({
          type: 'file' as const,
          name: c.Key?.split('/').pop() ?? '',
          key: c.Key ?? '',
          size: c.Size,
          lastModified: c.LastModified,
        }))
        .filter((file) => file.key !== currentPrefix && file.name !== '');

      setItems([...folders, ...files]);
      setSelectedItem(null);
    } catch (err) {
      console.error('Failed to list R2 items:', err);
      toast.error(`Error loading objects: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [s3Client, currentBucket, currentPrefix]);

  React.useEffect(() => {
    if (s3Client && currentBucket) {
      void listItems();
    }
  }, [s3Client, currentBucket, currentPrefix, listItems]);

  // 4. Update cache status for current items
  const updateCacheStatuses = React.useCallback(async () => {
    if (!currentBucket || items.length === 0) return;
    const statusMap: Record<string, { isCached: boolean; localPath: string }> = {};
    const localData = await appLocalDataDir();

    for (const item of items) {
      if (item.type === 'file') {
        const cachePath = await join(localData, 'r2_cache', currentBucket, item.key);
        const fileExists = await exists(cachePath);
        statusMap[item.key] = { isCached: fileExists, localPath: cachePath };
      }
    }
    setCacheStatus((prev) => ({ ...prev, ...statusMap }));
  }, [currentBucket, items]);

  React.useEffect(() => {
    void updateCacheStatuses();
  }, [updateCacheStatuses]);

  // 5. Navigation helper methods
  const navigateToFolder = (folderKey: string) => {
    setCurrentPrefix(folderKey);
  };

  const navigateUp = () => {
    if (!currentPrefix) return;
    const parts = currentPrefix.slice(0, -1).split('/');
    parts.pop();
    const newPrefix = parts.length > 0 ? parts.join('/') + '/' : '';
    setCurrentPrefix(newPrefix);
  };

  // 6. Copy Public URL
  const handleCopyPublicUrl = async (item: R2Item) => {
    if (!credentials) return;
    
    let publicUrl = '';
    if (credentials.customEndpointUrl) {
      publicUrl = `${credentials.customEndpointUrl.replace(/\/$/, '')}/${item.key}`;
    } else {
      publicUrl = `https://${credentials.accountId}.r2.cloudflarestorage.com/${currentBucket}/${item.key}`;
    }
    
    await copyText(publicUrl);
    toast.success('Public URL copied to clipboard');
  };

  // 7. Copy Presigned URL
  const handleCopyPresignedUrl = async (item: R2Item, expirationSeconds: number) => {
    if (!s3Client || !currentBucket) return;
    try {
      const command = new GetObjectCommand({
        Bucket: currentBucket,
        Key: item.key,
      });
      const url = await getSignedUrl(s3Client, command, { expiresIn: expirationSeconds });
      await copyText(url);
      toast.success(`Presigned URL (valid for ${expirationSeconds / 3600}h) copied to clipboard`);
    } catch (err) {
      console.error('Failed to generate presigned URL:', err);
      toast.error(`Failed to generate link: ${err}`);
    }
  };

  // 8. Create folder placeholder
  const handleCreateFolder = async (folderName: string) => {
    if (!s3Client || !currentBucket || !folderName.trim()) return;
    const cleanName = folderName.trim().replace(/\/$/, '');
    const folderKey = `${currentPrefix}${cleanName}/`;

    try {
      setCreatingFolder(true);
      const command = new PutObjectCommand({
        Bucket: currentBucket,
        Key: folderKey,
        Body: new Uint8Array(0),
      });
      await s3Client.send(command);
      toast.success(`Folder '${cleanName}' created successfully`);
      void listItems();
    } catch (err) {
      console.error('Failed to create folder:', err);
      toast.error(`Failed to create folder: ${err}`);
    } finally {
      setCreatingFolder(false);
    }
  };

  // 9. Delete item
  const handleDeleteItem = async (item: R2Item) => {
    if (!s3Client || !currentBucket) return;
    setDeletingKey(item.key);
    // ponytail: use toast.promise for clean loading, success, and error feedback without boilerplate
    const deletePromise = (async () => {
      const command = new DeleteObjectCommand({
        Bucket: currentBucket,
        Key: item.key,
      });
      await s3Client.send(command);
      await listItems();
    })();

    toast.promise(deletePromise, {
      loading: `Deleting ${item.type === 'folder' ? 'folder' : 'file'} '${item.name}'...`,
      success: `Deleted ${item.type === 'folder' ? 'folder' : 'file'} '${item.name}'`,
      error: (err) => `Delete failed: ${err}`,
    });

    try {
      await deletePromise;
    } catch (err) {
      console.error('Failed to delete item:', err);
    } finally {
      setDeletingKey(null);
    }
  };

  // 10. File Upload (Direct & Multipart)
  const handleUploadFile = async () => {
    if (!s3Client || !currentBucket) return;
    try {
      const filePath = await open({
        multiple: false,
        title: 'Select File to Upload',
      });

      if (!filePath) return;

      setLoading(true);
      const fileBytes = await readFile(filePath as string);
      const fileName = (filePath as string).split(/[/\\]/).pop() ?? 'uploaded-file';
      const key = `${currentPrefix}${fileName}`;

      const getMimeType = (name: string): string => {
        const ext = name.split('.').pop()?.toLowerCase();
        switch (ext) {
          case 'pdf': return 'application/pdf';
          case 'png': return 'image/png';
          case 'jpg':
          case 'jpeg': return 'image/jpeg';
          case 'gif': return 'image/gif';
          case 'webp': return 'image/webp';
          case 'svg': return 'image/svg+xml';
          case 'json': return 'application/json';
          case 'txt': return 'text/plain';
          case 'md': return 'text/markdown';
          case 'html': return 'text/html';
          case 'css': return 'text/css';
          case 'js': return 'application/javascript';
          case 'ts': return 'application/typescript';
          default: return 'application/octet-stream';
        }
      };

      const contentType = getMimeType(fileName);

      if (fileBytes.length <= MULTIPART_THRESHOLD) {
        setUploadProgress({ fileName, progress: 10 });
        const command = new PutObjectCommand({
          Bucket: currentBucket,
          Key: key,
          Body: fileBytes,
          ContentType: contentType,
        });
        await s3Client.send(command);
        setUploadProgress({ fileName, progress: 100 });
        toast.success(`Uploaded '${fileName}' successfully`);
      } else {
        setUploadProgress({ fileName, progress: 0 });
        await uploadMultipart({
          s3Client,
          bucket: currentBucket,
          key,
          fileBytes,
          contentType,
          onProgress: (p) => setUploadProgress({ fileName, progress: p }),
        });
        toast.success(`Multipart uploaded '${fileName}' successfully (${(fileBytes.length / 1024 / 1024).toFixed(2)} MB)`);
      }

      setUploadProgress(null);
      void listItems();
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error(`Upload failed: ${err}`);
      setUploadProgress(null);
    } finally {
      setLoading(false);
    }
  };

  // 11. File caching download and open streaming
  const handleOpenFile = async (item: R2Item) => {
    if (!s3Client || !currentBucket || item.type !== 'file') return;
    try {
      setLoading(true);
      const localData = await appLocalDataDir();
      const localPath = await join(localData, 'r2_cache', currentBucket, item.key);

      const fileExists = await exists(localPath);
      if (fileExists) {
        toast.info(`Opening '${item.name}' instantly from local cache`);
        await openPath(localPath);
        return;
      }

      toast.loading(`Streaming '${item.name}' from Cloudflare R2...`);
      const command = new GetObjectCommand({
        Bucket: currentBucket,
        Key: item.key,
      });
      const response = await s3Client.send(command);
      const bytes = await response.Body?.transformToByteArray();

      if (!bytes) {
        throw new Error('Empty file content received');
      }

      const lastSlash = localPath.lastIndexOf('/');
      if (lastSlash !== -1) {
        const parentDir = localPath.substring(0, lastSlash);
        if (!(await exists(parentDir))) {
          await mkdir(parentDir, { recursive: true });
        }
      }

      await writeFile(localPath, bytes);
      
      setCacheStatus((prev) => ({
        ...prev,
        [item.key]: { isCached: true, localPath },
      }));

      toast.dismiss();
      toast.success(`Cached & opening '${item.name}'`);
      await openPath(localPath);
    } catch (err) {
      toast.dismiss();
      console.error('Failed to stream / open file:', err);
      toast.error(`Failed to stream file: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = React.useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter((item) => item.name.toLowerCase().includes(query));
  }, [items, searchQuery]);

  return {
    loading,
    credentials,
    buckets,
    currentBucket,
    setCurrentBucket,
    currentPrefix,
    setCurrentPrefix,
    items: filteredItems,
    selectedItem,
    setSelectedItem,
    uploadProgress,
    cacheStatus,
    creatingFolder,
    searchQuery,
    setSearchQuery,
    navigateToFolder,
    navigateUp,
    handleCopyPublicUrl,
    handleCopyPresignedUrl,
    handleCreateFolder,
    handleDeleteItem,
    deletingKey,
    handleUploadFile,
    handleOpenFile,
    handleAddCustomBucket,
    handleRemoveBucket,
    refreshList: listItems,
  };
}

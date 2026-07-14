import * as React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { HttpResponse } from '@smithy/protocol-http';
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
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { MULTIPART_CHUNK_SIZE, MULTIPART_THRESHOLD } from '../constants';

const tauriRequestHandler = {
  handle: async (request: any) => {
    const queryParams = new URLSearchParams();
    if (request.query) {
      for (const [k, v] of Object.entries(request.query)) {
        if (v !== undefined && v !== null) {
          queryParams.set(k, String(v));
        }
      }
    }
    const queryString = queryParams.toString();
    const portString = request.port ? `:${request.port}` : '';
    const url = `${request.protocol}//${request.hostname}${portString}${request.path}${queryString ? `?${queryString}` : ''}`;

    let bodyData: Uint8Array | null = null;
    if (request.body) {
      if (request.body instanceof Uint8Array) {
        bodyData = request.body;
      } else if (typeof request.body === 'string') {
        bodyData = new TextEncoder().encode(request.body);
      } else if (request.body instanceof ArrayBuffer) {
        bodyData = new Uint8Array(request.body);
      } else if (ArrayBuffer.isView(request.body)) {
        bodyData = new Uint8Array(request.body.buffer, request.body.byteOffset, request.body.byteLength);
      }
    }

    const tauriResponse = await invoke<{
      status: number;
      headers: Record<string, string>;
      body: number[];
    }>('r2_http_request', {
      method: request.method,
      url,
      headers: request.headers,
      body: bodyData,
    });

    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(tauriResponse.headers)) {
      headers[k.toLowerCase()] = v;
    }

    return {
      response: new HttpResponse({
        statusCode: tauriResponse.status,
        headers,
        body: new Uint8Array(tauriResponse.body),
      }),
    };
  },
};

export interface R2Item {
  type: 'folder' | 'file';
  name: string;
  key: string;
  size?: number;
  lastModified?: Date;
}

export interface R2Credentials {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  customEndpointUrl?: string;
}

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
        toast.error('S3 endpoint returned an invalid response. If using a bucket-specific custom domain (e.g. dist.0xbuffer.com), please clear Custom Endpoint in Settings, save, and add your bucket name manually here.');
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
        // Extract the folder name
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
        // Filter out the current folder's placeholder object itself
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
    parts.pop(); // Remove current folder name
    const newPrefix = parts.length > 0 ? parts.join('/') + '/' : '';
    setCurrentPrefix(newPrefix);
  };

  // 6. Copy Public URL
  const handleCopyPublicUrl = async (item: R2Item) => {
    if (!credentials) return;
    
    // Cloudflare public URL formats
    let publicUrl = '';
    if (credentials.customEndpointUrl) {
      publicUrl = `${credentials.customEndpointUrl.replace(/\/$/, '')}/${item.key}`;
    } else {
      // Standard public URL: https://pub-<hash>.r2.dev or bucket sub-domain
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
    try {
      setLoading(true);
      const command = new DeleteObjectCommand({
        Bucket: currentBucket,
        Key: item.key,
      });
      await s3Client.send(command);
      toast.success(`Deleted ${item.type === 'folder' ? 'folder' : 'file'} '${item.name}'`);
      void listItems();
    } catch (err) {
      console.error('Failed to delete item:', err);
      toast.error(`Delete failed: ${err}`);
    } finally {
      setLoading(false);
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

      // Helper to detect mime-type
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

      if (fileBytes.length <= MULTIPART_THRESHOLD) {
        // Direct upload
        setUploadProgress({ fileName, progress: 10 });
        const command = new PutObjectCommand({
          Bucket: currentBucket,
          Key: key,
          Body: fileBytes,
          ContentType: getMimeType(fileName),
        });
        await s3Client.send(command);
        setUploadProgress({ fileName, progress: 100 });
        toast.success(`Uploaded '${fileName}' successfully`);
      } else {
        // Concurrent Multipart upload
        setUploadProgress({ fileName, progress: 0 });
        
        const initCommand = new CreateMultipartUploadCommand({
          Bucket: currentBucket,
          Key: key,
          ContentType: getMimeType(fileName),
        });
        const initRes = await s3Client.send(initCommand);
        const uploadId = initRes.UploadId;

        if (!uploadId) throw new Error('Multipart upload failed to initialize');

        const chunkSize = MULTIPART_CHUNK_SIZE;
        const totalSize = fileBytes.length;
        const numParts = Math.ceil(totalSize / chunkSize);
        const parts = [];

        for (let i = 0; i < numParts; i++) {
          const start = i * chunkSize;
          const end = Math.min(start + chunkSize, totalSize);
          const chunk = fileBytes.slice(start, end);
          parts.push({
            partNumber: i + 1,
            body: chunk,
          });
        }

        const uploadedParts: { ETag: string; PartNumber: number }[] = [];
        let completedParts = 0;

        // Process parts concurrently in pairs to be aggressive but prevent heap crash
        const batchSize = 3;
        for (let idx = 0; idx < parts.length; idx += batchSize) {
          const batch = parts.slice(idx, idx + batchSize);
          const promises = batch.map(async (part) => {
            const uploadPartCommand = new UploadPartCommand({
              Bucket: currentBucket,
              Key: key,
              UploadId: uploadId,
              PartNumber: part.partNumber,
              Body: part.body,
            });
            const res = await s3Client.send(uploadPartCommand);
            if (res.ETag) {
              uploadedParts.push({ ETag: res.ETag, PartNumber: part.partNumber });
            }
            completedParts++;
            setUploadProgress({
              fileName,
              progress: Math.round((completedParts / numParts) * 100),
            });
          });
          await Promise.all(promises);
        }

        // Complete multipart upload
        const completeCommand = new CompleteMultipartUploadCommand({
          Bucket: currentBucket,
          Key: key,
          UploadId: uploadId,
          MultipartUpload: {
            Parts: uploadedParts.sort((a, b) => a.PartNumber - b.PartNumber),
          },
        });
        await s3Client.send(completeCommand);
        toast.success(`Multipart uploaded '${fileName}' successfully (${(totalSize / 1024 / 1024).toFixed(2)} MB)`);
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

      // Check if cached
      const fileExists = await exists(localPath);
      if (fileExists) {
        toast.info(`Opening '${item.name}' instantly from local cache`);
        await openPath(localPath);
        return;
      }

      // Stream download via S3 API
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

      // Ensure folders exist
      const lastSlash = localPath.lastIndexOf('/');
      if (lastSlash !== -1) {
        const parentDir = localPath.substring(0, lastSlash);
        if (!(await exists(parentDir))) {
          await mkdir(parentDir, { recursive: true });
        }
      }

      // Save to local cache
      await writeFile(localPath, bytes);
      
      // Update cache map
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

  // Filtered items computed
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
    handleUploadFile,
    handleOpenFile,
    handleAddCustomBucket,
    handleRemoveBucket,
    refreshList: listItems,
  };
}

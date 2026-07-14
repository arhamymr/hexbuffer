export interface ExpirationOption {
  label: string;
  seconds: number;
}

export const PRESIGNED_URL_EXPIRATIONS: ExpirationOption[] = [
  { label: '1 Hour', seconds: 3600 },
  { label: '12 Hours', seconds: 43200 },
  { label: '1 Day', seconds: 86400 },
  { label: '7 Days', seconds: 604800 },
];

export const PREVIEWABLE_EXTENSIONS = {
  text: ['txt', 'json', 'xml', 'yaml', 'yml', 'md', 'html', 'css', 'js', 'ts', 'jsx', 'tsx', 'conf', 'ini', 'sh', 'csv'],
  image: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'],
  pdf: ['pdf'],
};

export const MULTIPART_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB minimum S3 chunk size
export const MULTIPART_THRESHOLD = 50 * 1024 * 1024; // 50MB

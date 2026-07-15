import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { MULTIPART_CHUNK_SIZE } from '../constants';

interface MultipartUploadParams {
  s3Client: S3Client;
  bucket: string;
  key: string;
  fileBytes: Uint8Array;
  contentType: string;
  onProgress: (progress: number) => void;
}

export async function uploadMultipart({
  s3Client,
  bucket,
  key,
  fileBytes,
  contentType,
  onProgress,
}: MultipartUploadParams): Promise<void> {
  const initCommand = new CreateMultipartUploadCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  const initRes = await s3Client.send(initCommand);
  const uploadId = initRes.UploadId;

  if (!uploadId) {
    throw new Error('Multipart upload failed to initialize');
  }

  const chunkSize = MULTIPART_CHUNK_SIZE;
  const totalSize = fileBytes.length;
  const numParts = Math.ceil(totalSize / chunkSize);
  const parts: { partNumber: number; body: Uint8Array }[] = [];

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

  // Process parts concurrently in batches of 3 to be fast but avoid heap memory issues
  const batchSize = 3;
  for (let idx = 0; idx < parts.length; idx += batchSize) {
    const batch = parts.slice(idx, idx + batchSize);
    const promises = batch.map(async (part) => {
      const uploadPartCommand = new UploadPartCommand({
        Bucket: bucket,
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
      onProgress(Math.round((completedParts / numParts) * 100));
    });
    await Promise.all(promises);
  }

  // Complete multipart upload
  const completeCommand = new CompleteMultipartUploadCommand({
    Bucket: bucket,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: uploadedParts.sort((a, b) => a.PartNumber - b.PartNumber),
    },
  });
  await s3Client.send(completeCommand);
}

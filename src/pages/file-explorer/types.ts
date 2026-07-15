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

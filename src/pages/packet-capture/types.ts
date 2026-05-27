export type CaptureStatus = 'idle' | 'capturing' | 'paused' | 'stopped';

export type PacketProtocol = 'HTTP' | 'TLS' | 'TCP' | 'UDP' | 'DNS' | 'ARP' | 'ICMP' | '802.11' | 'OTHER';

export type NetworkSecurityMode = 'open' | 'wpa-personal' | 'wpa-enterprise';

export interface NetworkCaptureConfig {
  interfaceId: string;
  monitorMode: boolean;
  promiscuousMode: boolean;
  channel: string;
  ssid: string;
  securityMode: NetworkSecurityMode;
  username: string;
  password: string;
  bssid: string;
  deviceIp: string;
}

export interface CaptureInterfaceOption {
  id: string;
  name?: string;
  label: string;
  address?: string | null;
  description: string;
  isWifi?: boolean;
  isLoopback?: boolean;
}

export interface PacketField {
  label: string;
  value: string;
  byteStart?: number;
  byteEnd?: number;
}

export interface PacketLayer {
  name: string;
  fields: PacketField[];
}

export interface HttpMessage {
  direction: 'request' | 'response';
  method?: string;
  url?: string;
  statusCode?: number;
  statusText?: string;
  host?: string;
  headers: Record<string, string>;
  cookies: Record<string, string>;
  queryParams: Record<string, string>;
  body: string;
  bodyPreviewType: 'json' | 'html' | 'xml' | 'text' | 'binary';
  contentType?: string;
  raw: string;
}

export interface Packet {
  id: string;
  number: number;
  timestamp: number;
  sourceIp: string;
  destinationIp: string;
  protocol: PacketProtocol;
  sourcePort?: number;
  destinationPort?: number;
  length: number;
  info: string;
  bytes: number[];
  layers: PacketLayer[];
  streamId?: string;
  tcpSeq?: number;
  tcpAck?: number;
  tcpFlags?: string[];
  tls?: {
    sni?: string;
    version?: string;
    certificate?: string;
  };
  http?: HttpMessage;
}

export interface TcpStream {
  id: string;
  label: string;
  packets: Packet[];
  protocol: PacketProtocol;
  source: string;
  destination: string;
  totalBytes: number;
  isIncomplete: boolean;
  reconstructedText: string;
}

export interface PacketFilters {
  query: string;
  protocol: 'all' | PacketProtocol;
  sourceIp: string;
  destinationIp: string;
  sourcePort: string;
  destinationPort: string;
  method: string;
  host: string;
  url: string;
  statusCode: string;
  contentType: string;
}

export type PacketSortKey = 'number' | 'timestamp' | 'sourceIp' | 'destinationIp' | 'protocol' | 'length' | 'info';

export interface PacketSort {
  key: PacketSortKey;
  direction: 'asc' | 'desc';
}

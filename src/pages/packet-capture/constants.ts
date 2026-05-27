import type { CaptureInterfaceOption, NetworkCaptureConfig, Packet, PacketFilters, PacketProtocol } from './types';

export const NETWORK_INTERFACES: CaptureInterfaceOption[] = [
  { id: 'en0', name: 'en0', label: 'Wi-Fi', address: '192.168.1.5', description: 'Wireless capture with optional SSID credentials', isWifi: true },
  { id: 'en1', name: 'en1', label: 'Ethernet', address: '10.0.0.22', description: 'Wired interface capture' },
  { id: 'lo0', name: 'lo0', label: 'Loopback', address: '127.0.0.1', description: 'Localhost and app-to-app traffic', isLoopback: true },
];

export const EMPTY_NETWORK_CONFIG: NetworkCaptureConfig = {
  interfaceId: 'en0',
  monitorMode: false,
  promiscuousMode: true,
  channel: 'auto',
  ssid: '',
  securityMode: 'wpa-personal',
  username: '',
  password: '',
  bssid: '',
  deviceIp: '',
};

export const PROTOCOLS: Array<'all' | PacketProtocol> = ['all', 'HTTP', 'TLS', 'TCP', 'UDP', 'DNS', 'ARP', 'ICMP', '802.11', 'OTHER'];

export const EMPTY_FILTERS: PacketFilters = {
  query: '',
  protocol: 'all',
  sourceIp: '',
  destinationIp: '',
  sourcePort: '',
  destinationPort: '',
  method: '',
  host: '',
  url: '',
  statusCode: '',
  contentType: '',
};

const toBytes = (value: string) => Array.from(new TextEncoder().encode(value));

export const SAMPLE_PACKETS: Packet[] = [
  {
    id: 'pkt-1',
    number: 1,
    timestamp: 0.0012,
    sourceIp: '192.168.1.5',
    destinationIp: '172.217.194.100',
    protocol: 'TLS',
    sourcePort: 51832,
    destinationPort: 443,
    length: 517,
    info: 'Client Hello, SNI www.google.com',
    bytes: toBytes('ETHII IPv4 TCP TLS ClientHello server_name=www.google.com'),
    streamId: '192.168.1.5:51832-172.217.194.100:443-TCP',
    tcpSeq: 1001,
    tcpAck: 0,
    tcpFlags: ['SYN', 'ACK'],
    tls: {
      sni: 'www.google.com',
      version: 'TLS 1.3',
      certificate: 'Google Trust Services WE1',
    },
    layers: [
      {
        name: 'Frame',
        fields: [
          { label: 'Arrival Time', value: '0.0012 seconds', byteStart: 0, byteEnd: 4 },
          { label: 'Frame Length', value: '517 bytes', byteStart: 4, byteEnd: 8 },
        ],
      },
      {
        name: 'Ethernet II',
        fields: [
          { label: 'Source MAC', value: 'a4:83:e7:11:22:33', byteStart: 0, byteEnd: 6 },
          { label: 'Destination MAC', value: 'f8:ab:05:44:55:66', byteStart: 6, byteEnd: 12 },
        ],
      },
      {
        name: 'IPv4',
        fields: [
          { label: 'Source Address', value: '192.168.1.5', byteStart: 26, byteEnd: 30 },
          { label: 'Destination Address', value: '172.217.194.100', byteStart: 30, byteEnd: 34 },
        ],
      },
      {
        name: 'TCP',
        fields: [
          { label: 'Source Port', value: '51832', byteStart: 34, byteEnd: 36 },
          { label: 'Destination Port', value: '443', byteStart: 36, byteEnd: 38 },
          { label: 'Sequence Number', value: '1001', byteStart: 38, byteEnd: 42 },
          { label: 'Flags', value: 'SYN, ACK', byteStart: 46, byteEnd: 48 },
        ],
      },
      {
        name: 'TLS',
        fields: [
          { label: 'Version', value: 'TLS 1.3', byteStart: 52, byteEnd: 58 },
          { label: 'Server Name Indication', value: 'www.google.com', byteStart: 59, byteEnd: 73 },
          { label: 'Certificate', value: 'Google Trust Services WE1' },
        ],
      },
    ],
  },
  {
    id: 'pkt-2',
    number: 2,
    timestamp: 0.0824,
    sourceIp: '192.168.1.5',
    destinationIp: '93.184.216.34',
    protocol: 'HTTP',
    sourcePort: 51844,
    destinationPort: 80,
    length: 428,
    info: 'GET /api/users?page=1 HTTP/1.1',
    bytes: toBytes('GET /api/users?page=1 HTTP/1.1\r\nHost: api.example.com\r\nCookie: sid=abc123; theme=dark\r\nAccept: application/json\r\n\r\n'),
    streamId: '192.168.1.5:51844-93.184.216.34:80-TCP',
    tcpSeq: 2400,
    tcpAck: 900,
    tcpFlags: ['PSH', 'ACK'],
    http: {
      direction: 'request',
      method: 'GET',
      url: '/api/users?page=1',
      host: 'api.example.com',
      headers: {
        Host: 'api.example.com',
        Cookie: 'sid=abc123; theme=dark',
        Accept: 'application/json',
      },
      cookies: {
        sid: 'abc123',
        theme: 'dark',
      },
      queryParams: {
        page: '1',
      },
      body: '',
      bodyPreviewType: 'text',
      contentType: 'application/json',
      raw: 'GET /api/users?page=1 HTTP/1.1\r\nHost: api.example.com\r\nCookie: sid=abc123; theme=dark\r\nAccept: application/json\r\n\r\n',
    },
    layers: [
      { name: 'Frame', fields: [{ label: 'Frame Length', value: '428 bytes', byteStart: 0, byteEnd: 4 }] },
      { name: 'Ethernet II', fields: [{ label: 'Type', value: 'IPv4', byteStart: 12, byteEnd: 14 }] },
      {
        name: 'IPv4',
        fields: [
          { label: 'Source Address', value: '192.168.1.5', byteStart: 26, byteEnd: 30 },
          { label: 'Destination Address', value: '93.184.216.34', byteStart: 30, byteEnd: 34 },
        ],
      },
      {
        name: 'TCP',
        fields: [
          { label: 'Source Port', value: '51844', byteStart: 34, byteEnd: 36 },
          { label: 'Destination Port', value: '80', byteStart: 36, byteEnd: 38 },
          { label: 'Flags', value: 'PSH, ACK', byteStart: 46, byteEnd: 48 },
        ],
      },
      {
        name: 'HTTP',
        fields: [
          { label: 'Method', value: 'GET', byteStart: 0, byteEnd: 3 },
          { label: 'Request URI', value: '/api/users?page=1', byteStart: 4, byteEnd: 21 },
          { label: 'Host', value: 'api.example.com', byteStart: 38, byteEnd: 53 },
        ],
      },
    ],
  },
  {
    id: 'pkt-3',
    number: 3,
    timestamp: 0.1317,
    sourceIp: '93.184.216.34',
    destinationIp: '192.168.1.5',
    protocol: 'HTTP',
    sourcePort: 80,
    destinationPort: 51844,
    length: 672,
    info: 'HTTP/1.1 200 OK, application/json',
    bytes: toBytes('HTTP/1.1 200 OK\r\nContent-Type: application/json; charset=utf-8\r\nSet-Cookie: trace=req-77\r\n\r\n{"users":[{"id":1,"name":"Ari"}]}'),
    streamId: '192.168.1.5:51844-93.184.216.34:80-TCP',
    tcpSeq: 900,
    tcpAck: 2519,
    tcpFlags: ['PSH', 'ACK'],
    http: {
      direction: 'response',
      statusCode: 200,
      statusText: 'OK',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Set-Cookie': 'trace=req-77',
      },
      cookies: {
        trace: 'req-77',
      },
      queryParams: {},
      body: '{"users":[{"id":1,"name":"Ari"}]}',
      bodyPreviewType: 'json',
      contentType: 'application/json; charset=utf-8',
      raw: 'HTTP/1.1 200 OK\r\nContent-Type: application/json; charset=utf-8\r\nSet-Cookie: trace=req-77\r\n\r\n{"users":[{"id":1,"name":"Ari"}]}',
    },
    layers: [
      { name: 'Frame', fields: [{ label: 'Frame Length', value: '672 bytes', byteStart: 0, byteEnd: 4 }] },
      {
        name: 'IPv4',
        fields: [
          { label: 'Source Address', value: '93.184.216.34', byteStart: 26, byteEnd: 30 },
          { label: 'Destination Address', value: '192.168.1.5', byteStart: 30, byteEnd: 34 },
        ],
      },
      {
        name: 'TCP',
        fields: [
          { label: 'Source Port', value: '80', byteStart: 34, byteEnd: 36 },
          { label: 'Destination Port', value: '51844', byteStart: 36, byteEnd: 38 },
          { label: 'Sequence Number', value: '900', byteStart: 38, byteEnd: 42 },
          { label: 'Acknowledgement Number', value: '2519', byteStart: 42, byteEnd: 46 },
          { label: 'Flags', value: 'PSH, ACK', byteStart: 46, byteEnd: 48 },
        ],
      },
      {
        name: 'HTTP',
        fields: [
          { label: 'Status Code', value: '200', byteStart: 9, byteEnd: 12 },
          { label: 'Content-Type', value: 'application/json; charset=utf-8', byteStart: 34, byteEnd: 65 },
          { label: 'Body', value: '{"users":[{"id":1,"name":"Ari"}]}', byteStart: 94, byteEnd: 127 },
        ],
      },
    ],
  },
  {
    id: 'pkt-4',
    number: 4,
    timestamp: 0.2241,
    sourceIp: '192.168.1.5',
    destinationIp: '1.1.1.1',
    protocol: 'DNS',
    sourcePort: 58012,
    destinationPort: 53,
    length: 86,
    info: 'Standard query A api.example.com',
    bytes: toBytes('DNS query A api.example.com'),
    layers: [
      { name: 'Frame', fields: [{ label: 'Frame Length', value: '86 bytes', byteStart: 0, byteEnd: 4 }] },
      { name: 'IPv4', fields: [{ label: 'Destination Address', value: '1.1.1.1', byteStart: 30, byteEnd: 34 }] },
      { name: 'UDP', fields: [{ label: 'Destination Port', value: '53', byteStart: 36, byteEnd: 38 }] },
      { name: 'DNS', fields: [{ label: 'Query Name', value: 'api.example.com', byteStart: 10, byteEnd: 25 }] },
    ],
  },
];

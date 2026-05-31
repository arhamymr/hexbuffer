import type { HttpMessage, Packet, PacketFilters, PacketSort, TcpStream } from '../types';

export function createStreamId(packet: Pick<Packet, 'sourceIp' | 'destinationIp' | 'sourcePort' | 'destinationPort'>) {
  const a = `${packet.sourceIp}:${packet.sourcePort ?? '*'}`;
  const b = `${packet.destinationIp}:${packet.destinationPort ?? '*'}`;
  return [a, b].sort().join('-');
}

export function formatHexRows(bytes: number[], selectedRange?: { start: number; end: number }) {
  const rows = [];

  for (let offset = 0; offset < bytes.length; offset += 16) {
    const chunk = bytes.slice(offset, offset + 16);
    rows.push({
      offset,
      offsetLabel: offset.toString(16).padStart(4, '0'),
      cells: chunk.map((byte, index) => {
        const absoluteIndex = offset + index;
        return {
          index: absoluteIndex,
          hex: byte.toString(16).padStart(2, '0').toUpperCase(),
          ascii: byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.',
          selected: selectedRange ? absoluteIndex >= selectedRange.start && absoluteIndex < selectedRange.end : false,
        };
      }),
    });
  }

  return rows;
}

export function bytesToAscii(bytes: number[]) {
  return bytes.map((byte) => (byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.')).join('');
}

export function bytesToHex(bytes: number[]) {
  return bytes.map((byte) => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ');
}

export function filterPackets(packets: Packet[], filters: PacketFilters) {
  const normalizedQuery = filters.query.trim().toLowerCase();

  return packets.filter((packet) => {
    const http = packet.http;
    const haystack = [
      packet.number,
      packet.timestamp,
      packet.sourceIp,
      packet.destinationIp,
      packet.protocol,
      packet.sourcePort,
      packet.destinationPort,
      packet.length,
      packet.info,
      http?.method,
      http?.host,
      http?.url,
      http?.statusCode,
      http?.contentType,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (normalizedQuery && !haystack.includes(normalizedQuery)) {
      return false;
    }

    return (
      (filters.protocol === 'all' || packet.protocol === filters.protocol) &&
      includesValue(packet.sourceIp, filters.sourceIp) &&
      includesValue(packet.destinationIp, filters.destinationIp) &&
      includesValue(String(packet.sourcePort ?? ''), filters.sourcePort) &&
      includesValue(String(packet.destinationPort ?? ''), filters.destinationPort) &&
      includesValue(http?.method ?? '', filters.method) &&
      includesValue(http?.host ?? '', filters.host) &&
      includesValue(http?.url ?? '', filters.url) &&
      includesValue(String(http?.statusCode ?? ''), filters.statusCode) &&
      includesValue(http?.contentType ?? '', filters.contentType)
    );
  });
}

export function sortPackets(packets: Packet[], sort: PacketSort) {
  return [...packets].sort((a, b) => {
    const direction = sort.direction === 'asc' ? 1 : -1;
    const left = a[sort.key];
    const right = b[sort.key];

    if (typeof left === 'number' && typeof right === 'number') {
      return (left - right) * direction;
    }

    return String(left).localeCompare(String(right)) * direction;
  });
}

export function buildTcpStreams(packets: Packet[]): TcpStream[] {
  const streams = new Map<string, Packet[]>();

  packets.forEach((packet) => {
    if (!packet.sourcePort || !packet.destinationPort) {
      return;
    }

    const streamId = packet.streamId ?? createStreamId(packet);
    streams.set(streamId, [...(streams.get(streamId) ?? []), packet]);
  });

  return Array.from(streams.entries()).map(([id, streamPackets]) => {
    const sortedPackets = [...streamPackets].sort((a, b) => a.timestamp - b.timestamp);
    const first = sortedPackets[0];
    const last = sortedPackets[sortedPackets.length - 1];
    const reconstructedText = sortedPackets
      .map((packet) => packet.http?.raw ?? bytesToAscii(packet.bytes))
      .join('\n\n');

    return {
      id,
      label: `${first.sourceIp}:${first.sourcePort} -> ${first.destinationIp}:${first.destinationPort}`,
      packets: sortedPackets,
      protocol: sortedPackets.some((packet) => packet.protocol === 'HTTP') ? 'HTTP' : first.protocol,
      source: `${first.sourceIp}:${first.sourcePort}`,
      destination: `${first.destinationIp}:${first.destinationPort}`,
      totalBytes: sortedPackets.reduce((total, packet) => total + packet.length, 0),
      isIncomplete: !last.tcpFlags?.includes('FIN') && !last.tcpFlags?.includes('RST'),
      reconstructedText,
    };
  });
}

export function exportPacketSession(packets: Packet[]) {
  const payload = {
    format: '0xbufferr.packet-session.v1',
    exportedAt: new Date().toISOString(),
    packets,
  };

  return JSON.stringify(payload, null, 2);
}

export function getBodyPreview(message: HttpMessage) {
  if (!message.body) {
    return 'No body in this message.';
  }

  if (message.bodyPreviewType === 'json') {
    try {
      return JSON.stringify(JSON.parse(message.body), null, 2);
    } catch {
      return message.body;
    }
  }

  return message.body;
}

function includesValue(value: string, filter: string) {
  return !filter.trim() || value.toLowerCase().includes(filter.trim().toLowerCase());
}

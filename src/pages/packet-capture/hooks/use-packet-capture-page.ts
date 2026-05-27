import * as React from 'react';
import { listen } from '@tauri-apps/api/event';
import { toast } from 'sonner';
import { EMPTY_FILTERS, EMPTY_NETWORK_CONFIG, NETWORK_INTERFACES, SAMPLE_PACKETS } from '../constants';
import {
  configureCaptureNetwork,
  listCaptureInterfaces,
  preparePacketCapturePermissions,
  startPacketCapture,
  stopPacketCapture,
  type CapturedPacketEvent,
  type PacketCaptureErrorEvent,
} from '../api';
import {
  buildTcpStreams,
  bytesToAscii,
  bytesToHex,
  exportPacketSession,
  filterPackets,
  sortPackets,
} from '../lib/packet-utils';
import type {
  CaptureStatus,
  CaptureInterfaceOption,
  NetworkCaptureConfig,
  Packet,
  PacketField,
  PacketFilters,
  PacketProtocol,
  PacketSort,
  PacketSortKey,
} from '../types';

export function usePacketCapturePage() {
  const [captureInterfaces, setCaptureInterfaces] = React.useState<CaptureInterfaceOption[]>(NETWORK_INTERFACES);
  const [isLoadingInterfaces, setIsLoadingInterfaces] = React.useState(false);
  const [selectedInterface, setSelectedInterface] = React.useState(NETWORK_INTERFACES[0].id);
  const [networkConfigured, setNetworkConfigured] = React.useState(false);
  const [networkConfig, setNetworkConfig] = React.useState<NetworkCaptureConfig>(EMPTY_NETWORK_CONFIG);
  const [captureStatus, setCaptureStatus] = React.useState<CaptureStatus>('idle');
  const [packets, setPackets] = React.useState<Packet[]>(SAMPLE_PACKETS);
  const [selectedPacketId, setSelectedPacketId] = React.useState(SAMPLE_PACKETS[1]?.id ?? SAMPLE_PACKETS[0]?.id ?? '');
  const [filters, setFilters] = React.useState<PacketFilters>(EMPTY_FILTERS);
  const [sort, setSort] = React.useState<PacketSort>({ key: 'number', direction: 'asc' });
  const [selectedField, setSelectedField] = React.useState<PacketField | null>(null);
  const [permissionError, setPermissionError] = React.useState<string | null>(null);
  const captureStartedAtRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    let mounted = true;

    setIsLoadingInterfaces(true);
    listCaptureInterfaces()
      .then((interfaces) => {
        if (!mounted || interfaces.length === 0) {
          return;
        }

        setCaptureInterfaces(interfaces);
        setSelectedInterface(interfaces[0].id);
        setNetworkConfig((current) => ({ ...current, interfaceId: interfaces[0].id }));
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Failed to load capture interfaces.');
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingInterfaces(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    const packetUnlisten = listen<CapturedPacketEvent>('packet-capture-event', (event) => {
      if (captureStartedAtRef.current === null) {
        captureStartedAtRef.current = event.payload.timestamp;
      }

      const packet = packetEventToPacket(event.payload, captureStartedAtRef.current);

      setPackets((current) => {
        if (current.some((item) => item.id === packet.id)) {
          return current;
        }

        return [...current, packet].slice(-5000);
      });
      setSelectedPacketId((current) => current || packet.id);
    });
    const errorUnlisten = listen<PacketCaptureErrorEvent>('packet-capture-error', (event) => {
      if (isCapturePermissionError(event.payload.message)) {
        setPermissionError(event.payload.message);
      }

      toast.error(event.payload.message);
      setCaptureStatus('stopped');
    });

    return () => {
      packetUnlisten.then((unlisten) => unlisten());
      errorUnlisten.then((unlisten) => unlisten());
    };
  }, []);

  const visiblePackets = React.useMemo(
    () => sortPackets(filterPackets(packets, filters), sort),
    [filters, packets, sort],
  );

  const selectedPacket = React.useMemo(
    () => packets.find((packet) => packet.id === selectedPacketId) ?? visiblePackets[0] ?? null,
    [packets, selectedPacketId, visiblePackets],
  );

  const tcpStreams = React.useMemo(() => buildTcpStreams(packets), [packets]);

  const selectedStream = React.useMemo(() => {
    if (!selectedPacket?.streamId) {
      return null;
    }

    return tcpStreams.find((stream) => stream.id === selectedPacket.streamId) ?? null;
  }, [selectedPacket, tcpStreams]);

  const selectedRange = React.useMemo(() => {
    if (selectedField?.byteStart === undefined || selectedField.byteEnd === undefined) {
      return undefined;
    }

    return { start: selectedField.byteStart, end: selectedField.byteEnd };
  }, [selectedField]);

  const startCapture = React.useCallback(async () => {
    if (!networkConfigured) {
      toast.error('Configure a network interface before starting capture.');
      return;
    }

    try {
      captureStartedAtRef.current = null;
      setPackets([]);
      setSelectedPacketId('');
      setSelectedField(null);
      setFilters(EMPTY_FILTERS);
      await startPacketCapture(networkConfig);
      setPermissionError(null);
      setCaptureStatus('capturing');
      toast.success(`Capture started on ${captureInterfaces.find((item) => item.id === selectedInterface)?.label ?? selectedInterface}.`);
    } catch (error) {
      setCaptureStatus('stopped');
      const message = toErrorMessage(error, 'Failed to start packet capture.');
      if (isCapturePermissionError(message)) {
        setPermissionError(message);
      }
      toast.error(message);
    }
  }, [captureInterfaces, networkConfig, networkConfigured, selectedInterface]);

  const fixCapturePermissions = React.useCallback(async () => {
    try {
      const message = await preparePacketCapturePermissions();
      setPermissionError(null);
      toast.success(message);
    } catch (error) {
      toast.error(toErrorMessage(error, 'Failed to update packet capture permissions.'));
    }
  }, []);

  const updateNetworkConfig = React.useCallback(<Key extends keyof NetworkCaptureConfig>(key: Key, value: NetworkCaptureConfig[Key]) => {
    setNetworkConfig((current) => ({ ...current, [key]: value }));
  }, []);

  const saveNetworkConfig = React.useCallback(async () => {
    const selected = captureInterfaces.find((item) => item.id === networkConfig.interfaceId);
    const isWifi = selected?.isWifi ?? selected?.label.toLowerCase().includes('wi-fi') ?? false;

    if (!selected) {
      toast.error('Choose a valid network interface.');
      return;
    }

    if (isWifi && !networkConfig.ssid.trim()) {
      toast.error('Enter the Wi-Fi SSID before continuing.');
      return;
    }

    if (
      isWifi &&
      networkConfig.securityMode !== 'open' &&
      !networkConfig.password.trim()
    ) {
      toast.error('Enter the Wi-Fi credential before continuing.');
      return;
    }

    try {
      const message = await configureCaptureNetwork(networkConfig);
      setSelectedInterface(networkConfig.interfaceId);
      setNetworkConfigured(true);
      toast.success(message || `${selected.label} configured for capture.`);
    } catch (error) {
      toast.error(toErrorMessage(error, 'Failed to configure network.'));
    }
  }, [captureInterfaces, networkConfig]);

  const editNetworkConfig = React.useCallback(async () => {
    if (captureStatus === 'capturing') {
      await stopPacketCapture().catch(() => undefined);
      setCaptureStatus('paused');
    }

    setNetworkConfigured(false);
  }, [captureStatus]);

  const pauseCapture = React.useCallback(async () => {
    try {
      await stopPacketCapture();
      setCaptureStatus('paused');
    } catch (error) {
      toast.error(toErrorMessage(error, 'Failed to pause capture.'));
    }
  }, []);

  const stopCapture = React.useCallback(async () => {
    try {
      await stopPacketCapture();
      setCaptureStatus('stopped');
    } catch (error) {
      toast.error(toErrorMessage(error, 'Failed to stop capture.'));
    }
  }, []);

  const clearCapture = React.useCallback(() => {
    setPackets([]);
    setSelectedPacketId('');
    setSelectedField(null);
    setCaptureStatus('idle');
  }, []);

  const loadSampleSession = React.useCallback(() => {
    setPackets(SAMPLE_PACKETS);
    setSelectedPacketId(SAMPLE_PACKETS[1]?.id ?? SAMPLE_PACKETS[0]?.id ?? '');
    setSelectedField(null);
    toast.success('Sample capture loaded.');
  }, []);

  const updateFilter = React.useCallback(<Key extends keyof PacketFilters>(key: Key, value: PacketFilters[Key]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  }, []);

  const resetFilters = React.useCallback(() => {
    setFilters(EMPTY_FILTERS);
  }, []);

  const setSortKey = React.useCallback((key: PacketSortKey) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const copyHex = React.useCallback(async () => {
    if (!selectedPacket) {
      return;
    }

    await navigator.clipboard.writeText(bytesToHex(selectedPacket.bytes));
    toast.success('Hex bytes copied.');
  }, [selectedPacket]);

  const copyAscii = React.useCallback(async () => {
    if (!selectedPacket) {
      return;
    }

    await navigator.clipboard.writeText(bytesToAscii(selectedPacket.bytes));
    toast.success('ASCII bytes copied.');
  }, [selectedPacket]);

  const exportRawBody = React.useCallback(() => {
    if (!selectedPacket) {
      return;
    }

    const body = selectedPacket.http?.body || bytesToAscii(selectedPacket.bytes);
    downloadTextFile(`packet-${selectedPacket.number}-raw.txt`, body);
  }, [selectedPacket]);

  const saveSession = React.useCallback(() => {
    downloadTextFile(`capture-session-${Date.now()}.json`, exportPacketSession(packets));
  }, [packets]);

  const importSession = React.useCallback(() => {
    toast.info('PCAP/PCAPNG import needs a native parser binding. JSON session import is the next backend step.');
  }, []);

  const exportPcap = React.useCallback(() => {
    toast.info('PCAP/PCAPNG export needs native packet serialization. Session JSON export is available now.');
  }, []);

  return {
    captureStatus,
    permissionError,
    fixCapturePermissions,
    captureInterfaces,
    isLoadingInterfaces,
    networkConfigured,
    networkConfig,
    updateNetworkConfig,
    saveNetworkConfig,
    editNetworkConfig,
    selectedInterface,
    setSelectedInterface,
    packets,
    visiblePackets,
    selectedPacket,
    selectedPacketId,
    setSelectedPacketId,
    selectedField,
    setSelectedField,
    selectedRange,
    filters,
    updateFilter,
    resetFilters,
    sort,
    setSortKey,
    tcpStreams,
    selectedStream,
    startCapture,
    pauseCapture,
    stopCapture,
    clearCapture,
    loadSampleSession,
    copyHex,
    copyAscii,
    exportRawBody,
    saveSession,
    importSession,
    exportPcap,
  };
}

function isCapturePermissionError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("don't have permission to capture") || normalized.includes('/dev/bpf') || normalized.includes('permission denied');
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (error && typeof error === 'object') {
    const maybeMessage = 'message' in error ? error.message : undefined;

    if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
      return maybeMessage;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return fallback;
    }
  }

  return fallback;
}

const textEncoder = new TextEncoder();

function packetEventToPacket(event: CapturedPacketEvent, captureStartedAt: number | null): Packet {
  const startedAt = captureStartedAt ?? event.timestamp;
  const protocol = normalizeProtocol(event.protocol);
  const bytes = Array.from(textEncoder.encode(event.rawLine));
  const relativeTime = Math.max(0, event.timestamp - startedAt);
  const sourcePort = event.sourcePort ?? undefined;
  const destinationPort = event.destinationPort ?? undefined;

  return {
    id: event.id,
    number: event.number,
    timestamp: relativeTime,
    sourceIp: event.sourceIp,
    destinationIp: event.destinationIp,
    protocol,
    sourcePort,
    destinationPort,
    length: event.length || bytes.length,
    info: event.info || event.rawLine,
    bytes,
    streamId: sourcePort && destinationPort
      ? [event.sourceIp, sourcePort, event.destinationIp, destinationPort, protocol].join(':')
      : undefined,
    layers: [
      {
        name: 'Frame',
        fields: [
          { label: 'Arrival Time', value: `${relativeTime.toFixed(6)} seconds`, byteStart: 0, byteEnd: 8 },
          { label: 'Captured Length', value: `${event.length || bytes.length} bytes`, byteStart: 8, byteEnd: 16 },
        ],
      },
      {
        name: event.rawLine.includes('IP6') ? 'IPv6' : 'IPv4',
        fields: [
          { label: 'Source Address', value: event.sourceIp },
          { label: 'Destination Address', value: event.destinationIp },
        ],
      },
      {
        name: protocol === 'TLS' ? 'TCP' : protocol,
        fields: [
          { label: 'Source Port', value: sourcePort ? String(sourcePort) : '-' },
          { label: 'Destination Port', value: destinationPort ? String(destinationPort) : '-' },
          { label: 'Summary', value: event.info || event.rawLine },
        ],
      },
    ],
    tls: protocol === 'TLS' ? { version: 'TLS metadata', sni: 'Encrypted or unavailable' } : undefined,
  };
}

function normalizeProtocol(protocol: string): PacketProtocol {
  if (
    protocol === 'HTTP' ||
    protocol === 'TLS' ||
    protocol === 'TCP' ||
    protocol === 'UDP' ||
    protocol === 'DNS' ||
    protocol === 'ARP' ||
    protocol === 'ICMP' ||
    protocol === '802.11' ||
    protocol === 'OTHER'
  ) {
    return protocol;
  }

  return 'OTHER';
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

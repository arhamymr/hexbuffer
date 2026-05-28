import { invoke } from '@tauri-apps/api/core';
import type { NetworkCaptureConfig } from './types';

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export interface CaptureInterface {
  id: string;
  name: string;
  label: string;
  address?: string | null;
  description: string;
  isWifi: boolean;
  isLoopback: boolean;
}

export interface CapturedPacketEvent {
  id: string;
  number: number;
  timestamp: number;
  sourceIp: string;
  destinationIp: string;
  protocol: string;
  sourcePort?: number | null;
  destinationPort?: number | null;
  length: number;
  info: string;
  rawLine: string;
}

export interface PacketCaptureStatus {
  running: boolean;
  interfaceId?: string | null;
  captureId?: string | null;
}

export interface PacketCaptureErrorEvent {
  message: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
}

export interface PacketSummary {
  id: string;
  packetNumber: number;
  timestamp: number;
  sourceIp: string;
  destinationIp: string;
  protocol: string;
  sourcePort?: number | null;
  destinationPort?: number | null;
  packetLength: number;
  info: string;
}

function assertTauri() {
  if (typeof window !== 'undefined' && !window.__TAURI_INTERNALS__) {
    throw new Error('Packet capture requires the Tauri desktop app. Start with `pnpm tauri`.');
  }
}

export async function listCaptureInterfaces() {
  assertTauri();
  return invoke<CaptureInterface[]>('list_capture_interfaces');
}

export async function configureCaptureNetwork(config: NetworkCaptureConfig) {
  assertTauri();
  return invoke<string>('configure_capture_network', { config });
}

export async function startPacketCapture(config: NetworkCaptureConfig) {
  assertTauri();
  return invoke<PacketCaptureStatus>('start_packet_capture', { config });
}

export async function stopPacketCapture() {
  assertTauri();
  return invoke<PacketCaptureStatus>('stop_packet_capture');
}

export async function preparePacketCapturePermissions() {
  assertTauri();
  return invoke<string>('prepare_packet_capture_permissions');
}

export async function getPacketsPaginated(
  captureId: string,
  page: number,
  perPage: number,
): Promise<PaginatedResponse<PacketSummary>> {
  assertTauri();
  return invoke<PaginatedResponse<PacketSummary>>('get_packets_paginated', {
    captureId,
    page,
    perPage,
  });
}

import { invoke } from '@tauri-apps/api/core';
import { HttpResponse } from '@smithy/protocol-http';

export const tauriRequestHandler = {
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

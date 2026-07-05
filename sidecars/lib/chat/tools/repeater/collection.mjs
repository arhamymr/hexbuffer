import { z } from 'zod';

export const createCollectionDef = {
  description: 'Create a top-level collection (stash) inside a specific Repeater workspace to hold API folders and requests.',
  inputSchema: z.object({
    workspaceId: z.string().describe('The ID of the Repeater workspace to create the collection under.'),
    name: z.string().describe('The name of the new collection.'),
  }),
  execute: async ({ workspaceId, name }, ctx) => {
    ctx.emitAction({
      action: 'create_collection',
      payload: { workspaceId, name },
    });
    return { success: true, message: `Collection "${name}" creation triggered.` };
  },
};

export const createFolderDef = {
  description: 'Create a folder (sub-collection) under an existing parent collection or folder to organize requests hierarchically.',
  inputSchema: z.object({
    parentId: z.string().describe('The ID of the parent collection or folder.'),
    name: z.string().describe('The name of the folder.'),
  }),
  execute: async ({ parentId, name }, ctx) => {
    ctx.emitAction({
      action: 'create_folder',
      payload: { parentId, name },
    });
    return { success: true, message: `Folder "${name}" creation triggered.` };
  },
};

export const createEndpointDef = {
  description: 'Create a new API request/endpoint inside a collection or folder. Populates it with custom HTTP method, URL, headers, and request body.',
  inputSchema: z.object({
    collectionId: z.string().describe('The ID of the collection or folder to place the endpoint in.'),
    name: z.string().describe('The name/label describing the API request (e.g. login, get-users).'),
    method: z.string().optional().describe('HTTP method (e.g. GET, POST, PUT, DELETE, PATCH). Defaults to GET.'),
    url: z.string().optional().describe('The request URL.'),
    headers: z.record(z.string()).optional().describe('Key-value pairs of HTTP request headers.'),
    body: z.string().optional().describe('Request body string content.'),
  }),
  execute: async ({ collectionId, name, method, url, headers, body }, ctx) => {
    ctx.emitAction({
      action: 'create_endpoint',
      payload: { collectionId, name, method, url, headers, body },
    });
    return { success: true, message: `Endpoint "${name}" creation triggered.` };
  },
};

export const selectEndpointDef = {
  description: 'Select an API request endpoint to view and edit its details in the main Repeater Forge panel.',
  inputSchema: z.object({
    endpointId: z.string().describe('The ID of the endpoint request to select.'),
  }),
  execute: async ({ endpointId }, ctx) => {
    ctx.emitAction({
      action: 'select_endpoint',
      payload: { endpointId },
    });
    return { success: true, message: `Endpoint selection triggered.` };
  },
};

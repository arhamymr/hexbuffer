import type { AutomationEdge, AutomationNodeData, AutomationNodeType } from '../types';
import type {
  AutomationNodeCapability,
  NodeDataSchema,
  NodeProfile,
} from './node-capability-types';
import { NODE_PROFILE_MAP } from './node-profile-map';
export type {
  AutomationNodeCapability,
  DataSchemaField,
  NodeDataSchema,
  NodeProfile,
} from './node-capability-types';

// ═══════════════════════════════════════════════════════════════════════════════
// Node Capability Catalog — the single file to map, inspect, and upgrade all
// automation node types. Add new nodes, flip capability flags, or update I/O
// schemas here to instantly propagate changes across every node component.
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════════

/** Get the full profile for any node type. */
export function getNodeProfile(nodeType: AutomationNodeType): NodeProfile {
  return NODE_PROFILE_MAP[nodeType];
}

/** Get all profiles. Useful for bulk operations like mapping over all nodes. */
export function getAllNodeProfiles(): NodeProfile[] {
  return Object.values(NODE_PROFILE_MAP);
}

/** Check whether a node is wired (backwards-compatible). */
export function getAutomationNodeCapability(
  nodeData: AutomationNodeData
): AutomationNodeCapability {
  const profile = getNodeProfile(nodeData.nodeType);
  if (!profile) {
    return { supported: false, reason: 'Unknown node type.' };
  }
  return { supported: profile.wired, reason: profile.reason };
}

/**
 * Delete all wires (edges) connected to a specific node.
 * Call this from any node's delete handler to clean up its connections.
 */
export function deleteConnectedWires(
  nodeId: string,
  edges: AutomationEdge[]
): AutomationEdge[] {
  return edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);
}

/**
 * Delete wires connected to multiple nodes at once.
 */
export function deleteConnectedWiresForNodes(
  nodeIds: string[],
  edges: AutomationEdge[]
): AutomationEdge[] {
  const idSet = new Set(nodeIds);
  return edges.filter((edge) => !idSet.has(edge.source) && !idSet.has(edge.target));
}

/** Get the source handle IDs for a node (e.g. ["true", "false"] for conditions). */
export function getNodeSourceHandles(nodeType: AutomationNodeType): string[] {
  return getNodeProfile(nodeType)?.sourceHandleIds ?? [];
}

/** Check if a node type is a condition (has true/false branches). */
export function isConditionNode(nodeType: AutomationNodeType): boolean {
  const profile = getNodeProfile(nodeType);
  return profile?.category === 'condition';
}

/** Get all wired (fully implemented) node types. */
export function getWiredNodeTypes(): AutomationNodeType[] {
  return getAllNodeProfiles()
    .filter((p) => p.wired)
    .map((p) => p.type);
}

/** Get all node types that are not yet wired. */
export function getUnwiredNodeTypes(): AutomationNodeType[] {
  return getAllNodeProfiles()
    .filter((p) => !p.wired)
    .map((p) => p.type);
}

/** Get the data schema for a node type. */
export function getNodeDataSchema(nodeType: AutomationNodeType): NodeDataSchema | null {
  return getNodeProfile(nodeType)?.dataSchema ?? null;
}

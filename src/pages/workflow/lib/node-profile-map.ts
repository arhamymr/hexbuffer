import type { AutomationNodeType } from '../types';
import type { NodeProfile } from './node-capability-types';
import { ACTION_NODE_PROFILES } from './action-node-profiles';
import { CONDITION_NODE_PROFILES } from './condition-node-profiles';
import { TRIGGER_NODE_PROFILES } from './trigger-node-profiles';

export const NODE_PROFILE_MAP: Record<AutomationNodeType, NodeProfile> = {
  ...TRIGGER_NODE_PROFILES,
  ...CONDITION_NODE_PROFILES,
  ...ACTION_NODE_PROFILES,
} as Record<AutomationNodeType, NodeProfile>;

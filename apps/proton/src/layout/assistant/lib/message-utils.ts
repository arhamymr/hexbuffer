import type { DashboardChatMessage } from '../types';

export function getMessageText(message: DashboardChatMessage) {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n');
}

export function getReasoningParts(message: DashboardChatMessage) {
  return message.parts.filter((part) => part.type === 'reasoning');
}

export function hasContent(message: DashboardChatMessage) {
  return getMessageText(message).length > 0 || getReasoningParts(message).length > 0;
}

export function providerLabel(message: DashboardChatMessage) {
  if (message.role !== 'assistant' || !message.metadata?.provider) {
    return null;
  }

  const provider = 'DeepSeek';
  return [provider, message.metadata.model].filter(Boolean).join(' ');
}

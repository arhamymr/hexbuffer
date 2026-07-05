import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { useClipboardStore } from '@/stores/clipboard';

export async function copyText(text: string): Promise<boolean> {
  // ponytail: record programmatic copies in the store
  useClipboardStore.getState().addClipboardItem(text);

  try {
    await writeText(text);
    return true;
  } catch (e) {
    console.warn('[clipboard] Tauri writeText failed, trying fallback:', e);
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  } catch (e) {
    console.error('[clipboard] execCommand fallback failed:', e);
    return false;
  }
}

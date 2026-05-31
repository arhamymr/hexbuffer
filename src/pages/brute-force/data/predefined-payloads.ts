export interface PredefinedPayload {
  id: string;
  category: string;
  name: string;
  description: string;
  values: string[];
}

const payloadFiles = import.meta.glob('../payload/**/*', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

function formatName(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function payloadFromFile([path, content]: [string, string]): PredefinedPayload {
  const relativePath = path.replace('../payload/', '');
  const parts = relativePath.split('/');
  const fileName = parts.at(-1) ?? relativePath;
  const category = parts.length > 1 ? parts[0] : 'General';
  const values = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    id: relativePath,
    category,
    name: formatName(fileName),
    description: `${relativePath} payload list bundled with the app.`,
    values,
  };
}

export const PREDEFINED_PAYLOADS: PredefinedPayload[] = Object.entries(payloadFiles)
  .map(payloadFromFile)
  .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

export const PAYLOAD_CATEGORIES = Array.from(
  new Set(PREDEFINED_PAYLOADS.map((payload) => payload.category))
);

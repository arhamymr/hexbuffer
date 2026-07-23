export function formatHexDump(bytes: number[]): string {
  const hexDump: string[] = [];
  const lineLength = 16;

  for (let i = 0; i < bytes.length; i += lineLength) {
    const chunk = bytes.slice(i, i + lineLength);
    const address = i.toString(16).padStart(8, '0');

    const hexParts: string[] = [];
    for (let j = 0; j < lineLength; j++) {
      if (j < chunk.length) {
        hexParts.push(chunk[j].toString(16).padStart(2, '0'));
      } else {
        hexParts.push('  ');
      }
    }

    const hexStr = [
      hexParts.slice(0, 8).join(' '),
      hexParts.slice(8, 16).join(' ')
    ].join('  ');

    const asciiStr = chunk
      .map((byte) => (byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.'))
      .join('');

    hexDump.push(`${address}  ${hexStr}  |${asciiStr}|`);
  }

  return hexDump.join('\n');
}